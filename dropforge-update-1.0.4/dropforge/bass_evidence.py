from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable
import html
import math

import numpy as np

from .models import NoteEvent
from .util import clamp


@dataclass
class PitchTrack:
    times: np.ndarray
    midi: np.ndarray
    confidence: np.ndarray
    source: str

    def support(self, start: float, end: float, pitch: int, tolerance: float) -> float:
        mask = (
            (self.times >= float(start))
            & (self.times <= float(end))
            & np.isfinite(self.midi)
            & np.isfinite(self.confidence)
            & (self.confidence > 0)
        )
        if not np.any(mask):
            return 0.0
        weights = self.confidence[mask]
        if float(np.sum(weights)) <= 0:
            return 0.0
        ok = np.abs(self.midi[mask] - float(pitch)) <= float(tolerance)
        return float(np.sum(weights * ok) / np.sum(weights))

    def weighted_median(self, start: float, end: float) -> float | None:
        mask = (
            (self.times >= float(start))
            & (self.times <= float(end))
            & np.isfinite(self.midi)
            & np.isfinite(self.confidence)
            & (self.confidence > 0)
        )
        if not np.any(mask):
            return None
        values = self.midi[mask]
        weights = self.confidence[mask]
        if float(np.sum(weights)) <= 0:
            return None
        order = np.argsort(values)
        values = values[order]
        weights = weights[order]
        cdf = np.cumsum(weights)
        idx = int(np.searchsorted(cdf, cdf[-1] * 0.5, side="left"))
        return float(values[min(idx, len(values) - 1)])

    def voiced_fraction(self, start: float, end: float, threshold: float = 0.3) -> float:
        window = (self.times >= float(start)) & (self.times <= float(end))
        n = int(np.sum(window))
        if n == 0:
            return 0.0
        good = window & np.isfinite(self.midi) & np.isfinite(self.confidence) & (self.confidence >= threshold)
        return float(np.sum(good) / n)

    def downsampled(self, every: int = 3) -> list[dict[str, float]]:
        step = max(1, int(every))
        rows: list[dict[str, float]] = []
        for i in range(0, len(self.times), step):
            if not np.isfinite(self.midi[i]):
                continue
            rows.append({
                "time": round(float(self.times[i]), 4),
                "midi": round(float(self.midi[i]), 4),
                "confidence": round(float(self.confidence[i]), 4),
            })
        return rows


@dataclass
class SpectralContext:
    freqs: np.ndarray
    times: np.ndarray
    db: np.ndarray

    @classmethod
    def from_audio(cls, path: Path, target_sr: int = 22050) -> "SpectralContext":
        import librosa

        y, sr = librosa.load(str(path), sr=target_sr, mono=True)
        if y.size == 0:
            return cls(np.array([], dtype=float), np.array([], dtype=float), np.zeros((0, 0), dtype=float))

        n_fft = 8192
        hop = 256
        stft = np.abs(librosa.stft(y, n_fft=n_fft, hop_length=hop, window="hann", center=True))
        db = librosa.amplitude_to_db(stft + 1e-10, ref=np.max)
        freqs = librosa.fft_frequencies(sr=target_sr, n_fft=n_fft)
        times = librosa.frames_to_time(np.arange(db.shape[1]), sr=target_sr, hop_length=hop)
        return cls(freqs.astype(float), times.astype(float), db.astype(float))

    def _event_spectrum(self, start: float, end: float) -> np.ndarray | None:
        if self.db.size == 0 or self.times.size == 0:
            return None
        a = float(start) + 0.025
        b = min(float(end) - 0.015, float(start) + 0.32)
        if b <= a:
            a, b = float(start), float(end)
        mask = (self.times >= a) & (self.times <= b)
        if not np.any(mask):
            idx = int(np.argmin(np.abs(self.times - (float(start) + float(end)) * 0.5)))
            return self.db[:, idx]
        return np.median(self.db[:, mask], axis=1)

    def prominence_db(self, spectrum: np.ndarray, freq_hz: float) -> float:
        if spectrum is None or spectrum.size == 0 or self.freqs.size == 0:
            return 0.0
        f = float(freq_hz)
        if not (self.freqs[0] <= f <= self.freqs[-1]):
            return 0.0
        idx = int(np.argmin(np.abs(self.freqs - f)))
        lo = max(0, idx - 5)
        hi = min(len(spectrum), idx + 6)
        local = spectrum[lo:hi]
        if local.size <= 2:
            return 0.0
        center_lo = max(0, idx - lo - 1)
        center_hi = min(local.size, idx - lo + 2)
        neighbors = np.concatenate([local[:center_lo], local[center_hi:]])
        baseline = float(np.median(neighbors)) if neighbors.size else float(np.median(local))
        return float(spectrum[idx] - baseline)

    def candidate_features(self, start: float, end: float, midi_pitch: int) -> dict[str, float]:
        spectrum = self._event_spectrum(start, end)
        if spectrum is None:
            return {
                "harmonic_support": 0.0,
                "subharmonic_penalty": 0.0,
                "even_only_penalty": 0.0,
            }

        f0 = 440.0 * 2.0 ** ((float(midi_pitch) - 69.0) / 12.0)
        prominences: list[tuple[int, float]] = []
        for harmonic in range(1, 7):
            f = f0 * harmonic
            if f >= min(1500.0, float(self.freqs[-1])):
                break
            prominences.append((harmonic, self.prominence_db(spectrum, f)))

        weighted = []
        odd = []
        even = []
        for harmonic, prom in prominences:
            positive = max(0.0, float(prom))
            weighted.append(positive / math.sqrt(harmonic))
            (odd if harmonic % 2 else even).append(positive)

        support_db = float(np.mean(weighted)) if weighted else 0.0
        odd_db = float(np.mean(odd)) if odd else 0.0
        even_db = float(np.mean(even)) if even else 0.0

        sub_prom = 0.0
        for divisor in (2.0, 4.0):
            sf = f0 / divisor
            if sf >= 24.0:
                sub_prom = max(sub_prom, self.prominence_db(spectrum, sf))

        harmonic_support = clamp(support_db / 12.0, 0.0, 1.0)
        subharmonic_penalty = clamp(max(0.0, sub_prom) / 12.0, 0.0, 1.0)
        even_only_penalty = clamp(max(0.0, even_db - odd_db) / 12.0, 0.0, 1.0)
        return {
            "harmonic_support": float(harmonic_support),
            "subharmonic_penalty": float(subharmonic_penalty),
            "even_only_penalty": float(even_only_penalty),
        }


