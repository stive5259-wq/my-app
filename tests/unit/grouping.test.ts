import { describe, it, expect } from 'vitest';
import type { Progression } from '../../src/core/generator';
import { computeNoteEvents } from '../../src/services/grouping';

const progression: Progression = {
  tempoBpm: 120,
  key: 'C',
  mode: 'minor',
  chords: [
    { root: 'C', quality: 'min7', octave: 4, notes: [60, 64, 67], durationBeats: 4 },
    { root: 'F', quality: 'maj7', octave: 4, notes: [60, 65, 69], durationBeats: 4 },
  ],
};

describe('FEAT-008B grouping scheduler', () => {
  it('sustains common tone across boundary without duplicate note-on when Group→Next enabled', () => {
    const events = computeNoteEvents(progression, [true], false);
    const cEvents = events.filter((event) => event.midi === 60);
    expect(cEvents.length).toBe(1);
    expect(cEvents[0].startBeats).toBe(0);
    expect(cEvents[0].durationBeats).toBe(8);
    expect(events.find((event) => event.midi === 60 && event.startBeats === 4)).toBeUndefined();
  });

  it('sustains from start to end when Group All enabled', () => {
    const events = computeNoteEvents(progression, [], true);
    const totalBeats = 8;
    const sustained = events.find((event) => event.startBeats === 0 && event.durationBeats === totalBeats);
    expect(sustained).toBeTruthy();
    if (sustained) {
      const sustainedPC = sustained.midi % 12;
      const reTrigger = events.find((event) => event.startBeats === 4 && event.midi % 12 === sustainedPC);
      expect(reTrigger).toBeUndefined();
    }
  });
});
