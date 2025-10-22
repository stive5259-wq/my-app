// Music Theory Engine for Smart Swap

export type NoteName = 'C' | 'Db' | 'D' | 'Eb' | 'E' | 'F' | 'Gb' | 'G' | 'Ab' | 'A' | 'Bb' | 'B';
export type ChordQuality = 'maj' | 'min' | 'dim' | 'aug' |
                           'maj7' | 'min7' | 'dom7' | 'min7b5' | 'dim7' |
                           'maj9' | 'min9' | 'dom7b9' | 'dom7#9' |
                           'maj11' | 'min11' | 'dom11' |
                           'maj13' | 'min13' | 'dom13';

export type Mode = 'major' | 'minor' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'aeolian' | 'locrian';
export type ChordFunction = 'I' | 'ii' | 'iii' | 'IV' | 'V' | 'vi' | 'vii';

export interface Scale {
  root: NoteName;
  mode: Mode;
  intervals: number[]; // Semitones from root
}

export interface ChordDefinition {
  quality: ChordQuality;
  intervals: number[]; // Semitones from root
  displayName: string;
}

// Note mappings
export const NOTE_VALUES: Record<NoteName, number> = {
  'C': 0, 'Db': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5,
  'Gb': 6, 'G': 7, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11,
};

export const NOTES: NoteName[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Modal intervals (semitones from root)
export const MODE_INTERVALS: Record<Mode, number[]> = {
  'major':     [0, 2, 4, 5, 7, 9, 11], // Ionian
  'minor':     [0, 2, 3, 5, 7, 8, 10], // Natural minor (Aeolian)
  'dorian':    [0, 2, 3, 5, 7, 9, 10],
  'phrygian':  [0, 1, 3, 5, 7, 8, 10],
  'lydian':    [0, 2, 4, 6, 7, 9, 11],
  'mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'aeolian':   [0, 2, 3, 5, 7, 8, 10],
  'locrian':   [0, 1, 3, 5, 6, 8, 10],
};

// Chord quality definitions
export const CHORD_QUALITIES: Record<ChordQuality, ChordDefinition> = {
  'maj':      { quality: 'maj',      intervals: [0, 4, 7],          displayName: '' },
  'min':      { quality: 'min',      intervals: [0, 3, 7],          displayName: 'm' },
  'dim':      { quality: 'dim',      intervals: [0, 3, 6],          displayName: 'dim' },
  'aug':      { quality: 'aug',      intervals: [0, 4, 8],          displayName: 'aug' },
  'maj7':     { quality: 'maj7',     intervals: [0, 4, 7, 11],      displayName: 'maj7' },
  'min7':     { quality: 'min7',     intervals: [0, 3, 7, 10],      displayName: 'm7' },
  'dom7':     { quality: 'dom7',     intervals: [0, 4, 7, 10],      displayName: '7' },
  'min7b5':   { quality: 'min7b5',   intervals: [0, 3, 6, 10],      displayName: 'm7b5' },
  'dim7':     { quality: 'dim7',     intervals: [0, 3, 6, 9],       displayName: 'dim7' },
  'maj9':     { quality: 'maj9',     intervals: [0, 4, 7, 11, 14],  displayName: 'maj9' },
  'min9':     { quality: 'min9',     intervals: [0, 3, 7, 10, 14],  displayName: 'm9' },
  'dom7b9':   { quality: 'dom7b9',   intervals: [0, 4, 7, 10, 13],  displayName: '7b9' },
  'dom7#9':   { quality: 'dom7#9',   intervals: [0, 4, 7, 10, 15],  displayName: '7#9' },
  'maj11':    { quality: 'maj11',    intervals: [0, 4, 7, 11, 14, 17], displayName: 'maj11' },
  'min11':    { quality: 'min11',    intervals: [0, 3, 7, 10, 14, 17], displayName: 'm11' },
  'dom11':    { quality: 'dom11',    intervals: [0, 4, 7, 10, 14, 17], displayName: '11' },
  'maj13':    { quality: 'maj13',    intervals: [0, 4, 7, 11, 14, 21], displayName: 'maj13' },
  'min13':    { quality: 'min13',    intervals: [0, 3, 7, 10, 14, 21], displayName: 'm13' },
  'dom13':    { quality: 'dom13',    intervals: [0, 4, 7, 10, 14, 21], displayName: '13' },
};

/**
 * Get the note at a specific degree of a scale
 */
export function getScaleDegree(scale: Scale, degree: number): NoteName {
  const scaleIndex = (degree - 1) % 7;
  const interval = scale.intervals[scaleIndex];
  const noteValue = (NOTE_VALUES[scale.root] + interval) % 12;
  return NOTES[noteValue];
}

/**
 * Build a diatonic chord from a scale degree
 */
export function getDiatonicChord(scale: Scale, degree: number, extensions: boolean = false): {
  root: NoteName;
  quality: ChordQuality;
} {
  const root = getScaleDegree(scale, degree);

  // Get the intervals for this chord (1st, 3rd, 5th from scale)
  const intervals = [
    scale.intervals[(degree - 1) % 7],
    scale.intervals[(degree + 1) % 7],
    scale.intervals[(degree + 3) % 7],
  ];

  // Calculate interval distances
  const third = (intervals[1] - intervals[0] + 12) % 12;
  const fifth = (intervals[2] - intervals[0] + 12) % 12;

  // Determine quality based on intervals
  let quality: ChordQuality;

  if (third === 4 && fifth === 7) {
    quality = extensions ? 'maj7' : 'maj';
  } else if (third === 3 && fifth === 7) {
    quality = extensions ? 'min7' : 'min';
  } else if (third === 3 && fifth === 6) {
    quality = extensions ? 'min7b5' : 'dim';
  } else if (third === 4 && fifth === 8) {
    quality = 'aug';
  } else {
    quality = extensions ? 'dom7' : 'maj'; // Default
  }

  // Special case: V chord in major/minor should be dominant
  if (degree === 5 && (scale.mode === 'major' || scale.mode === 'minor')) {
    quality = extensions ? 'dom7' : 'maj';
  }

  return { root, quality };
}

/**
 * Get all parallel modes for modal interchange
 */
export function getParallelModes(root: NoteName): Scale[] {
  return (['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'locrian'] as Mode[]).map(mode => ({
    root,
    mode,
    intervals: MODE_INTERVALS[mode],
  }));
}

