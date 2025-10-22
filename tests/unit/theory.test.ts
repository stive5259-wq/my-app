import { describe, expect, it } from 'vitest';
import {
  CHORD_QUALITIES,
  NOTE_VALUES,
  getTritoneSubstitution,
  optimizeVoicing,
  voiceLeadingDistance,
} from '../../src/core/theory';

describe('theory primitives', () => {
  it('returns 0 voice-leading distance for identical voicings', () => {
    const voicing = [60, 64, 67, 71];
    expect(voiceLeadingDistance(voicing, voicing)).toBe(0);
  });

  it('does not increase distance when optimizing voicing', () => {
    const previous = [60, 64, 67, 71]; // Cmaj7 in close position
    const targetRoot = (4 + 1) * 12 + NOTE_VALUES['F']; // F root in the same octave range
    const targetIntervals = CHORD_QUALITIES['dom7'].intervals;

    const baseVoicing = targetIntervals.map(interval => targetRoot + interval);
    const optimized = optimizeVoicing(previous, targetRoot, targetIntervals);

    const baseDistance = voiceLeadingDistance(previous, baseVoicing);
    const optimizedDistance = voiceLeadingDistance(previous, optimized);

    expect(optimizedDistance).toBeLessThanOrEqual(baseDistance);
  });

  it('provides the correct tritone substitution for dominant chords', () => {
    expect(getTritoneSubstitution('G')).toBe('Db');
  });
});
