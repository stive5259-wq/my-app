// Core types for chord progression
export interface Chord {
  root: string;
  quality: string;
  octave: number;
  notes: number[]; // MIDI note numbers
  durationBeats: number;
}

export interface Progression {
  chords: Chord[];
  tempoBpm: number;
}

/**
 * Converts a chord symbol to MIDI notes.
 * Example: "Cmaj" at octave 4 → [60, 64, 67] (C, E, G)
 */
function chordToMidi(root: string, quality: string, octave: number): number[] {
  const rootMap: Record<string, number> = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
    'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11,
  };

  const qualityIntervals: Record<string, number[]> = {
    'maj': [0, 4, 7],
    'min': [0, 3, 7],
    'm': [0, 3, 7],
  };

  const rootMidi = (octave + 1) * 12 + (rootMap[root] ?? 0);
  const intervals = qualityIntervals[quality] ?? [0, 4, 7];

  return intervals.map(interval => rootMidi + interval);
}

/**
 * Generates a stub progression: Cmaj, Gmaj, Am, Fmaj
 * Each chord lasts 4 beats at 120 BPM.
 */
export function generateProgression(): Progression {
  const stubChords: Array<{ root: string; quality: string }> = [
    { root: 'C', quality: 'maj' },
    { root: 'G', quality: 'maj' },
    { root: 'A', quality: 'm' },
    { root: 'F', quality: 'maj' },
  ];

  const chords: Chord[] = stubChords.map(({ root, quality }) => ({
    root,
    quality,
    octave: 4,
    notes: chordToMidi(root, quality, 4),
    durationBeats: 4,
  }));

  return {
    chords,
    tempoBpm: 120,
  };
}

/**
 * Swaps a chord to a musically valid alternative.
 * Uses basic music theory to pick alternatives that work well.
 */
export function swapChord(chord: Chord, seed: number): Chord {
  // Define chord alternatives based on music theory
  // These are common substitutions that sound good
  const alternatives: Record<string, Array<{ root: string; quality: string }>> = {
    'Cmaj': [
      { root: 'C', quality: 'maj' },
      { root: 'A', quality: 'm' },
      { root: 'E', quality: 'm' },
      { root: 'F', quality: 'maj' },
    ],
    'Gmaj': [
      { root: 'G', quality: 'maj' },
      { root: 'E', quality: 'm' },
      { root: 'B', quality: 'm' },
      { root: 'D', quality: 'maj' },
    ],
    'Am': [
      { root: 'A', quality: 'm' },
      { root: 'F', quality: 'maj' },
      { root: 'C', quality: 'maj' },
      { root: 'D', quality: 'm' },
    ],
    'Fmaj': [
      { root: 'F', quality: 'maj' },
      { root: 'D', quality: 'm' },
      { root: 'A', quality: 'm' },
      { root: 'C', quality: 'maj' },
    ],
  };

  const currentKey = `${chord.root}${chord.quality}`;
  const options = alternatives[currentKey] || alternatives['Cmaj'];

  // Use seed to pick a different option (not the current one)
  const filtered = options.filter(opt => opt.root !== chord.root || opt.quality !== chord.quality);
  const index = seed % filtered.length;
  const newChord = filtered[index];

  return {
    root: newChord.root,
    quality: newChord.quality,
    octave: chord.octave,
    notes: chordToMidi(newChord.root, newChord.quality, chord.octave),
    durationBeats: chord.durationBeats,
  };
}
