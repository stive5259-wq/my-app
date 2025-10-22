// Utilities for octave shifts and seeded voicing variation
export const MIN_MIDI = 36; // C2
export const MAX_MIDI = 96; // C7
export const MAX_SPAN = 24; // semitones

export function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

export function applyOctaveOffset(notes: number[], offset: number) {
  const shift = (offset | 0) * 12;
  return notes.map((n) => clamp(n + shift, MIN_MIDI, MAX_MIDI));
}

export function span(notes: number[]) {
  if (!notes.length) return 0;
  const lo = Math.min(...notes);
  const hi = Math.max(...notes);
  return hi - lo;
}

// Simple seeded voicing variation: jitter within close position; optional inversion swap
export function randomizeVoicing(base: number[], rng: () => number) {
  if (base.length === 0) return base.slice();
  let out = base.slice().sort((a, b) => a - b);
  const rot = Math.floor(rng() * out.length);
  out = out.slice(rot).concat(out.slice(0, rot));
  out = out.map((n) => clamp(n + Math.floor(rng() * 5) - 2, MIN_MIDI, MAX_MIDI));
  while (span(out) > MAX_SPAN) {
    const lo = Math.min(...out);
    const hi = Math.max(...out);
    out = out.map((n) => (n === lo ? n + 1 : n === hi ? n - 1 : n));
  }
  return out;
}
