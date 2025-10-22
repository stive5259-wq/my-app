import { describe, expect, it } from 'vitest';
import { generateProgression, smartSwap } from '../../src/core/generator';
import { voiceLeadingDistance } from '../../src/core/theory';

describe('smartSwap', () => {
  it('preserves duration and maintains reasonable voice leading for harmony swaps', () => {
    const progression = generateProgression('C', 'major');
    const chordIndex = 1;
    const original = progression.chords[chordIndex];

    const swapped = smartSwap(progression, chordIndex, 'harmony', 42);
    const distance = voiceLeadingDistance(original.notes, swapped.notes);

    expect(swapped.durationBeats).toBe(original.durationBeats);
    expect(distance).toBeLessThanOrEqual(24);
  });

  it('keeps root but changes quality for voicing swaps', () => {
    const progression = generateProgression('A', 'aeolian');
    const chordIndex = 0;
    const original = progression.chords[chordIndex];

    const swapped = smartSwap(progression, chordIndex, 'voicing', 7);

    expect(swapped.root).toBe(original.root);
    expect(swapped.quality).not.toBe(original.quality);
  });
});