def estimate_pyin_track(
    path: Path,
    *,
    fmin_hz: float = 27.5,
    fmax_hz: float = 300.0,
    target_sr: int = 22050,
    frame_length: int = 4096,
    hop_length: int = 256,
) -> tuple[PitchTrack, dict[str, Any]]:
    import librosa

    y, sr = librosa.load(str(path), sr=int(target_sr), mono=True)
    if y.size == 0:
        empty = PitchTrack(np.array([]), np.array([]), np.array([]), "pyin")
        return empty, {"backend": "librosa.pyin", "frames": 0, "voiced_fraction": 0.0}

    f0, voiced_flag, voiced_prob = librosa.pyin(
        y,
        sr=sr,
        fmin=float(fmin_hz),
        fmax=float(fmax_hz),
        frame_length=int(frame_length),
        hop_length=int(hop_length),
        center=True,
        fill_na=np.nan,
    )
    times = librosa.frames_to_time(np.arange(len(f0)), sr=sr, hop_length=int(hop_length))
    midi = librosa.hz_to_midi(f0)
    prob = np.asarray(voiced_prob, dtype=float)
    prob[~np.asarray(voiced_flag, dtype=bool)] *= 0.35

    track = PitchTrack(
        np.asarray(times, dtype=float),
        np.asarray(midi, dtype=float),
        prob,
        "pyin",
    )
    voiced = np.isfinite(track.midi) & (track.confidence >= 0.3)
    diag = {
        "backend": "librosa.pyin",
        "sample_rate": int(sr),
        "frame_length": int(frame_length),
        "hop_length": int(hop_length),
        "fmin_hz": float(fmin_hz),
        "fmax_hz": float(fmax_hz),
        "frames": int(len(track.times)),
        "voiced_fraction": round(float(np.mean(voiced)) if len(voiced) else 0.0, 4),
        "median_midi": (
            round(float(np.nanmedian(track.midi[voiced])), 3)
            if np.any(voiced) else None
        ),
    }
    return track, diag


