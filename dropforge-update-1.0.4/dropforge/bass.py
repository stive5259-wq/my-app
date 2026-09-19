from __future__ import annotations

from pathlib import Path
from typing import Callable, Iterable, Any
import numpy as np

from .models import NoteEvent
from .harmony import KeyEstimate
from .util import clamp
from .bass_evidence import (
    PitchTrack,
    SpectralContext,
    basic_pitch_contour_track,
    estimate_pyin_track,
    evidence_payload,
    fuse_note_opportunities,
)

PredictFn = Callable[..., tuple[dict[str, Any], Any, list]]


def _activation_stats(model_output: dict[str, Any]) -> dict[str, float]:
    out: dict[str, float] = {}
    for key in ("note", "onset", "contour"):
        if key not in model_output:
            continue
        arr = np.asarray(model_output[key], dtype=float)
        if arr.size == 0:
            out[f"{key}_max"] = 0.0
            out[f"{key}_p99"] = 0.0
            continue
        finite = arr[np.isfinite(arr)]
        if finite.size == 0:
            out[f"{key}_max"] = 0.0
            out[f"{key}_p99"] = 0.0
            continue
        out[f"{key}_max"] = float(np.max(finite))
        out[f"{key}_p99"] = float(np.percentile(finite, 99))
    return out


def _basic_pitch_decode(
    path: Path,
    bpm: float,
    onset_threshold: float,
    frame_threshold: float,
    min_note_ms: float,
    decode_min_midi: int,
    decode_max_midi: int,
    *,
    predict_fn: PredictFn | None = None,
) -> tuple[list[NoteEvent], dict[str, Any], dict[str, Any]]:
    """Decode Basic Pitch natively, then filter event objects ourselves.

    Frequency bounds are deliberately not passed to Basic Pitch 0.4.0. The model's
    note matrix starts at MIDI 21; the previous below-range minimum triggered a
    negative slice and zeroed nearly the full note/onset matrices.
    """
    if predict_fn is None:
        from basic_pitch.inference import predict as predict_fn

    model_output, _, events = predict_fn(
        str(path),
        onset_threshold=onset_threshold,
        frame_threshold=frame_threshold,
        minimum_note_length=min_note_ms,
        midi_tempo=bpm,
    )

    out: list[NoteEvent] = []
    decoded = 0
    for event in events:
        if len(event) < 4:
            continue
        start, end, pitch, amplitude = event[:4]
        decoded += 1
        pitch = int(pitch)
        if not (int(decode_min_midi) <= pitch <= int(decode_max_midi)):
            continue
        amp = float(amplitude)
        out.append(
            NoteEvent(
                float(start),
                float(end),
                pitch,
                int(round(45 + 82 * clamp(amp, 0.0, 1.0))),
                amp,
                "bass-basic-pitch",
            )
        )

    diagnostics: dict[str, Any] = {
        "backend": "basic-pitch",
        "onset_threshold": float(onset_threshold),
        "frame_threshold": float(frame_threshold),
        "minimum_note_ms": float(min_note_ms),
        "decode_filter_midi": [int(decode_min_midi), int(decode_max_midi)],
        "decoded_event_count": int(decoded),
        "range_filtered_event_count": int(len(out)),
        "frequency_bounds_passed_to_basic_pitch": False,
    }
    diagnostics.update(_activation_stats(model_output))
    return sorted(out, key=lambda x: (x.start, x.pitch, x.end)), diagnostics, model_output


def _basic_pitch_events(
    path: Path,
    bpm: float,
    onset_threshold: float,
    frame_threshold: float,
    min_note_ms: float,
    decode_min_midi: int,
    decode_max_midi: int,
    *,
    predict_fn: PredictFn | None = None,
) -> tuple[list[NoteEvent], dict[str, Any]]:
    """Compatibility wrapper used by regression tests and the installer fixture."""
    notes, diagnostics, _ = _basic_pitch_decode(
        path,
        bpm,
        onset_threshold,
        frame_threshold,
        min_note_ms,
        decode_min_midi,
        decode_max_midi,
        predict_fn=predict_fn,
    )
    return notes, diagnostics


def is_suspicious_zero_bass(
    event_count: int,
    audio_stats: dict[str, Any],
    diagnostics: dict[str, Any],
    *,
    rms_dbfs_threshold: float = -42.0,
    contour_threshold: float = 0.20,
) -> bool:
    return (
        int(event_count) == 0
        and float(audio_stats.get("rms_dbfs", -120.0)) >= float(rms_dbfs_threshold)
        and float(diagnostics.get("contour_max", 0.0)) >= float(contour_threshold)
    )


