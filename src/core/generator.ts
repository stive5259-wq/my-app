import {
  type NoteName,
  type ChordQuality,
  type Mode,
  type Scale,
  NOTE_VALUES,
  MODE_INTERVALS,
  CHORD_QUALITIES,
  getDiatonicChord,
  getParallelModes,
  getTritoneSubstitution,
  getSecondaryDominant,
  optimizeVoicing,
} from './theory';

// Core types for chord progression
export interface Chord {
  root: NoteName;
  quality: ChordQuality;
  octave: number;
  notes: number[]; // MIDI note numbers
  durationBeats: number;
  function?: string; // Roman numeral function (I, ii, V, etc.)
}

export interface Progression {
  chords: Chord[];
  tempoBpm: number;
  key: NoteName;
  mode: Mode;
}

export type SwapMode = 'harmony' | 'voicing';

/**
 * Converts a chord to MIDI notes using the theory engine
 */
function chordToMidi(root: NoteName, quality: ChordQuality, octave: number): number[] {
  const rootMidi = (octave + 1) * 12 + NOTE_VALUES[root];
  const intervals = CHORD_QUALITIES[quality].intervals;
  return intervals.map(interval => rootMidi + interval);
}

/**
 * Get display name for a chord
 */
export function getChordDisplayName(chord: Chord): string {
  const qualityDisplay = CHORD_QUALITIES[chord.quality].displayName;
  return `${chord.root}${qualityDisplay}`;
}

/**
 * Generates a progression in a given key and mode
 */
export function generateProgression(key: NoteName = 'C', mode: Mode = 'major'): Progression {
  const scale: Scale = {
    root: key,
    mode,
    intervals: MODE_INTERVALS[mode],
  };

  // Generate a I - V - vi - IV progression (very common in EDM/House)
  const degrees = [1, 5, 6, 4];
  const chords: Chord[] = [];

  let previousNotes: number[] | null = null;

  for (const degree of degrees) {
    const { root, quality } = getDiatonicChord(scale, degree, true); // Use 7th chords
    const baseNotes = chordToMidi(root, quality, 4);

    // Apply voice leading if we have a previous chord
    const notes: number[] = previousNotes
      ? optimizeVoicing(previousNotes, (4 + 1) * 12 + NOTE_VALUES[root], CHORD_QUALITIES[quality].intervals)
      : baseNotes;

    chords.push({
      root,
      quality,
      octave: 4,
      notes,
      durationBeats: 4,
      function: `${degree}`,
    });

    previousNotes = notes;
  }

  return {
    chords,
    tempoBpm: 120,
    key,
    mode,
  };
}

/**
 * SMART SWAP ENGINE
 *
 * Core Principle 1: Intelligent Randomness
 * - Builds a pool of valid substitutions
 * - Randomly selects one
 *
 * Core Principle 2: Algorithmic Voice Leading
 * - Optimizes voicing for minimal motion
 *
 * Core Principle 3: Context-Aware Harmony
 * - Uses tonal/modal analysis
 */
export function smartSwap(
  progression: Progression,
  chordIndex: number,
  mode: SwapMode = 'harmony',
  seed: number = Date.now()
): Chord {
  const chord = progression.chords[chordIndex];
  const previousNotes = chordIndex > 0 ? progression.chords[chordIndex - 1].notes : null;
  const nextChord = chordIndex < progression.chords.length - 1 ? progression.chords[chordIndex + 1] : null;

  let substitutionPool: Array<{ root: NoteName; quality: ChordQuality }> = [];

  if (mode === 'harmony') {
    // BUILD HARMONY SUBSTITUTION POOL
    substitutionPool = buildHarmonySubstitutions(chord, progression, nextChord);
  } else {
    // BUILD VOICING SUBSTITUTION POOL
    substitutionPool = buildVoicingSubstitutions(chord);
  }

  // INTELLIGENT RANDOMNESS: Randomly select from pool
  const randomIndex = Math.abs(seed) % substitutionPool.length;
  const selected = substitutionPool[randomIndex];

  // ALGORITHMIC VOICE LEADING: Optimize voicing
  const baseNotes = chordToMidi(selected.root, selected.quality, chord.octave);
  const optimizedNotes = previousNotes
    ? optimizeVoicing(previousNotes, (chord.octave + 1) * 12 + NOTE_VALUES[selected.root], CHORD_QUALITIES[selected.quality].intervals)
    : baseNotes;

  return {
    root: selected.root,
    quality: selected.quality,
    octave: chord.octave,
    notes: optimizedNotes,
    durationBeats: chord.durationBeats,
    function: chord.function,
  };
}

