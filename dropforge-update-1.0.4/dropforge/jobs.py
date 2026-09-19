from __future__ import annotations

import asyncio
import logging
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .config import WORK_ROOT
from .pipeline import run_pipeline

log = logging.getLogger(__name__)

@dataclass
class Job:
    id: str
    stage: str = "queued"
    progress: float = 0.0
    message: str = "Queued"
    error: str | None = None
    result: dict[str, Any] | None = None

class JobManager:
    def __init__(self) -> None:
        self.jobs: dict[str, Job] = {}
        self.tasks: set[asyncio.Task] = set()

    def create(self) -> Job:
        jid = uuid.uuid4().hex[:12]
        job = Job(jid)
        self.jobs[jid] = job
        return job

    def schedule(self, job: Job, *, url: str | None, upload_path: Path | None) -> None:
        task = asyncio.create_task(self.run(job, url=url, upload_path=upload_path))
        self.tasks.add(task)
        task.add_done_callback(self.tasks.discard)

    def emit(self, job: Job, stage: str, progress: float, message: str) -> None:
        job.stage, job.progress, job.message = stage, progress, message
        log.info("job=%s stage=%s progress=%.3f %s", job.id, stage, progress, message)

    def public(self, job: Job) -> dict[str, Any]:
        return {
            "id": job.id,
            "stage": job.stage,
            "progress": job.progress,
            "message": job.message,
            "error": job.error,
            "result": job.result,
        }

    async def run(self, job: Job, *, url: str | None, upload_path: Path | None) -> None:
        work = WORK_ROOT / job.id
        work.mkdir(parents=True, exist_ok=True)

        def cb(stage: str, pct: float, msg: str):
            self.emit(job, stage, pct, msg)

        try:
            analysis, bundle = await asyncio.to_thread(
                run_pipeline,
                work,
                url=url,
                local_path=upload_path,
                progress=cb,
            )
            job.result = {
                "analysis": analysis.to_dict(),
                "files": {
                    "drums_midi": bundle.drums_midi.name,
                    "bass_midi": bundle.bass_midi.name,
                    "bass_raw_midi": bundle.bass_raw_midi.name,
                    "drums_wav": bundle.drums_wav.name,
                    "bass_wav": bundle.bass_wav.name,
                    "vocals_wav": bundle.vocals_wav.name,
                    "other_wav": bundle.other_wav.name,
                    "preview_wav": bundle.preview_wav.name,
                    "manifest": bundle.manifest_json.name,
                    "diagnostics": bundle.diagnostics_json.name,
                    "bass_evidence_json": bundle.bass_evidence_json.name,
                    "bass_evidence_svg": bundle.bass_evidence_svg.name,
                },
            }
            self.emit(job, "ready", 1.0, "Ready")
        except Exception as exc:
            log.exception("job=%s failed", job.id)
            job.error = f"{type(exc).__name__}: {exc}"
            self.emit(job, "failed", job.progress, job.error)

manager = JobManager()