def repair_and_constrain(
    events: Iterable[NoteEvent],
    key: KeyEstimate | None,
    kick_times: list[float],
    bridge_ms: float = 150.0,
    ambiguous_amp: float = 0.55,
    lo: int = 24,
    hi: int = 48,
) -> list[NoteEvent]:
    """Continuity-only repair.

    1.0.4 intentionally removes two previous destructive assumptions:
    - no forced C1-C3 octave folding;
    - no automatic scale/key snapping.

    Absolute register and confident chromatic notes now survive. The existing short
    same-pitch gap bridge remains unchanged for this pass so octave/F0 changes can be
    evaluated independently.
    """
    del key, ambiguous_amp, lo, hi
    xs = [
        NoteEvent(e.start, e.end, int(e.pitch), e.velocity, e.confidence, e.label)
        for e in sorted(events, key=lambda n: (n.start, n.pitch, n.end))
    ]

    max_gap = float(bridge_ms) / 1000.0
    repaired: list[NoteEvent] = []
    for e in xs:
        if repaired:
            prev = repaired[-1]
            gap = e.start - prev.end
            near_kick = any(prev.end - 0.05 <= k <= e.start + 0.05 for k in kick_times)
            if (
                0 <= gap <= max_gap
                and int(e.pitch) == int(prev.pitch)
                and (near_kick or gap <= 0.055)
            ):
                prev.end = max(prev.end, e.end)
                prev.velocity = max(prev.velocity, e.velocity)
                prev.confidence = max(prev.confidence, e.confidence)
                continue
        repaired.append(e)
    return repaired


def transcribe_bass(
    bass_wav: Path,
    bpm: float,
    section_start: float,
    section_end: float,
    key: KeyEstimate,
    kick_times_abs: list[float],
    onset_threshold: float,
    frame_threshold: float,
    min_note_ms: float,
    bridge_ms: float,
    ambiguous_amp: float,
    decode_min_midi: int = 21,
    decode_max_midi: int = 60,
    *,
    f0_min_hz: float = 27.5,
    f0_max_hz: float = 300.0,
    f0_target_sr: int = 22050,
    f0_frame_length: int = 4096,
    f0_hop_length: int = 256,
    f0_pitch_tolerance_semitones: float = 0.65,
    opportunity_onset_tolerance_ms: float = 60.0,
    opportunity_min_overlap: float = 0.12,
    octave_decision_margin: float = 0.30,
    predict_fn: PredictFn | None = None,
) -> tuple[
    list[NoteEvent],
    list[NoteEvent],
    dict[str, Any],
    dict[str, Any],
    PitchTrack,
    PitchTrack,
]:
    raw, diagnostics, model_output = _basic_pitch_decode(
        bass_wav,
        bpm,
        onset_threshold,
        frame_threshold,
        min_note_ms,
        decode_min_midi,
        decode_max_midi,
        predict_fn=predict_fn,
    )

    clipped_raw: list[NoteEvent] = []
    for e in raw:
        c = e.clipped(section_start, section_end)
        if c:
            clipped_raw.append(c)

    pyin, pyin_diag = estimate_pyin_track(
        bass_wav,
        fmin_hz=f0_min_hz,
        fmax_hz=f0_max_hz,
        target_sr=f0_target_sr,
        frame_length=f0_frame_length,
        hop_length=f0_hop_length,
    )
    contour = basic_pitch_contour_track(
        model_output,
        min_midi=decode_min_midi,
        max_midi=decode_max_midi,
    )
    spectral = SpectralContext.from_audio(bass_wav, target_sr=f0_target_sr)

    fused, opportunities = fuse_note_opportunities(
        clipped_raw,
        pyin,
        contour,
        spectral,
        decode_min=decode_min_midi,
        decode_max=decode_max_midi,
        onset_tolerance_ms=opportunity_onset_tolerance_ms,
        min_overlap=opportunity_min_overlap,
        pitch_tolerance_semitones=f0_pitch_tolerance_semitones,
        decision_margin=octave_decision_margin,
    )

    kicks_rel = [
        k - section_start
        for k in kick_times_abs
        if section_start <= k < section_end
    ]
    final = repair_and_constrain(
        fused,
        key,
        kicks_rel,
        bridge_ms,
        ambiguous_amp,
    )

    ev_payload = evidence_payload(
        pyin=pyin,
        pyin_diag=pyin_diag,
        contour=contour,
        opportunities=opportunities,
    )
    diagnostics.update({
        "section_clipped_raw_event_count": int(len(clipped_raw)),
        "evidence_fused_event_count": int(len(fused)),
        "post_repair_event_count": int(len(final)),
        "register_policy": "preserve_absolute_midi",
        "key_snap_enabled": False,
        "forced_c1_c3_fold_enabled": False,
        "pitch_changes_from_evidence": int(ev_payload["summary"]["pitch_changes"]),
        "ambiguous_pitch_decisions_kept": int(ev_payload["summary"]["ambiguous_kept"]),
        "pyin": pyin_diag,
    })
    return final, clipped_raw, diagnostics, ev_payload, pyin, contour