/**
 * Build pool of harmony substitutions (CONTEXT-AWARE HARMONY)
 */
function buildHarmonySubstitutions(
  chord: Chord,
  progression: Progression,
  nextChord: Chord | null
): Array<{ root: NoteName; quality: ChordQuality }> {
  const pool: Array<{ root: NoteName; quality: ChordQuality }> = [];
  const scale: Scale = { root: progression.key, mode: progression.mode, intervals: MODE_INTERVALS[progression.mode] };

  // 1. TONAL SUBSTITUTION
  // Get diatonic chords with same function
  const chordFunction = chord.function ? parseInt(chord.function) : 1;

  // Tonic substitutes (I, iii, vi)
  if ([1, 3, 6].includes(chordFunction)) {
    [1, 3, 6].forEach(degree => {
      const sub = getDiatonicChord(scale, degree, true);
      pool.push(sub);
    });
  }

  // Subdominant substitutes (ii, IV)
  if ([2, 4].includes(chordFunction)) {
    [2, 4].forEach(degree => {
      const sub = getDiatonicChord(scale, degree, true);
      pool.push(sub);
    });
  }

  // Dominant substitutes (V, vii)
  if ([5, 7].includes(chordFunction)) {
    [5, 7].forEach(degree => {
      const sub = getDiatonicChord(scale, degree, true);
      pool.push(sub);
    });
  }

  // 2. MODAL INTERCHANGE
  // Borrow from parallel modes
  const parallelModes = getParallelModes(progression.key);
  parallelModes.forEach(parallelScale => {
    if (parallelScale.mode !== progression.mode) {
      const borrowed = getDiatonicChord(parallelScale, chordFunction, true);
      pool.push(borrowed);
    }
  });

  // 3. TRITONE SUBSTITUTION
  // If chord is dominant (has dom7, dom9, etc. quality)
  if (chord.quality.startsWith('dom')) {
    const tritoneRoot = getTritoneSubstitution(chord.root);
    pool.push({ root: tritoneRoot, quality: chord.quality });
  }

  // 4. SECONDARY DOMINANTS
  // If there's a next chord, add V7 of that chord
  if (nextChord) {
    const secondaryDom = getSecondaryDominant(nextChord.root);
    pool.push(secondaryDom);
    // Also add tritone sub of secondary dominant
    const tritoneRoot = getTritoneSubstitution(secondaryDom.root);
    pool.push({ root: tritoneRoot, quality: 'dom7' });
  }

  // Remove duplicates and current chord
  const unique = pool.filter((sub, index, self) =>
    index === self.findIndex(s => s.root === sub.root && s.quality === sub.quality) &&
    !(sub.root === chord.root && sub.quality === chord.quality)
  );

  return unique.length > 0 ? unique : [{ root: chord.root, quality: chord.quality }];
}

/**
 * Build pool of voicing substitutions
 */
function buildVoicingSubstitutions(
  chord: Chord
): Array<{ root: NoteName; quality: ChordQuality }> {
  const pool: Array<{ root: NoteName; quality: ChordQuality }> = [];

  // Keep same root, vary quality
  const root = chord.root;

  // Determine base quality type
  const isMinor = chord.quality.includes('min') || chord.quality === 'dim';
  const isDominant = chord.quality.includes('dom');
  const isMajor = !isMinor && !isDominant;

  if (isMajor) {
    // Major variations
    pool.push(
      { root, quality: 'maj' },
      { root, quality: 'maj7' },
      { root, quality: 'maj9' },
      { root, quality: 'maj13' }
    );
  } else if (isMinor) {
    // Minor variations
    pool.push(
      { root, quality: 'min' },
      { root, quality: 'min7' },
      { root, quality: 'min9' },
      { root, quality: 'min11' },
      { root, quality: 'min13' }
    );
  } else if (isDominant) {
    // Dominant variations with alterations
    pool.push(
      { root, quality: 'dom7' },
      { root, quality: 'dom7b9' },
      { root, quality: 'dom7#9' },
      { root, quality: 'dom13' }
    );
  }

  // Remove current chord
  const filtered = pool.filter(sub => sub.quality !== chord.quality);
  return filtered.length > 0 ? filtered : pool;
}

/**
 * Legacy swap function for backward compatibility
 */
export function swapChord(chord: Chord, seed: number): Chord {
  // Create a dummy progression context
  const dummyProgression: Progression = {
    chords: [chord],
    tempoBpm: 120,
    key: 'C',
    mode: 'major',
  };

  return smartSwap(dummyProgression, 0, 'harmony', seed);
}
