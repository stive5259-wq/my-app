import { useState, useEffect, useRef } from 'react';
import { generateProgression, smartSwap, getChordDisplayName, type Progression, type SwapMode } from './core/generator';
import type { NoteName, Mode } from './core/theory';
import { AudioPlayer } from './services/AudioPlayer';
import { Controls } from './components/Controls';
import { ProgressionDisplay } from './components/ProgressionDisplay';
import { PianoRoll } from './components/PianoRoll';

type AppState = 'idle' | 'generating' | 'ready' | 'playing' | 'error';

const KEYS: NoteName[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const MODES: Mode[] = ['major', 'minor', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];

function App() {
  const [state, setState] = useState<AppState>('idle');
  const [progression, setProgression] = useState<Progression | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [swapCount, setSwapCount] = useState(0);
  const [swapMode, setSwapMode] = useState<SwapMode>('harmony');
  const [selectedKey, setSelectedKey] = useState<NoteName>('C');
  const [selectedMode, setSelectedMode] = useState<Mode>('major');
  const [currentPlayingChord, setCurrentPlayingChord] = useState<number>(-1);
  const audioPlayerRef = useRef<AudioPlayer>(new AudioPlayer());

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

  const handlePlay = () => {
    if (!progression || state !== 'ready') return;

    setState('playing');
    setCurrentPlayingChord(0);
    audioPlayerRef.current.play(
      progression,
      () => {
        setState('ready');
        setCurrentPlayingChord(-1);
      },
      (chordIndex) => {
        setCurrentPlayingChord(chordIndex);
      }
    );
  };

  const handleStop = () => {
    if (state !== 'playing') return;

    audioPlayerRef.current.stop();
    setState('ready');
    setCurrentPlayingChord(-1);
  };

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

  const handleSpaceKey = (event: KeyboardEvent) => {
    // Only handle Space if not focused on an input element
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return;
    }

    if (event.code === 'Space') {
      event.preventDefault();

      if (state === 'ready' && progression) {
        handlePlay();
      } else if (state === 'playing') {
        handleStop();
      }
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleSpaceKey);
    return () => {
      window.removeEventListener('keydown', handleSpaceKey);
      // Cleanup audio on unmount
      audioPlayerRef.current.stop();
    };
  }, [state, progression]);

  return (
    <div>
      <h1>Chord Bloom</h1>
      <p style={{ color: '#888', fontSize: '0.9rem', marginTop: '-0.5rem' }}>
        Smart Swap Chord Generator
      </p>

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
        onPlay={handlePlay}
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

      <ProgressionDisplay
        progression={progression}
        onSwapChord={state === 'ready' ? handleSwapChord : undefined}
        getDisplayName={getChordDisplayName}
        currentPlayingChord={state === 'playing' ? currentPlayingChord : -1}
      />
      <PianoRoll progression={progression} />
    </div>
  );
}

export default App;
