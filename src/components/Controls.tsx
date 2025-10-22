interface ControlsProps {
  state: 'idle' | 'generating' | 'ready' | 'playing' | 'error';
  onGenerate: () => void;
  onPlay: () => void;
  onStop: () => void;
  hasProgression: boolean;
}

export function Controls({ state, onGenerate, onPlay, onStop, hasProgression }: ControlsProps) {
  const isGenerateDisabled = state === 'generating';
  const isPlayDisabled = state === 'generating' || !hasProgression;

  return (
    <div className="controls">
      <button
        onClick={onGenerate}
        disabled={isGenerateDisabled}
      >
        {state === 'generating' ? 'Generating...' : 'Generate'}
      </button>

      {state === 'playing' ? (
        <button onClick={onStop}>Stop</button>
      ) : (
        <button onClick={onPlay} disabled={isPlayDisabled}>
          Play
        </button>
      )}
    </div>
  );
}
