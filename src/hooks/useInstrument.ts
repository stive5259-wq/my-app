import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getInstrumentId,
  getInstrumentOptions,
  setInstrumentId as persistInstrumentId,
  subscribe,
} from '../state/audioState';
import {
  DEFAULT_INSTRUMENT_ID,
  type InstrumentId,
  preloadInstrument,
} from '../audio/instruments';

interface UseInstrumentResult {
  instrumentId: InstrumentId;
  options: { id: InstrumentId; label: string }[];
  loadingId: InstrumentId | null;
  error: string | null;
  clearError: () => void;
  selectInstrument: (id: InstrumentId) => Promise<void>;
}

export function useInstrument(): UseInstrumentResult {
  const [instrumentId, setInstrumentId] = useState<InstrumentId>(() => getInstrumentId());
  const [loadingId, setLoadingId] = useState<InstrumentId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribe(nextId => {
      setInstrumentId(nextId);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    let mounted = true;
    const initialId = getInstrumentId();

    const runBootstrap = async () => {
      if (initialId === DEFAULT_INSTRUMENT_ID) {
        return;
      }

      setLoadingId(initialId);
      try {
        await preloadInstrument(initialId);
      } catch (err) {
        if (!mounted) return;
        console.error('Failed to preload instrument from storage', err);
        setError('Unable to load saved instrument. Reverting to Synth.');
        persistInstrumentId(DEFAULT_INSTRUMENT_ID);
      } finally {
        if (mounted) {
          setLoadingId(null);
        }
      }
    };

    runBootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const options = useMemo(() => getInstrumentOptions(), []);

  const selectInstrument = useCallback(async (id: InstrumentId) => {
    setLoadingId(id);
    try {
      await preloadInstrument(id);
      persistInstrumentId(id);
      setError(null);
    } catch (err) {
      console.error(`Failed to load instrument ${id}`, err);
      setError('Unable to load Grand Piano. Falling back to Synth.');
      persistInstrumentId(DEFAULT_INSTRUMENT_ID);
    } finally {
      setLoadingId(null);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    instrumentId,
    options,
    loadingId,
    error,
    clearError,
    selectInstrument,
  };
}
