from __future__ import annotations

from pathlib import Path
from typing import Callable, Iterable, Any
import numpy as np

from .models import NoteEvent
from .harmony import KeyEstimate, fold_register, nearest_scale_pitch
from .util import clamp

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
    """Decode Basic Pitch without passing frequency bounds into v0.4.0.

    Basic Pitch 0.4.0 converts minimum_frequency to a note-matrix index relative to
    MIDI 21. Passing a lower bound such as MIDI 20 produces a negative slice and can
    zero nearly the whole note/onset matrix. We therefore decode the native model
    range and filter events explicitly afterward.
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
                "bass",
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
    return sorted(out, key=lambda x: (x.start, x.pitch, x.end)), diagnostics


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
    key: KeyEstimate,
    kick_times: list[float],
    bridge_ms: float = 150.0,
    ambiguous_amp: float = 0.55,
    lo: int = 24,
    hi: int = 48,
) -> list[NoteEvent]:
    xs = [NoteEvent(e.start, e.end, fold_register(e.pitch, lo, hi), e.velocity, e.confidence, e.label) for e in events]
    allowed = key.pitch_classes
    for e in xs:
        if e.confidence < ambiguous_amp and e.pitch % 12 not in allowed:
            e.pitch = nearest_scale_pitch(e.pitch, allowed, lo, hi)

    max_gap = bridge_ms / 1000.0
    repaired: list[NoteEvent] = []
    for e in xs:
        if repaired:
            prev = repaired[-1]
            gap = e.start - prev.end
            near_kick = any(prev.end - 0.05 <= k <= e.start + 0.05 for k in kick_times)
            if 0 <= gap <= max_gap and abs(e.pitch - prev.pitch) <= 1 and (near_kick or gap <= 0.055):
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
    predict_fn: PredictFn | None = None,
) -> tuple[list[NoteEvent], list[NoteEvent], dict[str, Any]]:
    raw, diagnostics = _basic_pitch_events(
        bass_wav,
        bpm,
        onset_threshold,
        frame_threshold,
        min_note_ms,
        decode_min_midi,
        decode_max_midi,
        predict_fn=predict_fn,
    )
    clipped: list[NoteEvent] = []
    for e in raw:
        c = e.clipped(section_start, section_end)
        if c:
            clipped.append(c)
    kicks_rel = [k - section_start for k in kick_times_abs if section_start <= k < section_end]
    final = repair_and_constrain(clipped, key, kicks_rel, bridge_ms, ambiguous_amp)
    diagnostics.update({
        "section_clipped_event_count": int(len(clipped)),
        "post_repair_event_count": int(len(final)),
    })
    return final, clipped, diagnostics