def basic_pitch_contour_track(
    model_output: dict[str, Any],
    *,
    min_midi: int = 21,
    max_midi: int = 60,
) -> PitchTrack:
    contour = np.asarray(model_output.get("contour", []), dtype=float)
    if contour.ndim != 2 or contour.size == 0:
        return PitchTrack(np.array([]), np.array([]), np.array([]), "basic-pitch-contour")

    try:
        from basic_pitch.note_creation import model_frames_to_time
        times = np.asarray(model_frames_to_time(contour.shape[0]), dtype=float)
    except Exception:
        times = np.arange(contour.shape[0], dtype=float) * (256.0 / 22050.0)

    lo_bin = max(0, int(round((int(min_midi) - 21) * 3)))
    hi_bin = min(contour.shape[1], int(round((int(max_midi) - 21 + 1) * 3)))
    view = contour[:, lo_bin:hi_bin]
    if view.size == 0:
        return PitchTrack(np.array([]), np.array([]), np.array([]), "basic-pitch-contour")

    idx = np.argmax(view, axis=1)
    conf = np.max(view, axis=1)
    midi = 21.0 + (lo_bin + idx.astype(float)) / 3.0
    midi = np.where(conf >= 0.08, midi, np.nan)
    return PitchTrack(times, midi, conf, "basic-pitch-contour")


def _interval_overlap(a: NoteEvent, b: NoteEvent) -> float:
    inter = max(0.0, min(a.end, b.end) - max(a.start, b.start))
    shortest = min(max(1e-6, a.end - a.start), max(1e-6, b.end - b.start))
    return float(inter / shortest)


def _harmonic_related(a: int, b: int) -> bool:
    d = abs(int(a) - int(b))
    return any(abs(d - target) <= 1 for target in (0, 12, 19, 24))


def group_note_opportunities(
    notes: Iterable[NoteEvent],
    *,
    onset_tolerance_ms: float = 60.0,
    min_overlap: float = 0.12,
) -> list[list[NoteEvent]]:
    xs = sorted(notes, key=lambda n: (n.start, n.pitch, n.end))
    groups: list[list[NoteEvent]] = []
    tol = float(onset_tolerance_ms) / 1000.0

    for note in xs:
        placed = False
        for group in reversed(groups[-8:]):
            if note.start - max(n.start for n in group) > tol:
                continue
            if any(
                abs(note.start - member.start) <= tol
                and _harmonic_related(note.pitch, member.pitch)
                and _interval_overlap(note, member) >= float(min_overlap)
                for member in group
            ):
                group.append(note)
                placed = True
                break
        if not placed:
            groups.append([note])

    return [sorted(g, key=lambda n: (n.pitch, -n.confidence, n.start)) for g in groups]


def _candidate_pitches(
    group: list[NoteEvent],
    pyin: PitchTrack,
    decode_min: int,
    decode_max: int,
) -> list[int]:
    pitches = {int(n.pitch) for n in group}
    start = min(n.start for n in group)
    end = max(n.end for n in group)
    f0_mid = pyin.weighted_median(start + 0.02, min(end, start + 0.32))
    if f0_mid is not None:
        p = int(round(f0_mid))
        for candidate in (p - 12, p, p + 12):
            if decode_min <= candidate <= decode_max and any(
                _harmonic_related(candidate, existing) for existing in pitches
            ):
                pitches.add(candidate)
    return sorted(p for p in pitches if decode_min <= p <= decode_max)


def _score_candidate(
    pitch: int,
    group: list[NoteEvent],
    pyin: PitchTrack,
    contour: PitchTrack,
    spectral: SpectralContext,
    tolerance: float,
) -> dict[str, float]:
    start = min(n.start for n in group)
    end = max(n.end for n in group)
    bp_support = max((float(n.confidence) for n in group if int(n.pitch) == int(pitch)), default=0.0)

    f0_start = start + 0.03
    f0_end = min(end - 0.015, start + 0.32)
    if f0_end <= f0_start:
        f0_start, f0_end = start, end

    pyin_support = pyin.support(f0_start, f0_end, pitch, tolerance)
    contour_support = contour.support(f0_start, f0_end, pitch, tolerance)
    spectral_features = spectral.candidate_features(start, end, pitch)

    score = (
        1.50 * bp_support
        + 1.65 * pyin_support
        + 0.70 * contour_support
        + 1.05 * spectral_features["harmonic_support"]
        - 0.70 * spectral_features["subharmonic_penalty"]
        - 0.45 * spectral_features["even_only_penalty"]
    )
    return {
        "pitch": float(pitch),
        "score": float(score),
        "bp_support": float(bp_support),
        "pyin_support": float(pyin_support),
        "contour_support": float(contour_support),
        **spectral_features,
    }


