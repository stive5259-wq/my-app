import unittest
import numpy as np

from dropforge.bass import _basic_pitch_events, is_suspicious_zero_bass


class BassReliabilityTests(unittest.TestCase):
    def test_basic_pitch_decodes_native_range_then_filters_events(self):
        seen = {}

        def fake_predict(path, **kwargs):
            seen.update(kwargs)
            output = {
                "note": np.full((10, 88), 0.4, dtype=np.float32),
                "onset": np.full((10, 88), 0.5, dtype=np.float32),
                "contour": np.full((10, 264), 0.3, dtype=np.float32),
            }
            events = [
                (0.0, 0.2, 20, 0.8, None),
                (0.2, 0.4, 21, 0.7, None),
                (0.4, 0.6, 43, 0.6, None),
                (0.6, 0.8, 60, 0.5, None),
                (0.8, 1.0, 61, 0.9, None),
            ]
            return output, object(), events

        notes, diag = _basic_pitch_events(
            "dummy.wav", 130.0, 0.48, 0.28, 85.0, 21, 60,
            predict_fn=fake_predict,
        )
        self.assertNotIn("minimum_frequency", seen)
        self.assertNotIn("maximum_frequency", seen)
        self.assertEqual([n.pitch for n in notes], [21, 43, 60])
        self.assertEqual(diag["decoded_event_count"], 5)
        self.assertEqual(diag["range_filtered_event_count"], 3)
        self.assertGreater(diag["note_max"], 0.0)
        self.assertGreater(diag["onset_max"], 0.0)

    def test_zero_notes_with_active_stem_and_contour_fails_loud(self):
        self.assertTrue(is_suspicious_zero_bass(
            0,
            {"rms_dbfs": -13.2},
            {"contour_max": 0.54565},
        ))
        self.assertFalse(is_suspicious_zero_bass(
            0,
            {"rms_dbfs": -70.0},
            {"contour_max": 0.54565},
        ))
        self.assertFalse(is_suspicious_zero_bass(
            12,
            {"rms_dbfs": -13.2},
            {"contour_max": 0.54565},
        ))


if __name__ == "__main__":
    unittest.main()
