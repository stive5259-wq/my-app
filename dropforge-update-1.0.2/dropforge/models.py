from __future__ import annotations

from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any

@dataclass
class NoteEvent:
    start: float
    end: float
    pitch: int
    velocity: int
    confidence: float = 1.0
    label: str = ""

    def clipped(self, start_s: float, end_s: float) -> "NoteEvent | None":
        a = max(self.start, start_s)
        b = min(self.end, end_s)
        if b <= a:
            return None
        return NoteEvent(a - start_s, b - start_s, self.pitch, self.velocity, self.confidence, self.label)

@dataclass
class Analysis:
    bpm: float
    key: str
    mode: str
    section_start: float
    section_end: float
    source_title: str
    source_url: str | None
    confidence: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

@dataclass
class OutputBundle:
    work_dir: Path
    drums_midi: Path
    bass_midi: Path
    bass_raw_midi: Path
    drums_wav: Path
    bass_wav: Path
    preview_wav: Path
    manifest_json: Path
    diagnostics_json: Path
