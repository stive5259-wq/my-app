import tempfile
import unittest
from pathlib import Path

import mido

from dropforge.midi import PPQ, write_midi, normalize_same_pitch_overlaps
from dropforge.models import NoteEvent


class MidiTests(unittest.TestCase):
    def test_format_ppq_and_exact_phrase_end(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "x.mid"
            write_midi(path, [NoteEvent(0.1, 0.3, 36, 100)], 120.0, True, "Drums")
            mid = mido.MidiFile(path)
            self.assertEqual(mid.type, 1)
            self.assertEqual(mid.ticks_per_beat, PPQ)
            self.assertEqual(max(sum(msg.time for msg in tr) for tr in mid.tracks), 16 * 4 * PPQ)

    def test_drum_channel_is_gm_channel_10(self):
        with tempfile.TemporaryDirectory() as td:
            path = Path(td) / "x.mid"
            write_midi(path, [NoteEvent(0.0, 0.1, 36, 127)], 128.0, True, "Drums")
            mid = mido.MidiFile(path)
            ons = [m for tr in mid.tracks for m in tr if getattr(m, "type", None) == "note_on" and m.velocity > 0]
            self.assertEqual(ons[0].channel, 9)

    def test_bass_same_pitch_overlaps_are_merged(self):
        xs = [
            NoteEvent(0.0, 0.5, 36, 70, .5),
            NoteEvent(0.3, 0.8, 36, 100, .9),
            NoteEvent(0.8, 1.0, 36, 80, .7),
        ]
        out = normalize_same_pitch_overlaps(xs)
        self.assertEqual(len(out), 2)
        self.assertAlmostEqual(out[0].start, 0.0)
        self.assertAlmostEqual(out[0].end, 0.8)
        self.assertEqual(out[0].velocity, 100)
        self.assertAlmostEqual(out[1].start, 0.8)


if __name__ == "__main__":
    unittest.main()
