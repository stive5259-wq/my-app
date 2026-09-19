from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import os

APP_NAME = "DropForge"
APP_VERSION = "1.0.4"
ROOT = Path(__file__).resolve().parent.parent
WORK_ROOT = Path(os.environ.get("DROPFORGE_WORK_ROOT", str(Path.home() / "Music" / "DropForge")))
APP_SUPPORT_ROOT = Path(os.environ.get("DROPFORGE_APP_SUPPORT", str(Path.home() / "Library" / "Application Support" / "DropForge")))
RUNTIME_ROOT = APP_SUPPORT_ROOT / APP_VERSION
CACHE_ROOT = Path(os.environ.get("DROPFORGE_CACHE_ROOT", str(APP_SUPPORT_ROOT / "cache")))
CACHE_MAX_BYTES = int(os.environ.get("DROPFORGE_CACHE_MAX_BYTES", str(8 * 1024**3)))
LOG_FILE = RUNTIME_ROOT / "dropforge.log"
STATIC_ROOT = ROOT / "static"

@dataclass(frozen=True)
class PipelineConfig:
    bars: int = 16
    beats_per_bar: int = 4

    # Decode Basic Pitch's native note range, then restrict explicit bass
    # candidates without forcing them into a synthetic C1-C3 register.
    bass_decode_min_midi: int = 21
    bass_decode_max_midi: int = 60

    sidechain_bridge_ms: float = 150.0
    microtiming_limit_ms: float = 25.0
    demucs_model: str = "htdemucs_ft"
    drum_device: str = "cpu"

    bass_onset_threshold: float = 0.48
    bass_frame_threshold: float = 0.28
    bass_min_note_ms: float = 85.0

    # Evidence-fusion baseline. These are intentionally exposed as config so
    # controlled A/B sweeps do not require rewriting the decoder.
    f0_min_hz: float = 27.5
    f0_max_hz: float = 300.0
    f0_target_sr: int = 22050
    f0_frame_length: int = 4096
    f0_hop_length: int = 256
    f0_pitch_tolerance_semitones: float = 0.65

    opportunity_onset_tolerance_ms: float = 60.0
    opportunity_min_overlap: float = 0.12
    octave_decision_margin: float = 0.30

    suspicious_bass_rms_dbfs: float = -42.0
    suspicious_contour_max: float = 0.20

DEFAULT_CONFIG = PipelineConfig()
