import unittest
import numpy as np

from dropforge.bass_evidence import PitchTrack, fuse_note_opportunities, group_note_opportunities
from dropforge.models import NoteEvent


class FakeSpectral:
    def __init__(self, best_pitch=None):
        self.best_pitch = best_pitch

    def candidate_features(self, start, end, pitch):
        good = self.best_pitch is not None and int(pitch) == int(self.best_pitch)
        return {
            "harmonic_support": 0.90 if good else 0.08,
            "subharmonic_penalty": 0.0,
            "even_only_penalty": 0.0,
        }


class BassEvidenceTests(unittest.TestCase):
    def test_groups_octave_and_third_harmonic_candidates(self):
        notes = [
            NoteEvent(1.000, 1.30, 31, 100, 0.60),
            NoteEvent(1.010, 1.28, 43, 90, 0.50),
            NoteEvent(1.015, 1.27, 50, 80, 0.40),
            NoteEvent(2.000, 2.20, 36, 90, 0.70),
        ]
        groups = group_note_opportunities(notes, onset_tolerance_ms=60.0, min_overlap=0.1)
        self.assertEqual(len(groups), 2)
        self.assertEqual({n.pitch for n in groups[0]}, {31, 43, 50})

    def test_f0_and_harmonics_resolve_31_43_55_to_fundamental(self):
        notes = [
            NoteEvent(1.000, 1.30, 31, 100, 0.58),
            NoteEvent(1.010, 1.30, 43, 90, 0.61),
            NoteEvent(1.015, 1.29, 55, 85, 0.44),
        ]
        times = np.array([1.04, 1.08, 1.12, 1.16, 1.20])
        pyin = PitchTrack(times, np.array([31.05, 31.1, 31.0, 31.08, 31.02]), np.ones(5), "pyin")
        contour = PitchTrack(times, np.array([31.0, 31.0, 31.1, 31.0, 31.0]), np.full(5, 0.6), "bp")
        fused, evidence = fuse_note_opportunities(
            notes,
            pyin,
            contour,
            FakeSpectral(31),
            decision_margin=0.20,
        )
        self.assertEqual(len(fused), 1)
        self.assertEqual(fused[0].pitch, 31)
        self.assertTrue(evidence[0]["changed_pitch"])
        self.assertEqual(evidence[0]["decision"], "evidence_octave_or_harmonic_resolution")

    def test_ambiguous_evidence_keeps_strongest_basic_pitch(self):
        notes = [
            NoteEvent(1.000, 1.30, 31, 80, 0.35),
            NoteEvent(1.005, 1.30, 43, 100, 0.82),
        ]
        empty = PitchTrack(np.array([]), np.array([]), np.array([]), "empty")
        fused, evidence = fuse_note_opportunities(
            notes,
            empty,
            empty,
            FakeSpectral(None),
            decision_margin=0.30,
        )
        self.assertEqual(len(fused), 1)
        self.assertEqual(fused[0].pitch, 43)
        self.assertFalse(evidence[0]["changed_pitch"])

    def test_no_forced_c1_c3_register(self):
        notes = [NoteEvent(0.0, 0.2, 55, 100, 0.9)]
        empty = PitchTrack(np.array([]), np.array([]), np.array([]), "empty")
        fused, _ = fuse_note_opportunities(notes, empty, empty, FakeSpectral(None))
        self.assertEqual(fused[0].pitch, 55)


if __name__ == "__main__":
    unittest.main()