/**
 * Transpose a note by semitones
 */
export function transposeNote(note: NoteName, semitones: number): NoteName {
  const value = NOTE_VALUES[note];
  const newValue = (value + semitones + 12) % 12;
  return NOTES[newValue];
}

/**
 * Get tritone substitution (for dominant chords)
 */
export function getTritoneSubstitution(root: NoteName): NoteName {
  return transposeNote(root, 6); // Tritone = 6 semitones
}

/**
 * Get secondary dominant (V7 of target chord)
 */
export function getSecondaryDominant(targetRoot: NoteName): { root: NoteName; quality: ChordQuality } {
  // V of target = perfect 5th above target
  const dominantRoot = transposeNote(targetRoot, 7);
  return { root: dominantRoot, quality: 'dom7' };
}

/**
 * Calculate voice leading distance between two sets of notes
 * Lower is better (smoother voice leading)
 */
export function voiceLeadingDistance(notes1: number[], notes2: number[]): number {
  // Simple approach: sum of absolute differences
  // This works for chords of the same size
  if (notes1.length !== notes2.length) {
    return 1000; // Penalty for different sizes
  }

  // Try all permutations and find the one with minimal motion
  let minDistance = Infinity;

  const permute = (arr: number[], start: number = 0): void => {
    if (start === arr.length - 1) {
      const distance = arr.reduce((sum, note, i) => sum + Math.abs(note - notes1[i]), 0);
      minDistance = Math.min(minDistance, distance);
      return;
    }

    for (let i = start; i < arr.length; i++) {
      [arr[start], arr[i]] = [arr[i], arr[start]];
      permute(arr, start + 1);
      [arr[start], arr[i]] = [arr[i], arr[start]];
    }
  };

  permute([...notes2]);
  return minDistance;
}

/**
 * Find the best voicing (inversion + octave placement) for smooth voice leading
 */
export function optimizeVoicing(
  previousNotes: number[],
  targetRoot: number,
  targetIntervals: number[]
): number[] {
  const baseNotes = targetIntervals.map(interval => targetRoot + interval);

  // Try different inversions and octave shifts
  let bestNotes = baseNotes;
  let bestDistance = voiceLeadingDistance(previousNotes, baseNotes);

  // Try inversions (moving bass note up an octave)
  for (let inv = 0; inv < targetIntervals.length; inv++) {
    const inverted = [...baseNotes];
    for (let i = 0; i < inv; i++) {
      inverted[i] += 12; // Move up an octave
    }
    inverted.sort((a, b) => a - b);

    // Try slight octave adjustments
    for (let octaveShift = -1; octaveShift <= 1; octaveShift++) {
      const shifted = inverted.map(n => n + (octaveShift * 12));
      const distance = voiceLeadingDistance(previousNotes, shifted);

      if (distance < bestDistance) {
        bestDistance = distance;
        bestNotes = shifted;
      }
    }
  }

  return bestNotes;
}
