import type { ScheduledNoteHandle } from './types';
import { midiToFrequency } from './util';

interface SampleSpec {
  midi: number;
  url: string;
}

const GRAND_PIANO_SAMPLES: SampleSpec[] = [
  { midi: 60, url: '/samples/grand-piano/C4.mp3' },
  { midi: 64, url: '/samples/grand-piano/E4.mp3' },
  { midi: 67, url: '/samples/grand-piano/G4.mp3' },
];

const sampleBytesCache = new Map<string, Promise<ArrayBuffer>>();
let decodeCache = new WeakMap<AudioContext, Map<number, Promise<AudioBuffer>>>();
const fetchCountByUrl = new Map<string, number>();

async function fetchSampleBytes(url: string): Promise<ArrayBuffer> {
  let promise = sampleBytesCache.get(url);
  if (!promise) {
    promise = fetch(url).then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load sample: ${url}`);
      }
      fetchCountByUrl.set(url, (fetchCountByUrl.get(url) ?? 0) + 1);
      return response.arrayBuffer();
    });
    sampleBytesCache.set(url, promise);
  }
  return promise;
}

async function decodeSample(
  context: AudioContext,
  spec: SampleSpec,
  bytes: ArrayBuffer
): Promise<AudioBuffer> {
  let contextCache = decodeCache.get(context);
  if (!contextCache) {
    contextCache = new Map();
    decodeCache.set(context, contextCache);
  }

  let promise = contextCache.get(spec.midi);
  if (!promise) {
    // Copy the buffer because decodeAudioData may detach it.
    const copy = bytes.slice(0);
    promise = context.decodeAudioData(copy);
    contextCache.set(spec.midi, promise);
  }
  return promise;
}

export async function preloadGrandPianoSamples(): Promise<void> {
  await Promise.all(GRAND_PIANO_SAMPLES.map(spec => fetchSampleBytes(spec.url)));
}

export async function createGrandPianoSampler(context: AudioContext): Promise<GrandPianoSampler> {
  await preloadGrandPianoSamples();
  const buffers = new Map<number, AudioBuffer>();

  for (const spec of GRAND_PIANO_SAMPLES) {
    const bytes = await fetchSampleBytes(spec.url);
    const buffer = await decodeSample(context, spec, bytes);
    buffers.set(spec.midi, buffer);
  }

  return new GrandPianoSampler(context, buffers);
}

class GrandPianoSampler {
  constructor(
    private readonly context: AudioContext,
    private readonly buffers: Map<number, AudioBuffer>
  ) {}

  scheduleNote(
    midi: number,
    startTime: number,
    options: { duration: number; velocity?: number; voices: number }
  ): ScheduledNoteHandle {
    const { bufferMidi, buffer } = this.getNearestBuffer(midi);
    const playbackRate = midiToFrequency(midi) / midiToFrequency(bufferMidi);
    const gain = this.context.createGain();
    const source = this.context.createBufferSource();
    const duration = options.duration;
    const velocity = options.velocity ?? 0.9;
    const voiceGain = Math.min(0.7, velocity / Math.max(1, options.voices));
    const sustainTime = Math.max(0.05, duration * 0.6);
    const releaseTime = 0.3;

    source.buffer = buffer;
    source.playbackRate.setValueAtTime(playbackRate, startTime);
    source.connect(gain);
    gain.connect(this.context.destination);

    gain.gain.cancelScheduledValues(startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(voiceGain, startTime + 0.01);
    gain.gain.setValueAtTime(voiceGain * 0.75, startTime + sustainTime);
    gain.gain.linearRampToValueAtTime(0.0001, startTime + duration + releaseTime);

    source.start(startTime);
    source.stop(startTime + duration + releaseTime);

    return {
      stop: (when?: number) => {
        const stopTime = when ?? this.context.currentTime;
        try {
          gain.gain.cancelScheduledValues(stopTime);
          const currentValue = gain.gain.value;
          gain.gain.setValueAtTime(currentValue, stopTime);
          gain.gain.linearRampToValueAtTime(0.0001, stopTime + 0.05);
          source.stop(stopTime + 0.1);
        } catch {
          // node may already be stopped
        }
      },
    };
  }

  private getNearestBuffer(midi: number): { bufferMidi: number; buffer: AudioBuffer } {
    let nearestMidi = midi;
    let nearestBuffer = this.buffers.get(midi);

    if (!nearestBuffer) {
      let minDistance = Number.POSITIVE_INFINITY;
      for (const [bufferMidi, buffer] of this.buffers.entries()) {
        const distance = Math.abs(bufferMidi - midi);
        if (distance < minDistance) {
          minDistance = distance;
          nearestBuffer = buffer;
          nearestMidi = bufferMidi;
        }
      }
    }

    if (!nearestBuffer) {
      throw new Error(`No buffer available for midi note ${midi}`);
    }

    return { bufferMidi: nearestMidi, buffer: nearestBuffer };
  }
}

export const __samplerDebug = {
  getFetchCount(url: string): number {
    return fetchCountByUrl.get(url) ?? 0;
  },
  reset(): void {
    sampleBytesCache.clear();
    fetchCountByUrl.clear();
    decodeCache = new WeakMap();
  },
  sampleUrls: GRAND_PIANO_SAMPLES.map(spec => spec.url),
};
