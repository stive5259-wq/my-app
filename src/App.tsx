import { useState, useEffect, useRef } from 'react';
import { generateProgression, swapChord, type Progression } from './core/generator';
import { AudioPlayer } from './services/AudioPlayer';
import { Controls } from './components/Controls';
import { ProgressionDisplay } from './components/ProgressionDisplay';
import { PianoRoll } from './components/PianoRoll';

type AppState = 'idle' | 'generating' | 'ready' | 'playing' | 'error';

function App() {
  const [state, setState] = useState<AppState>('idle');
  const [progression, setProgression] = useState<Progression | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [swapCount, setSwapCount] = useState(0);
  const audioPlayerRef = useRef<AudioPlayer>(new AudioPlayer());

  const handleGenerate = () => {
    setState('generating');
    setError(null);

    // Simulate async generation with setTimeout
    setTimeout(() => {
      try {
        const prog = generateProgression();
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
    audioPlayerRef.current.play(progression, () => {
      setState('ready');
    });
  };

  const handleStop = () => {
    if (state !== 'playing') return;

    audioPlayerRef.current.stop();
    setState('ready');
  };

  const handleSwapChord = (index: number) => {
    if (!progression || state === 'playing') return;

    // Use swap count as seed for deterministic but varied swaps
    const newChord = swapChord(progression.chords[index], swapCount);
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
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
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
      <h1>Chord Generator</h1>

      <Controls
        state={state}
        onGenerate={handleGenerate}
        onPlay={handlePlay}
        onStop={handleStop}
        hasProgression={!!progression}
      />

      {error && (
        <div style={{ color: '#ff6b6b', margin: '1rem 0' }}>
          Error: {error}
        </div>
      )}

      <ProgressionDisplay
        progression={progression}
        onSwapChord={state === 'ready' ? handleSwapChord : undefined}
      />
      <PianoRoll progression={progression} />
    </div>
  );
}

export default App;
