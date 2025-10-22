import { useState, useEffect, useRef, useCallback } from 'react';
import { generateProgression, smartSwap, getChordDisplayName, type Progression, type SwapMode, type Chord } from './core/generator';
import type { NoteName, Mode } from './core/theory';
import { AudioPlayer } from './services/AudioPlayer';
import { Controls } from './components/Controls';
import ProgressionDisplay from './components/ProgressionDisplay';
import { PianoRoll } from './components/PianoRoll';
import { useInstrument } from './hooks/useInstrument';
import { InstrumentSelect } from './components/InstrumentSelect';

type AppState = 'idle' | 'generating' | 'ready' | 'playing' | 'error';

const KEYS: NoteName[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const MODES: Mode[] = ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];
const DEFAULT_KEY: NoteName = 'C';
const DEFAULT_MODE: Mode = 'minor';

function App() {
  const [state, setState] = useState<AppState>('idle');
  const [progression, setProgression] = useState<Progression | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [clipboardChord, setClipboardChord] = useState<Chord | null>(null);
  const [swapCount, setSwapCount] = useState(0);
  const [swapMode, setSwapMode] = useState<SwapMode>('harmony');
  const [selectedKey, setSelectedKey] = useState<NoteName>(DEFAULT_KEY);
  const [selectedMode, setSelectedMode] = useState<Mode>(DEFAULT_MODE);
  const [currentPlayingChord, setCurrentPlayingChord] = useState<number>(-1);
  const audioPlayerRef = useRef<AudioPlayer>(new AudioPlayer());
  const {
    instrumentId,
    options: instrumentOptions,
    loadingId: loadingInstrumentId,
    error: instrumentError,
    selectInstrument,
    clearError: clearInstrumentError,
  } = useInstrument();

  const handleGenerate = () => {
    setState('generating');
    setError(null);

    // Simulate async generation with setTimeout
    setTimeout(() => {
      try {
        const prog = generateProgression(selectedKey, selectedMode);
        setProgression(prog);
        setState('ready');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Generation failed');
        setState('error');
      }
    }, 100);
  };

  const handlePlay = useCallback(async () => {
    if (!progression || state !== 'ready') return;

    setState('playing');
    setCurrentPlayingChord(0);
    try {
      await audioPlayerRef.current.play(
        progression,
        instrumentId,
        () => {
          setState('ready');
          setCurrentPlayingChord(-1);
        },
        (chordIndex) => {
          setCurrentPlayingChord(chordIndex);
        }
      );
    } catch (err) {
      console.error('Playback failed', err);
      setError(err instanceof Error ? err.message : 'Playback failed');
      setState('error');
      setCurrentPlayingChord(-1);
    }
  }, [instrumentId, progression, state]);

  const handleStop = useCallback(() => {
    if (state !== 'playing') return;

    audioPlayerRef.current.stop();
    setState('ready');
    setCurrentPlayingChord(-1);
  }, [state]);

  const handleTestAudio = async () => {
    console.log('🔊 Testing audio with simple tone...');
    try {
      const ctx = new AudioContext();
      await ctx.resume();
      console.log('AudioContext state:', ctx.state);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.frequency.value = 440; // A4
      osc.type = 'sine';

      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
      gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.5);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.55);

      console.log('✅ Test tone scheduled!');

      setTimeout(() => {
        ctx.close();
        console.log('✅ Test complete');
      }, 600);
    } catch (err) {
      console.error('❌ Test audio failed:', err);
    }
  };

  const handleSwapChord = (index: number) => {
    if (!progression || state === 'playing') return;

    // Use smartSwap with current swap mode
    const newChord = smartSwap(progression, index, swapMode, swapCount);
    const newChords = [...progression.chords];
    newChords[index] = newChord;

    setProgression({
      ...progression,
      chords: newChords,
    });
    setSwapCount(swapCount + 1);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    setProgression((prev) => {
      if (!prev) return prev;
      const next = [...prev.chords];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { ...prev, chords: next };
    });
  };

  const handleCopy = (index: number) => {
    if (!progression) return;
    const chord = progression.chords[index];
    setClipboardChord(JSON.parse(JSON.stringify(chord)));
  };

  const handlePaste = (index: number) => {
    if (!progression || !clipboardChord) return;
    const cloned = JSON.parse(JSON.stringify(clipboardChord)) as Chord;
    setProgression((prev) => {
      if (!prev) return prev;
      const next = prev.chords.map((ch, idx) => (idx === index ? cloned : ch));
      return { ...prev, chords: next };
    });
  };

  const handleAddAfter = (index: number) => {
    if (!progression) return;
    const source = progression.chords[index];
    const clone = JSON.parse(JSON.stringify(source)) as Chord;
    setProgression((prev) => {
      if (!prev) return prev;
      const next = [...prev.chords];
      next.splice(index + 1, 0, clone);
      return { ...prev, chords: next };
    });
  };

  const handleSpaceKey = useCallback((event: KeyboardEvent) => {
    // Only handle Space if not focused on an input element
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();

      if (state === 'ready' && progression) {
        void handlePlay();
      } else if (state === 'playing') {
        handleStop();
      }
    }
  }, [handlePlay, handleStop, progression, state]);

  useEffect(() => {
    const player = audioPlayerRef.current;
    const onKeyDown = (event: KeyboardEvent) => handleSpaceKey(event);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      // Cleanup audio on unmount
      player.stop();
    };
  }, [handleSpaceKey]);

  const handlePlayClick = useCallback(() => {
    void handlePlay();
  }, [handlePlay]);

  return (
    <div>
      <h1>Chord Bloom</h1>
      <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '-0.5rem' }}>
        Smart Swap Chord Generator
      </p>

      <InstrumentSelect
        instrumentId={instrumentId}
        options={instrumentOptions}
        loadingId={loadingInstrumentId}
        error={instrumentError}
        onSelect={(id) => {
          void selectInstrument(id);
        }}
        onClearError={clearInstrumentError}
      />

      {/* Key & Mode Selection */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        justifyContent: 'center',
        margin: '1.5rem 0',
        flexWrap: 'wrap',
      }}>
        <div>
          <label style={{ marginRight: '0.5rem', color: '#ccc' }}>Key:</label>
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value as NoteName)}
            style={{
              padding: '0.5rem',
              borderRadius: '4px',
              backgroundColor: '#2a2a2a',
              color: '#ccc',
              border: '1px solid #444',
            }}
            disabled={state === 'generating'}
          >
            {KEYS.map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ marginRight: '0.5rem', color: '#ccc' }}>Mode:</label>
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value as Mode)}
            style={{
              padding: '0.5rem',
              borderRadius: '4px',
              backgroundColor: '#2a2a2a',
              color: '#ccc',
              border: '1px solid #444',
            }}
            disabled={state === 'generating'}
          >
            {MODES.map(mode => (
              <option key={mode} value={mode}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Controls
        state={state}
        onGenerate={handleGenerate}
        onPlay={handlePlayClick}
        onStop={handleStop}
        hasProgression={!!progression}
      />

      {/* Audio Test Button */}
      <div style={{ margin: '0.5rem 0' }}>
        <button
          onClick={handleTestAudio}
          style={{
            fontSize: '0.8rem',
            padding: '0.4rem 0.8rem',
            backgroundColor: '#2a2a2a',
            borderColor: '#555',
          }}
        >
          🔊 Test Audio (440 Hz beep)
        </button>
      </div>

      {/* Swap Mode Toggles */}
      {progression && (
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'center',
          margin: '1rem 0',
        }}>
          <button
            onClick={() => setSwapMode('harmony')}
            style={{
              backgroundColor: swapMode === 'harmony' ? '#646cff' : '#2a2a2a',
              borderColor: swapMode === 'harmony' ? '#535bf2' : '#444',
            }}
          >
            Change Harmony
          </button>
          <button
            onClick={() => setSwapMode('voicing')}
            style={{
              backgroundColor: swapMode === 'voicing' ? '#646cff' : '#2a2a2a',
              borderColor: swapMode === 'voicing' ? '#535bf2' : '#444',
            }}
          >
            Change Voicing
          </button>
        </div>
      )}

      {error && (
        <div style={{ color: '#ff6b6b', margin: '1rem 0' }}>
          Error: {error}
        </div>
      )}

      {progression && (
        <div style={{ color: '#bbb', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          {progression.key} {progression.mode.charAt(0).toUpperCase() + progression.mode.slice(1)} progression
        </div>
      )}

      {progression && (
        <ProgressionDisplay
          chords={progression.chords.map((ch) => ({ ...ch, displayName: getChordDisplayName(ch) }))}
          playingIndex={state === 'playing' ? currentPlayingChord : null}
          disabled={state === 'generating' || state === 'playing'}
          onSwap={state === 'ready' ? handleSwapChord : undefined}
          onReorder={state === 'ready' ? handleReorder : undefined}
          onCopy={state === 'ready' ? handleCopy : undefined}
          onPaste={state === 'ready' ? handlePaste : undefined}
          canPaste={!!clipboardChord}
          onAddAfter={state === 'ready' ? handleAddAfter : undefined}
        />
      )}
      <PianoRoll progression={progression} />
    </div>
  );
}

export default App;
