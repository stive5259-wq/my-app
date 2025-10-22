import { createGrandPianoSampler, preloadGrandPianoSamples } from './sampler';
import type { ScheduleNoteOptions, ScheduledNoteHandle } from './types';
import { midiToFrequency } from './util';

export type InstrumentId = 'synth' | 'grand-piano';

export interface InstrumentOption {
  id: InstrumentId;
  label: string;
}

interface InstrumentDefinition {
  id: InstrumentId;
  label: string;
  preload: () => Promise<void>;
  createPlayer: (context: AudioContext) => Promise<InstrumentPlayer>;
}

export interface InstrumentPlayer {
  id: InstrumentId;
  label: string;
  scheduleNote: (midi: number, startTime: number, options: ScheduleNoteOptions) => ScheduledNoteHandle;
}

export const DEFAULT_INSTRUMENT_ID: InstrumentId = 'synth';

const instrumentDefinitions: Record<InstrumentId, InstrumentDefinition> = {
  synth: {
    id: 'synth',
    label: 'Synth',
    preload: async () => {
      // nothing to preload for the default synth
    },
    createPlayer: async (context: AudioContext) => new SynthInstrument(context),
  },
  'grand-piano': {
    id: 'grand-piano',
    label: 'Grand Piano',
    preload: preloadGrandPianoSamples,
    createPlayer: async (context: AudioContext) => {
      const sampler = await createGrandPianoSampler(context);
      return new SamplerInstrument('Grand Piano', sampler);
    },
  },
};

const preloadCache = new Map<InstrumentId, Promise<void>>();
const playerCache = new WeakMap<AudioContext, Map<InstrumentId, Promise<InstrumentPlayer>>>();

export function listInstrumentOptions(): InstrumentOption[] {
  return Object.values(instrumentDefinitions).map(({ id, label }) => ({ id, label }));
}

export async function preloadInstrument(id: InstrumentId): Promise<void> {
  const definition = instrumentDefinitions[id];
  if (!definition) {
    throw new Error(`Unknown instrument: ${id}`);
  }

  let promise = preloadCache.get(id);
  if (!promise) {
    promise = definition.preload().catch(error => {
      preloadCache.delete(id);
      throw error;
    });
    preloadCache.set(id, promise);
  }

  await promise;
}

export async function getInstrumentPlayer(
  context: AudioContext,
  id: InstrumentId
): Promise<InstrumentPlayer> {
  const definition = instrumentDefinitions[id];
  if (!definition) {
    throw new Error(`Unknown instrument: ${id}`);
  }

  await preloadInstrument(id);

  let contextCache = playerCache.get(context);
  if (!contextCache) {
    contextCache = new Map();
    playerCache.set(context, contextCache);
  }

  let promise = contextCache.get(id);
  if (!promise) {
    promise = definition.createPlayer(context).catch(error => {
      contextCache?.delete(id);
      throw error;
    });
    contextCache.set(id, promise);
  }

  return promise;
}

class SynthInstrument implements InstrumentPlayer {
  id: InstrumentId = 'synth';
  label = 'Synth';

  constructor(private readonly context: AudioContext) {}

  scheduleNote(midi: number, startTime: number, options: ScheduleNoteOptions): ScheduledNoteHandle {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const duration = options.duration;
    const voices = Math.max(1, options.voices);
    const maxGain = Math.min(0.3, 0.5 / voices);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(midiToFrequency(midi), startTime);

    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(maxGain, startTime + 0.01);
    gain.gain.setValueAtTime(maxGain * 0.8, startTime + Math.max(0.05, duration * 0.6));
    gain.gain.linearRampToValueAtTime(0.0001, startTime + duration + 0.1);

    oscillator.connect(gain);
    gain.connect(this.context.destination);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.1);

    return {
      stop: (when?: number) => {
        const stopTime = when ?? this.context.currentTime;
        try {
          gain.gain.cancelScheduledValues(stopTime);
          const current = gain.gain.value;
          gain.gain.setValueAtTime(current, stopTime);
          gain.gain.linearRampToValueAtTime(0.0001, stopTime + 0.05);
          oscillator.stop(stopTime + 0.05);
        } catch {
          // oscillator already stopped
        }
      },
    };
  }
}

class SamplerInstrument implements InstrumentPlayer {
  id: InstrumentId = 'grand-piano';

  constructor(
    public readonly label: string,
    private readonly sampler: {
      scheduleNote: (
        midi: number,
        startTime: number,
        options: ScheduleNoteOptions
      ) => ScheduledNoteHandle;
    }
  ) {}

  scheduleNote(midi: number, startTime: number, options: ScheduleNoteOptions): ScheduledNoteHandle {
    return this.sampler.scheduleNote(midi, startTime, options);
  }
}

export const __instrumentDebug = {
  preloadCacheSize(): number {
    return preloadCache.size;
  },
  reset(): void {
    preloadCache.clear();
  },
  definitions: instrumentDefinitions,
};

export function isInstrumentId(value: string): value is InstrumentId {
  return value === 'synth' || value === 'grand-piano';
}
