import {
  DEFAULT_INSTRUMENT_ID,
  type InstrumentId,
  isInstrumentId,
  listInstrumentOptions,
} from '../audio/instruments';

const STORAGE_KEY = 'audio.instrumentId';

type Listener = (instrumentId: InstrumentId) => void;

let currentInstrumentId: InstrumentId = readInitialInstrumentId();
const listeners = new Set<Listener>();

function readInitialInstrumentId(): InstrumentId {
  if (typeof window === 'undefined') {
    return DEFAULT_INSTRUMENT_ID;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && isInstrumentId(stored)) {
      return stored;
    }
  } catch {
    // localStorage may be unavailable
  }

  return DEFAULT_INSTRUMENT_ID;
}

function persistInstrumentId(id: InstrumentId): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // Ignore persistence errors (e.g., private mode)
  }
}

export function getInstrumentId(): InstrumentId {
  return currentInstrumentId;
}

export function setInstrumentId(id: InstrumentId): void {
  if (currentInstrumentId === id) {
    return;
  }

  currentInstrumentId = id;
  persistInstrumentId(id);
  listeners.forEach(listener => listener(currentInstrumentId));
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getInstrumentOptions() {
  return listInstrumentOptions();
}

export function resetAudioStateForTests(): void {
  currentInstrumentId = DEFAULT_INSTRUMENT_ID;
  listeners.clear();
}

export const AUDIO_STORAGE_KEY = STORAGE_KEY;
