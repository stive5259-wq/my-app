import { describe, expect, it } from 'vitest';
import type { Progression } from '../../src/core/generator';
import { progressionToMIDI } from '../../src/services/MidiExporter';

const SAMPLE_PROGRESSION: Progression = {
  tempoBpm: 120,
  key: 'C',
  mode: 'minor',
  chords: [
    {
      root: 'C',
      quality: 'min7',
      octave: 4,
      notes: [60, 63, 67, 70],
      durationBeats: 4,
    },
  ],
};

describe('MidiExporter', () => {
  it('renders a MIDI header and track chunk', () => {
    const midiBytes = progressionToMIDI(SAMPLE_PROGRESSION);
    expect(midiBytes.length).toBeGreaterThan(20);
    const header = String.fromCharCode(
      midiBytes[0],
      midiBytes[1],
      midiBytes[2],
      midiBytes[3],
    );
    expect(header).toBe('MThd');
    const body = Array.from(midiBytes)
      .map((byte) => String.fromCharCode(byte))
      .join('');
    expect(body.includes('MTrk')).toBe(true);
  });

  it('handles empty progressions', () => {
    const bytes = progressionToMIDI(null);
    expect(bytes.length).toBeGreaterThan(10);
  });
});
