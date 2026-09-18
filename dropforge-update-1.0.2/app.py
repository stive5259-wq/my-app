from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from dropforge.config import APP_NAME, APP_VERSION, STATIC_ROOT, WORK_ROOT, RUNTIME_ROOT, LOG_FILE

RUNTIME_ROOT.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    handlers=[logging.FileHandler(LOG_FILE, encoding="utf-8"), logging.StreamHandler()],
    force=True,
)
log = logging.getLogger(__name__)

from dropforge.jobs import manager

app = FastAPI(title=APP_NAME, version=APP_VERSION)
app.mount("/static", StaticFiles(directory=STATIC_ROOT), name="static")

@app.on_event("startup")
def startup() -> None:
    WORK_ROOT.mkdir(parents=True, exist_ok=True)
    log.info("%s %s startup work_root=%s", APP_NAME, APP_VERSION, WORK_ROOT)

@app.get("/")
def index():
    return FileResponse(STATIC_ROOT / "index.html")

@app.get("/api/health")
def health():
    return {"ok": True, "app": APP_NAME, "version": APP_VERSION}

@app.post("/api/jobs")
async def create_job(url: str = Form(default=""), file: UploadFile | None = File(default=None)):
    if not url.strip() and file is None:
        raise HTTPException(400, "Provide a YouTube URL or local audio file")
    if url.strip() and file is not None:
        raise HTTPException(400, "Choose either URL or local file, not both")
    job = manager.create()
    upload_path = None
    if file is not None:
        suffix = Path(file.filename or "upload.wav").suffix or ".wav"
        upload_dir = WORK_ROOT / job.id
        upload_dir.mkdir(parents=True, exist_ok=True)
        upload_path = upload_dir / f"upload{suffix}"
        with upload_path.open("wb") as f:
            while chunk := await file.read(1024 * 1024):
                f.write(chunk)
    manager.schedule(job, url=url.strip() or None, upload_path=upload_path)
    return manager.public(job)

@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    job = manager.jobs.get(job_id)
    if not job: raise HTTPException(404, "Unknown job")
    return manager.public(job)

@app.websocket("/api/jobs/{job_id}/ws")
async def job_ws(ws: WebSocket, job_id: str):
    job = manager.jobs.get(job_id)
    if not job:
        await ws.close(code=4404); return
    await ws.accept()
    try:
        while True:
            await ws.send_json(manager.public(job))
            if job.error or job.result:
                return
            await asyncio.sleep(0.45)
    except WebSocketDisconnect:
        pass

@app.get("/api/jobs/{job_id}/files/{filename}")
def get_file(job_id: str, filename: str):
    job = manager.jobs.get(job_id)
    if not job or not job.result: raise HTTPException(404, "Job/file not ready")
    allowed = set(job.result["files"].values())
    if filename not in allowed: raise HTTPException(404, "Unknown file")
    path = WORK_ROOT / job_id / filename
    return FileResponse(path, filename=filename)

@app.post("/api/jobs/{job_id}/reveal")
def reveal(job_id: str):
    path = WORK_ROOT / job_id
    if not path.exists(): raise HTTPException(404, "Unknown job")
    if os.uname().sysname == "Darwin":
        os.system(f"open {shlex_quote(str(path))}")
    return {"ok": True, "path": str(path)}

def shlex_quote(s: str) -> str:
    import shlex
    return shlex.quote(s)
