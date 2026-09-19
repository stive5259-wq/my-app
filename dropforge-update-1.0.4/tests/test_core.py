import unittest

from dropforge.bass import repair_and_constrain
from dropforge.models import NoteEvent
from dropforge.timing import warp_notes_to_constant_tempo, constrain_onset_microtiming


class BassContinuityTests(unittest.TestCase):
    def test_preserves_absolute_register_and_chromatic_pitch(self):
        notes = [NoteEvent(0.0, 0.2, 55, 100, 0.2, "bass")]
        out = repair_and_constrain(notes, None, [], 150.0, 0.55)
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0].pitch, 55)

    def test_gap_bridges_same_pitch_near_kick(self):
        notes = [
            NoteEvent(0.0, 0.20, 31, 80, 0.8, "bass"),
            NoteEvent(0.28, 0.50, 31, 90, 0.9, "bass"),
        ]
        out = repair_and_constrain(notes, None, [0.24], 150.0, 0.55)
        self.assertEqual(len(out), 1)
        self.assertAlmostEqual(out[0].end, 0.50)

    def test_intentional_gap_is_preserved_without_kick(self):
        notes = [
            NoteEvent(0.0, 0.20, 31, 80, 0.8, "bass"),
            NoteEvent(0.30, 0.50, 31, 90, 0.9, "bass"),
        ]
        out = repair_and_constrain(notes, None, [], 150.0, 0.55)
        self.assertEqual(len(out), 2)


class TimingTests(unittest.TestCase):
    def test_warp_maps_variable_beats_to_constant_tempo(self):
        beats = [0.0, 0.50, 1.02, 1.51, 2.03]
        note = NoteEvent(1.02, 1.51, 36, 100)
        out = warp_notes_to_constant_tempo([note], beats, 120.0, 0.0)
        self.assertEqual(len(out), 1)
        self.assertAlmostEqual(out[0].start, 1.0, places=5)
        self.assertAlmostEqual(out[0].end, 1.5, places=5)

    def test_microtiming_is_capped(self):
        note = NoteEvent(0.19, 0.40, 36, 100)
        out = constrain_onset_microtiming([note], 120.0, 25.0)
        self.assertEqual(len(out), 1)
        sixteenth = 60.0 / 120.0 / 4.0
        nearest = round(note.start / sixteenth) * sixteenth
        self.assertLessEqual(abs(out[0].start - nearest), 0.0250001)


if __name__ == "__main__":
    unittest.main()
