from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from .models import NoteEvent

PPQ = 960


def seconds_to_ticks(seconds: float, bpm: float, ppq: int = PPQ) -> int:
    return int(round(max(0.0, float(seconds)) * float(bpm) / 60.0 * ppq))


def normalize_same_pitch_overlaps(notes: list[NoteEvent]) -> list[NoteEvent]:
    """Merge overlapping same-pitch notes before writing conventional MIDI.

    Stacked note_on events for the same channel/pitch are legal-ish but DAW handling of
    the first note_off varies. Merging overlap removes stuck/truncated-note ambiguity
    while preserving separate retriggers that begin at or after the previous end.
    """
    by_pitch: dict[int, list[NoteEvent]] = defaultdict(list)
    for n in notes:
        if n.end > n.start:
            by_pitch[int(n.pitch)].append(n)

    out: list[NoteEvent] = []
    for pitch, xs in by_pitch.items():
        xs = sorted(xs, key=lambda n: (n.start, n.end))
        cur: NoteEvent | None = None
        for n in xs:
            if cur is None:
                cur = NoteEvent(n.start, n.end, pitch, n.velocity, n.confidence, n.label)
                continue
            if n.start < cur.end:
                cur.end = max(cur.end, n.end)
                cur.velocity = max(cur.velocity, n.velocity)
                cur.confidence = max(cur.confidence, n.confidence)
            else:
                out.append(cur)
                cur = NoteEvent(n.start, n.end, pitch, n.velocity, n.confidence, n.label)
        if cur is not None:
            out.append(cur)
    return sorted(out, key=lambda n: (n.start, n.pitch, n.end))


def write_midi(
    path: Path,
    notes: list[NoteEvent],
    bpm: float,
    is_drum: bool,
    name: str,
    *,
    bars: int = 16,
    beats_per_bar: int = 4,
) -> None:
    """Write exact 960-PPQ Format-1 MIDI with an explicit 16-bar end."""
    import mido

    tempo = mido.bpm2tempo(float(bpm))
    total_ticks = int(bars * beats_per_bar * PPQ)
    mid = mido.MidiFile(type=1, ticks_per_beat=PPQ)

    conductor = mido.MidiTrack()
    mid.tracks.append(conductor)
    conductor.append(mido.MetaMessage("track_name", name="DropForge Conductor", time=0))
    conductor.append(mido.MetaMessage("set_tempo", tempo=tempo, time=0))
    conductor.append(mido.MetaMessage("time_signature", numerator=beats_per_bar, denominator=4, time=0))
    conductor.append(mido.MetaMessage("marker", text=f"DropForge {bars}-bar end", time=total_ticks))
    conductor.append(mido.MetaMessage("end_of_track", time=0))

    track = mido.MidiTrack()
    mid.tracks.append(track)
    track.append(mido.MetaMessage("track_name", name=name, time=0))
    channel = 9 if is_drum else 0

    safe_notes = notes if is_drum else normalize_same_pitch_overlaps(notes)
    events: list[tuple[int, int, object]] = []
    for e in safe_notes:
        if e.end <= e.start:
            continue
        start = min(total_ticks - 1, seconds_to_ticks(e.start, bpm))
        end = min(total_ticks, max(start + 1, seconds_to_ticks(e.end, bpm)))
        pitch = max(0, min(127, int(e.pitch)))
        velocity = max(1, min(127, int(e.velocity)))
        events.append((start, 1, mido.Message("note_on", channel=channel, note=pitch, velocity=velocity, time=0)))
        events.append((end, 0, mido.Message("note_off", channel=channel, note=pitch, velocity=0, time=0)))

    events.sort(key=lambda x: (x[0], x[1], getattr(x[2], "note", 0)))
    last = 0
    for tick, _priority, msg in events:
        msg.time = max(0, tick - last)
        track.append(msg)
        last = tick
    track.append(mido.MetaMessage("end_of_track", time=max(0, total_ticks - last)))

    path.parent.mkdir(parents=True, exist_ok=True)
    mid.save(str(path))
