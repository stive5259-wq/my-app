from __future__ import annotations

import hashlib
import json
import shutil
import time
from pathlib import Path
from typing import Any, Iterable

from .config import CACHE_ROOT, CACHE_MAX_BYTES


def sha256_file(path: Path, chunk_size: int = 1024 * 1024) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def stable_key(*parts: Any) -> str:
    payload = json.dumps(parts, sort_keys=True, separators=(',', ':'), default=str).encode('utf-8')
    return hashlib.sha256(payload).hexdigest()[:32]


class StageCache:
    """Small content-addressed cache for expensive deterministic pipeline stages.

    Cache entries are ordinary files under Application Support. We cache only selected
    16-bar analysis artifacts, not full-track source audio, so repeated experiments are
    fast without creating an unbounded second music library.
    """

    def __init__(self, root: Path = CACHE_ROOT, max_bytes: int = CACHE_MAX_BYTES) -> None:
        self.root = root
        self.max_bytes = int(max_bytes)
        self.root.mkdir(parents=True, exist_ok=True)

    def _entry(self, stage: str, key: str) -> Path:
        return self.root / stage / key

    def get_json(self, stage: str, key: str) -> dict[str, Any] | None:
        p = self._entry(stage, key) / 'data.json'
        if not p.exists():
            return None
        try:
            payload = json.loads(p.read_text(encoding='utf-8'))
            self._touch(p.parent)
            return payload
        except Exception:
            return None

    def put_json(self, stage: str, key: str, payload: dict[str, Any]) -> None:
        d = self._entry(stage, key)
        d.mkdir(parents=True, exist_ok=True)
        tmp = d / 'data.json.tmp'
        tmp.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding='utf-8')
        tmp.replace(d / 'data.json')
        self._touch(d)
        self.prune()

    def restore_files(self, stage: str, key: str, names: Iterable[str], dest_dir: Path) -> bool:
        d = self._entry(stage, key)
        names = list(names)
        if not names or not all((d / n).is_file() for n in names):
            return False
        dest_dir.mkdir(parents=True, exist_ok=True)
        for name in names:
            shutil.copy2(d / name, dest_dir / name)
        self._touch(d)
        return True

    def store_files(self, stage: str, key: str, files: Iterable[Path]) -> None:
        d = self._entry(stage, key)
        d.mkdir(parents=True, exist_ok=True)
        for src in files:
            if not src.is_file():
                raise FileNotFoundError(src)
            tmp = d / f'.{src.name}.tmp'
            shutil.copy2(src, tmp)
            tmp.replace(d / src.name)
        self._touch(d)
        self.prune()

    def _touch(self, path: Path) -> None:
        now = time.time()
        try:
            path.touch(exist_ok=True)
            # Directory mtime is our cheap LRU marker.
            import os
            os.utime(path, (now, now))
        except OSError:
            pass

    def prune(self) -> None:
        if self.max_bytes <= 0 or not self.root.exists():
            return
        entries: list[tuple[float, int, Path]] = []
        total = 0
        for stage in self.root.iterdir():
            if not stage.is_dir():
                continue
            for entry in stage.iterdir():
                if not entry.is_dir():
                    continue
                size = 0
                try:
                    for p in entry.rglob('*'):
                        if p.is_file():
                            size += p.stat().st_size
                    mtime = entry.stat().st_mtime
                except OSError:
                    continue
                total += size
                entries.append((mtime, size, entry))
        if total <= self.max_bytes:
            return
        for _mtime, size, entry in sorted(entries):
            try:
                shutil.rmtree(entry)
                total -= size
            except OSError:
                pass
            if total <= self.max_bytes:
                break
