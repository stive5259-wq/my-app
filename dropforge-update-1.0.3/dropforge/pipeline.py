from __future__ import annotations

import logging
from pathlib import Path
from typing import Callable

from .audio import make_preview, signal_stats
from .bass import transcribe_bass, is_suspicious_zero_bass
from .cache import StageCache, sha256_file, stable_key
from .config import DEFAULT_CONFIG, APP_VERSION
from .drums import transcribe_drums
from .harmony import estimate_key
from .midi import write_midi
from .models import Analysis, OutputBundle
from .separation import copy_stem_slice, demix
from .source import ingest_local, ingest_youtube
from .structure import Section, estimate_drop_section
from .timing import warp_notes_to_constant_tempo, constrain_onset_microtiming
from .util import write_json

Progress = Callable[[str, float, str], None]
log = logging.getLogger(__name__)


def _section_to_dict(section: Section) -> dict:
    return {
        "bpm": float(section.bpm),
        "start": float(section.start),
        "end": float(section.end),
        "beat_times": [float(x) for x in section.beat_times],
        "method": str(section.method),
    }


def _section_from_dict(payload: dict) -> Section:
    return Section(
        bpm=float(payload["bpm"]),
        start=float(payload["start"]),
        end=float(payload["end"]),
        beat_times=[float(x) for x in payload["beat_times"]],
        method=str(payload["method"]),
    )


