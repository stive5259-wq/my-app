from __future__ import annotations

from pathlib import Path
import math
import numpy as np
import soundfile as sf


def make_preview(drums: Path, bass: Path, out: Path) -> None:
    yd, sr1 = sf.read(drums, always_2d=True, dtype="float32")
    yb, sr2 = sf.read(bass, always_2d=True, dtype="float32")
    if sr1 != sr2:
        raise ValueError("Stem sample rates differ")
    n = min(len(yd), len(yb))
    mix = yd[:n] + yb[:n]
    peak = float(np.max(np.abs(mix))) if n else 1.0
    if peak > 0.98:
        mix *= 0.98 / peak
    sf.write(out, mix, sr1, subtype="PCM_24")


def signal_stats(path: Path) -> dict[str, float | int]:
    y, sr = sf.read(path, always_2d=True, dtype="float32")
    if y.size == 0:
        return {"sample_rate": int(sr), "frames": 0, "rms": 0.0, "rms_dbfs": -120.0, "peak": 0.0, "peak_dbfs": -120.0}
    mono = np.mean(y.astype(np.float64), axis=1)
    rms = float(np.sqrt(np.mean(mono * mono) + 1e-20))
    peak = float(np.max(np.abs(y)))
    to_db = lambda v: max(-120.0, 20.0 * math.log10(max(v, 1e-6)))
    return {
        "sample_rate": int(sr),
        "frames": int(len(y)),
        "rms": rms,
        "rms_dbfs": round(to_db(rms), 3),
        "peak": peak,
        "peak_dbfs": round(to_db(peak), 3),
    }
