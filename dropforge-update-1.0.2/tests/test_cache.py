import tempfile
import unittest
from pathlib import Path

from dropforge.cache import StageCache, stable_key


class CacheTests(unittest.TestCase):
    def test_json_and_file_roundtrip(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td) / "cache"
            cache = StageCache(root, max_bytes=10_000_000)
            key = stable_key("x", 1, {"a": 2})
            cache.put_json("structure", key, {"bpm": 130.0})
            self.assertEqual(cache.get_json("structure", key)["bpm"], 130.0)

            srcdir = Path(td) / "src"
            srcdir.mkdir()
            src = srcdir / "bass.wav"
            src.write_bytes(b"abc")
            cache.store_files("demix", key, [src])
            dest = Path(td) / "dest"
            self.assertTrue(cache.restore_files("demix", key, ["bass.wav"], dest))
            self.assertEqual((dest / "bass.wav").read_bytes(), b"abc")


if __name__ == "__main__":
    unittest.main()