def run_pipeline(work_dir: Path, *, url: str | None = None, local_path: Path | None = None, progress: Progress=lambda *_: None) -> tuple[Analysis, OutputBundle]:
    cfg = DEFAULT_CONFIG
    work_dir.mkdir(parents=True, exist_ok=True)
    cache = StageCache()
    cache_hits = {"structure": False, "demix_section": False}
    diagnostics: dict = {"app_version": APP_VERSION, "cache_hits": cache_hits}

    progress("download", 0.04, "Acquiring source audio")
    if url:
        source_wav, title = ingest_youtube(url, work_dir)
        source_url = url
    elif local_path:
        source_wav, title = ingest_local(local_path, work_dir)
        source_url = None
    else:
        raise ValueError("Either url or local_path is required")

    source_hash = sha256_file(source_wav)
    diagnostics["source_sha256"] = source_hash

    progress("structure", 0.12, "Finding tempo and strongest bar-aligned 16-bar section")
    structure_key = stable_key("structure-v2", source_hash, cfg.bars, cfg.beats_per_bar)
    cached_section = cache.get_json("structure", structure_key)
    if cached_section:
        section = _section_from_dict(cached_section)
        cache_hits["structure"] = True
        log.info("structure cache hit %s", structure_key)
    else:
        section = estimate_drop_section(source_wav, cfg.bars, cfg.beats_per_bar)
        cache.put_json("structure", structure_key, _section_to_dict(section))
    duration = section.end - section.start

    drums_clip = work_dir / "drums_16bar.wav"
    bass_clip = work_dir / "bass_16bar.wav"
    vocals_clip = work_dir / "vocals_16bar.wav"
    other_clip = work_dir / "other_16bar.wav"
    key_source = work_dir / "key_source.wav"

    pad_s = cfg.beats_per_bar * 2 * 60.0 / section.bpm
    demix_key = stable_key(
        "demix-section-v3-four-stem",
        source_hash,
        cfg.demucs_model,
        round(section.start, 6),
        round(section.end, 6),
        round(pad_s, 6),
    )
    cache_names = [
        drums_clip.name,
        bass_clip.name,
        vocals_clip.name,
        other_clip.name,
        key_source.name,
    ]
    if cache.restore_files("demix_section", demix_key, cache_names, work_dir):
        cache_hits["demix_section"] = True
        progress("demix", 0.45, "Loaded separated 16-bar stem pack from cache")
        log.info("demix cache hit %s", demix_key)
    else:
        from .util import run
        padded_start = max(0.0, section.start - pad_s)
        trim_offset = section.start - padded_start
        padded_duration = duration + trim_offset + pad_s
        demix_input = work_dir / "demix_input.wav"
        run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-ss", f"{padded_start:.6f}", "-t", f"{padded_duration:.6f}",
            "-i", str(source_wav), "-c:a", "pcm_s24le", str(demix_input),
        ])

        progress("demix", 0.24, "Demixing selected section with Demucs")
        stems = demix(demix_input, work_dir, cfg.demucs_model)
        missing = [name for name in ("drums", "bass", "vocals", "other") if name not in stems]
        if missing:
            raise RuntimeError(f"Demucs did not return expected four-stem output: missing {missing}")
        copy_stem_slice(stems["drums"], drums_clip, trim_offset, duration)
        copy_stem_slice(stems["bass"], bass_clip, trim_offset, duration)
        copy_stem_slice(stems["vocals"], vocals_clip, trim_offset, duration)
        copy_stem_slice(stems["other"], other_clip, trim_offset, duration)

        run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-i", str(other_clip), "-i", str(bass_clip),
            "-filter_complex", "amix=inputs=2:normalize=0",
            "-c:a", "pcm_s24le", str(key_source),
        ])
        cache.store_files(
            "demix_section",
            demix_key,
            [drums_clip, bass_clip, vocals_clip, other_clip, key_source],
        )

    diagnostics["stem_audio"] = {
        "drums": signal_stats(drums_clip),
        "bass": signal_stats(bass_clip),
        "vocals": signal_stats(vocals_clip),
        "other": signal_stats(other_clip),
    }
    bass_audio_stats = diagnostics["stem_audio"]["bass"]

    key = estimate_key(key_source, 0.0, duration)

    progress("drums", 0.58, "Transcribing drum stem with ADTOF neural model")
    drums_raw = transcribe_drums(drums_clip, work_dir / "adtof_raw.mid", 0.0, duration)
    kick_rel_raw = [n.start for n in drums_raw if n.pitch == 36]
    diagnostics["drums"] = {"raw_event_count": len(drums_raw), "kick_count": len(kick_rel_raw)}

    progress("bass", 0.70, "Transcribing bass stem with Basic Pitch")
    bass, bass_raw, bass_diag = transcribe_bass(
        bass_clip, section.bpm, 0.0, duration, key, kick_rel_raw,
        cfg.bass_onset_threshold, cfg.bass_frame_threshold, cfg.bass_min_note_ms,
        cfg.sidechain_bridge_ms, cfg.ambiguous_amplitude,
        cfg.bass_decode_min_midi, cfg.bass_decode_max_midi,
    )
    diagnostics["bass_transcription"] = bass_diag

    suspicious_zero = is_suspicious_zero_bass(
        len(bass), bass_audio_stats, bass_diag,
        rms_dbfs_threshold=cfg.suspicious_bass_rms_dbfs,
        contour_threshold=cfg.suspicious_contour_max,
    )
    if suspicious_zero:
        diagnostics["bass_transcription"]["status"] = "failed_suspicious_zero_notes"
        write_json(work_dir / "diagnostics.json", diagnostics)
        raise RuntimeError(
            "Bass transcription produced zero notes despite an active bass stem and "
            f"strong contour evidence (rms={bass_audio_stats['rms_dbfs']} dBFS, "
            f"contour_max={bass_diag.get('contour_max', 0.0):.3f}). "
            "See diagnostics.json; DropForge refused to export a misleading empty bass MIDI."
        )
    diagnostics["bass_transcription"]["status"] = "ok" if bass else "empty_low_evidence"

    bass_raw_midi = work_dir / "DropForge_Bass_RAW.mid"
    write_midi(
        bass_raw_midi,
        bass_raw,
        section.bpm,
        False,
        "DropForge Bass RAW",
        bars=cfg.bars,
        beats_per_bar=cfg.beats_per_bar,
    )

    rel_beats = [t - section.start for t in section.beat_times]
    drums = warp_notes_to_constant_tempo(drums_raw, rel_beats, section.bpm, 0.0)
    drums = constrain_onset_microtiming(drums, section.bpm, cfg.microtiming_limit_ms)
    bass = warp_notes_to_constant_tempo(bass, rel_beats, section.bpm, 0.0)
    bass = constrain_onset_microtiming(bass, section.bpm, cfg.microtiming_limit_ms)

    ideal_duration = cfg.bars * cfg.beats_per_bar * 60.0 / section.bpm
    drums = [c for e in drums if (c := e.clipped(0.0, ideal_duration)) is not None]
    bass = [c for e in bass if (c := e.clipped(0.0, ideal_duration)) is not None]
    diagnostics["final_note_counts"] = {"drums": len(drums), "bass": len(bass)}

    progress("midi", 0.87, "Writing groove-preserving MIDI")
    drums_midi = work_dir / "DropForge_Drums_16bar.mid"
    bass_midi = work_dir / "DropForge_Bass_16bar.mid"
    write_midi(
        drums_midi,
        drums,
        section.bpm,
        True,
        "DropForge Drums",
        bars=cfg.bars,
        beats_per_bar=cfg.beats_per_bar,
    )
    write_midi(
        bass_midi,
        bass,
        section.bpm,
        False,
        "DropForge Bass",
        bars=cfg.bars,
        beats_per_bar=cfg.beats_per_bar,
    )

    preview = work_dir / "DropForge_Preview_Drums_Bass.wav"
    make_preview(drums_clip, bass_clip, preview)

    analysis = Analysis(
        bpm=round(section.bpm, 3),
        key=key.name,
        mode=key.mode,
        section_start=round(section.start, 3),
        section_end=round(section.end, 3),
        source_title=title,
        source_url=source_url,
        confidence={
            "key_profile_correlation": round(key.score, 4),
            "timing_method": section.method,
        },
    )
    diagnostics_json = work_dir / "diagnostics.json"
    write_json(diagnostics_json, diagnostics)

    manifest = work_dir / "manifest.json"
    write_json(manifest, {
        "app": "DropForge",
        "version": APP_VERSION,
        "analysis": analysis.to_dict(),
        "notes": {
            "drums": len(drums),
            "bass": len(bass),
            "bass_raw": len(bass_raw),
        },
        "stems": {
            "drums": drums_clip.name,
            "bass": bass_clip.name,
            "vocals": vocals_clip.name,
            "other": other_clip.name,
        },
        "cache_hits": cache_hits,
        "diagnostics": diagnostics_json.name,
        "caveats": [
            "Source separation reduces bleed but cannot guarantee zero bleed.",
            "The Demucs 'other' stem groups remaining non-vocal/non-drum/non-bass content; it is not instrument-by-instrument separation.",
            "YouTube audio is generally lossy; WAV output prevents another lossy encode but is not lossless recovery.",
            "Key estimation is a musical prior, not a guarantee. Only lower-confidence out-of-scale bass notes are clamped.",
            "ADTOF class 49 is a broad cymbal class and is exported as MIDI 46 open-hat/cymbal proxy.",
            "DropForge refuses to silently mark suspicious zero-note bass transcription as successful.",
        ],
    })
    progress("ready", 1.0, "Ready")
    return analysis, OutputBundle(
        work_dir,
        drums_midi,
        bass_midi,
        bass_raw_midi,
        drums_clip,
        bass_clip,
        vocals_clip,
        other_clip,
        preview,
        manifest,
        diagnostics_json,
    )
