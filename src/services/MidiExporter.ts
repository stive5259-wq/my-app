import type { Progression } from '../core/generator';

const TPQ = 480; // ticks per quarter note

function writeUint16(value: number): number[] {
  return [(value >> 8) & 0xff, value & 0xff];
}

function writeUint32(value: number): number[] {
  return [
    (value >> 24) & 0xff,
    (value >> 16) & 0xff,
    (value >> 8) & 0xff,
    value & 0xff,
  ];
}

function writeVarLen(value: number): number[] {
  let buffer = value & 0x7f;
  const out: number[] = [];
  while ((value >>= 7)) {
    buffer <<= 8;
    buffer |= ((value & 0x7f) | 0x80);
  }
  while (true) {
    out.push(buffer & 0xff);
    if (buffer & 0x80) {
      buffer >>= 8;
    } else {
      break;
    }
  }
  return out;
}

function tempoMetaEvent(tempoBpm: number): number[] {
  const bpm = tempoBpm || 120;
  const micros = Math.max(1, Math.round(60000000 / bpm));
  return [
    0x00, 0xff, 0x51, 0x03,
    (micros >> 16) & 0xff,
    (micros >> 8) & 0xff,
    micros & 0xff,
  ];
}

function emptyMidi(): Uint8Array {
  const header = [
    0x4d, 0x54, 0x68, 0x64, // MThd
    ...writeUint32(6),
    ...writeUint16(0),
    ...writeUint16(1),
    ...writeUint16(TPQ),
  ];
  const track = [
    0x4d, 0x54, 0x72, 0x6b, // MTrk
    ...writeUint32(4),
    0x00, 0xff, 0x2f, 0x00, // end of track
  ];
  return new Uint8Array([...header, ...track]);
}

export function progressionToMIDI(progression: Progression | null): Uint8Array {
  if (!progression || !progression.chords || progression.chords.length === 0) {
    return emptyMidi();
  }

  const events: number[] = [];
  events.push(...tempoMetaEvent(progression.tempoBpm || 120));

  const ticksPerBeat = TPQ;

  progression.chords.forEach((chord, chordIndex) => {
    const notes = chord.notes ?? [];
    if (notes.length === 0) {
      return;
    }
    const startDelta = chordIndex === 0 ? [0x00] : [0x00];
    notes.forEach((midi, idx) => {
      const delta = idx === 0 ? startDelta : [0x00];
      events.push(...delta, 0x90, midi & 0x7f, 0x50);
    });

    const durationBeats = Math.max(1, Math.round(chord.durationBeats || 4));
    const durationTicks = durationBeats * ticksPerBeat;

    notes.forEach((midi, idx) => {
      const delta = idx === 0 ? writeVarLen(durationTicks) : [0x00];
      events.push(...delta, 0x80, midi & 0x7f, 0x40);
    });
  });

  events.push(0x00, 0xff, 0x2f, 0x00); // end of track

  const header = [
    0x4d, 0x54, 0x68, 0x64,
    ...writeUint32(6),
    ...writeUint16(0),
    ...writeUint16(1),
    ...writeUint16(TPQ),
  ];
  const trackHeader = [
    0x4d, 0x54, 0x72, 0x6b,
    ...writeUint32(events.length),
  ];

  return new Uint8Array([...header, ...trackHeader, ...events]);
}

export function blobFromProgression(progression: Progression | null): Blob {
  const data = progressionToMIDI(progression);
  const copy = new Uint8Array(data.length);
  copy.set(data);
  return new Blob([copy], { type: 'audio/midi' });
}

export function triggerDownload(blob: Blob, filename = 'progression.mid'): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 0);
}