def fuse_note_opportunities(
    raw_notes: list[NoteEvent],
    pyin: PitchTrack,
    contour: PitchTrack,
    spectral: SpectralContext,
    *,
    decode_min: int = 21,
    decode_max: int = 60,
    onset_tolerance_ms: float = 60.0,
    min_overlap: float = 0.12,
    pitch_tolerance_semitones: float = 0.65,
    decision_margin: float = 0.30,
) -> tuple[list[NoteEvent], list[dict[str, Any]]]:
    groups = group_note_opportunities(
        raw_notes,
        onset_tolerance_ms=onset_tolerance_ms,
        min_overlap=min_overlap,
    )
    fused: list[NoteEvent] = []
    evidence: list[dict[str, Any]] = []

    for index, group in enumerate(groups):
        if not group:
            continue
        strongest = max(group, key=lambda n: (n.confidence, n.velocity, -n.pitch))
        candidates = _candidate_pitches(group, pyin, decode_min, decode_max)
        scored = [
            _score_candidate(
                p,
                group,
                pyin,
                contour,
                spectral,
                pitch_tolerance_semitones,
            )
            for p in candidates
        ]
        scored.sort(key=lambda row: row["score"], reverse=True)

        chosen_pitch = int(strongest.pitch)
        decision_reason = "basic_pitch_default"
        margin = 0.0

        if scored:
            best = scored[0]
            runner_score = scored[1]["score"] if len(scored) > 1 else 0.0
            margin = float(best["score"] - runner_score)
            evidence_support = max(
                float(best["pyin_support"]),
                float(best["harmonic_support"]),
                float(best["contour_support"]),
            )
            best_pitch = int(best["pitch"])
            if (
                best_pitch == int(strongest.pitch)
                or (
                    margin >= float(decision_margin)
                    and evidence_support >= 0.28
                )
            ):
                chosen_pitch = best_pitch
                decision_reason = (
                    "evidence_agrees_with_basic_pitch"
                    if best_pitch == int(strongest.pitch)
                    else "evidence_octave_or_harmonic_resolution"
                )
            else:
                decision_reason = "ambiguous_keep_basic_pitch"

        chosen_member = max(
            (n for n in group if int(n.pitch) == chosen_pitch),
            key=lambda n: (n.confidence, n.velocity),
            default=strongest,
        )
        chosen_score = next((row for row in scored if int(row["pitch"]) == chosen_pitch), None)
        derived_conf = float(chosen_member.confidence)
        if chosen_score is not None:
            derived_conf = clamp(
                0.45 * chosen_member.confidence
                + 0.25 * chosen_score["pyin_support"]
                + 0.15 * chosen_score["contour_support"]
                + 0.15 * chosen_score["harmonic_support"],
                0.0,
                1.0,
            )

        fused.append(
            NoteEvent(
                chosen_member.start,
                chosen_member.end,
                int(chosen_pitch),
                int(chosen_member.velocity),
                float(derived_conf),
                "bass-evidence",
            )
        )

        start = min(n.start for n in group)
        end = max(n.end for n in group)
        f0_mid = pyin.weighted_median(start + 0.02, min(end, start + 0.32))
        evidence.append({
            "opportunity": int(index),
            "start": round(float(start), 4),
            "end": round(float(end), 4),
            "basic_pitch_pitches": sorted({int(n.pitch) for n in group}),
            "basic_pitch_strongest": int(strongest.pitch),
            "chosen_pitch": int(chosen_pitch),
            "changed_pitch": bool(int(chosen_pitch) != int(strongest.pitch)),
            "decision": decision_reason,
            "margin": round(float(margin), 4),
            "pyin_median_midi": round(float(f0_mid), 3) if f0_mid is not None else None,
            "pyin_voiced_fraction": round(float(pyin.voiced_fraction(start, end)), 4),
            "candidates": [
                {
                    key: (round(float(value), 4) if isinstance(value, (float, np.floating)) else value)
                    for key, value in row.items()
                }
                for row in scored
            ],
        })

    return sorted(fused, key=lambda n: (n.start, n.pitch, n.end)), evidence


