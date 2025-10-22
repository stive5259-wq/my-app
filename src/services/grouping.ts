import type { Progression } from '../core/generator';

export type NoteEvent = {
  midi: number;
  startBeats: number;
  durationBeats: number;
};

export type TiePlan = {
  sustainPCsGlobal: number[];
  sustainNextPCs: Map<number, number[]>;
};

const MAX_TIES = 2;
const BEATS_PER_CHORD_DEFAULT = 4;

const pitchClass = (midi: number) => ((midi % 12) + 12) % 12;

function intersectPitchClasses(a: number[], b: number[]): number[] {
  const setB = new Set(b.map(pitchClass));
  return Array.from(new Set(a.map(pitchClass))).filter(pc => setB.has(pc));
}

function nearestSemitonePairs(a: number[], b: number[], maxDiff = 1): [number, number][] {
  const pairs: [number, number][] = [];
  for (const noteA of a) {
    let best: number | null = null;
    let bestDiff = Infinity;
    for (const noteB of b) {
      const diff = Math.abs(noteA - noteB);
      if (diff < bestDiff && diff <= maxDiff) {
        best = noteB;
        bestDiff = diff;
      }
    }
    if (best !== null) {
      pairs.push([noteA, best]);
    }
  }
  return pairs;
}

function mostFrequentPitchClasses(chords: number[][], limit = MAX_TIES): number[] {
  const frequency = new Map<number, number>();
  chords.forEach(notes => {
    notes.forEach(midi => {
      const pc = pitchClass(midi);
      frequency.set(pc, (frequency.get(pc) ?? 0) + 1);
    });
  });
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([pc]) => pc);
}

export function computeTiePlan(prog: Progression, groupNext: boolean[], groupAll: boolean): TiePlan {
  const chords = prog.chords.map(ch => ch.notes.slice());
  const plan: TiePlan = {
    sustainPCsGlobal: [],
    sustainNextPCs: new Map(),
  };

  if (groupAll && chords.length > 0) {
    const common = chords.reduce<Set<number>>((acc, notes, index) => {
      const pcs = new Set(notes.map(pitchClass));
      if (index === 0) return new Set(pcs);
      return new Set(Array.from(acc).filter(pc => pcs.has(pc)));
    }, new Set<number>());

    let globalPCs = Array.from(common);
    if (globalPCs.length === 0) {
      globalPCs = mostFrequentPitchClasses(chords);
    }
    plan.sustainPCsGlobal = globalPCs.slice(0, MAX_TIES);
  }

  for (let i = 0; i < chords.length - 1; i++) {
    if (!groupNext[i]) continue;
    const pcs = intersectPitchClasses(chords[i], chords[i + 1]).slice(0, MAX_TIES);
    if (pcs.length > 0) {
      plan.sustainNextPCs.set(i, pcs);
      continue;
    }
    const pairs = nearestSemitonePairs(chords[i], chords[i + 1]).slice(0, MAX_TIES);
    if (pairs.length > 0) {
      plan.sustainNextPCs.set(i, pairs.map(([note]) => pitchClass(note)));
    }
  }

  return plan;
}

export function computeNoteEvents(prog: Progression, groupNext: boolean[], groupAll: boolean): NoteEvent[] {
  const plan = computeTiePlan(prog, groupNext, groupAll);
  const events: NoteEvent[] = [];

  const beatsPerChord = prog.chords.map(ch => ch.durationBeats || BEATS_PER_CHORD_DEFAULT);
  const totalBeats = beatsPerChord.reduce((sum, beats) => sum + beats, 0);

  const globallySustainedPCs = new Set<number>();
  if (groupAll && prog.chords.length > 0) {
    for (const midi of prog.chords[0].notes) {
      const pc = pitchClass(midi);
      if (plan.sustainPCsGlobal.includes(pc)) {
        globallySustainedPCs.add(pc);
        events.push({ midi, startBeats: 0, durationBeats: totalBeats });
      }
    }
  }

  let cursorBeats = 0;
  for (let i = 0; i < prog.chords.length; i++) {
    const chord = prog.chords[i];
    const chordBeats = beatsPerChord[i];
    const forwardTies = new Set(plan.sustainNextPCs.get(i) || []);
    const backwardTies = new Set(plan.sustainNextPCs.get(i - 1) || []);

    chord.notes.forEach(midi => {
      const pc = pitchClass(midi);

      if (groupAll && globallySustainedPCs.has(pc) && i > 0) {
        return;
      }

      if (backwardTies.has(pc)) {
        return;
      }

      let duration = chordBeats;
      if (forwardTies.has(pc) && i < prog.chords.length - 1) {
        duration += beatsPerChord[i + 1];
      }

      events.push({ midi, startBeats: cursorBeats, durationBeats: duration });
    });

    cursorBeats += chordBeats;
  }

  return events;
}

export const __groupingDebug = {
  computeTiePlan,
  computeNoteEvents,
};