def write_evidence_svg(
    out_path: Path,
    *,
    duration: float,
    raw_notes: list[NoteEvent],
    fused_notes: list[NoteEvent],
    pyin: PitchTrack,
    contour: PitchTrack,
    kicks: list[float],
    min_midi: int = 21,
    max_midi: int = 60,
) -> None:
    width = 1400
    height = 620
    left = 70
    right = 20
    top = 35
    bottom = 55
    plot_w = width - left - right
    plot_h = height - top - bottom
    dur = max(0.001, float(duration))
    span = max(1, int(max_midi) - int(min_midi))

    def x(t: float) -> float:
        return left + clamp(float(t) / dur, 0.0, 1.0) * plot_w

    def y(p: float) -> float:
        return top + (1.0 - clamp((float(p) - min_midi) / span, 0.0, 1.0)) * plot_h

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<rect width="100%" height="100%" fill="#0f1115"/>',
        '<style>text{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;fill:#d7dce2}.grid{stroke:#2b3139;stroke-width:1}.kick{stroke:#e4b04a;stroke-width:1;opacity:.55}.raw{fill:#69717d;opacity:.48}.fused{fill:#5fd19a;opacity:.88}.pyin{fill:none;stroke:#70a7ff;stroke-width:1.7;opacity:.9}.bpcont{fill:none;stroke:#d886ff;stroke-width:1;opacity:.55}</style>',
        '<text x="70" y="22" font-size="15">DropForge Bass Evidence — raw BP notes, fused notes, pYIN, BP contour, kicks</text>',
    ]

    for pitch in range(min_midi, max_midi + 1, 3):
        yy = y(pitch)
        parts.append(f'<line class="grid" x1="{left}" x2="{left+plot_w}" y1="{yy:.2f}" y2="{yy:.2f}"/>')
        parts.append(f'<text x="8" y="{yy+4:.2f}" font-size="11">MIDI {pitch}</text>')

    for k in kicks:
        xx = x(k)
        parts.append(f'<line class="kick" x1="{xx:.2f}" x2="{xx:.2f}" y1="{top}" y2="{top+plot_h}"/>')

    for note in raw_notes:
        if note.pitch < min_midi or note.pitch > max_midi:
            continue
        xx = x(note.start)
        ww = max(1.0, x(note.end) - xx)
        yy = y(note.pitch) - 4
        parts.append(f'<rect class="raw" x="{xx:.2f}" y="{yy:.2f}" width="{ww:.2f}" height="8" rx="2"/>')

    for note in fused_notes:
        if note.pitch < min_midi or note.pitch > max_midi:
            continue
        xx = x(note.start)
        ww = max(1.5, x(note.end) - xx)
        yy = y(note.pitch) - 5
        parts.append(f'<rect class="fused" x="{xx:.2f}" y="{yy:.2f}" width="{ww:.2f}" height="10" rx="3"/>')

    def path_for(track: PitchTrack, css: str, threshold: float) -> None:
        pts = []
        for t, p, c in zip(track.times, track.midi, track.confidence):
            if not np.isfinite(p) or not np.isfinite(c) or c < threshold:
                continue
            if p < min_midi - 1 or p > max_midi + 1:
                continue
            pts.append((x(float(t)), y(float(p))))
        if len(pts) < 2:
            return
        # Break giant jumps instead of drawing misleading octave diagonals.
        chunks: list[list[tuple[float, float]]] = [[]]
        last = None
        for pt in pts:
            if last is not None and abs(pt[1] - last[1]) > 55:
                chunks.append([])
            chunks[-1].append(pt)
            last = pt
        for chunk in chunks:
            if len(chunk) < 2:
                continue
            d = "M " + " L ".join(f"{px:.2f},{py:.2f}" for px, py in chunk)
            parts.append(f'<path class="{css}" d="{d}"/>')

    path_for(pyin, "pyin", 0.30)
    path_for(contour, "bpcont", 0.10)

    parts.append(f'<text x="{left}" y="{height-18}" font-size="11">0s</text>')
    parts.append(f'<text x="{left+plot_w-80}" y="{height-18}" font-size="11">{dur:.2f}s</text>')
    parts.append('</svg>')
    out_path.write_text("\n".join(parts), encoding="utf-8")


def evidence_payload(
    *,
    pyin: PitchTrack,
    pyin_diag: dict[str, Any],
    contour: PitchTrack,
    opportunities: list[dict[str, Any]],
) -> dict[str, Any]:
    changed = sum(1 for row in opportunities if row.get("changed_pitch"))
    ambiguous = sum(1 for row in opportunities if row.get("decision") == "ambiguous_keep_basic_pitch")
    return {
        "version": 1,
        "f0": pyin_diag,
        "basic_pitch_contour": {
            "frames": int(len(contour.times)),
            "active_fraction": round(
                float(np.mean(np.isfinite(contour.midi))) if len(contour.midi) else 0.0,
                4,
            ),
        },
        "summary": {
            "opportunities": int(len(opportunities)),
            "pitch_changes": int(changed),
            "ambiguous_kept": int(ambiguous),
        },
        "opportunities": opportunities,
        "tracks": {
            "pyin": pyin.downsampled(3),
            "basic_pitch_contour": contour.downsampled(4),
        },
    }
