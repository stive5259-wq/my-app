import type { Progression, Chord } from '../core/generator';

interface ProgressionDisplayProps {
  progression: Progression | null;
  onSwapChord?: (index: number) => void;
  getDisplayName?: (chord: Chord) => string;
}

export function ProgressionDisplay({ progression, onSwapChord, getDisplayName }: ProgressionDisplayProps) {
  if (!progression) {
    return null;
  }

  const displayChord = (chord: Chord) => {
    if (getDisplayName) {
      return getDisplayName(chord);
    }
    return `${chord.root}${chord.quality}`;
  };

  return (
    <div>
      <h2>Progression ({progression.tempoBpm} BPM)</h2>
      <div style={{ color: '#888', fontSize: '0.85rem', marginTop: '-0.5rem', marginBottom: '1rem' }}>
        {progression.key} {progression.mode.charAt(0).toUpperCase() + progression.mode.slice(1)}
      </div>
      <div className="chord-list">
        {progression.chords.map((chord, index) => (
          <div
            key={index}
            className="chord-item"
            onClick={() => onSwapChord?.(index)}
            style={{
              cursor: onSwapChord ? 'pointer' : 'default',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (onSwapChord) {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.borderColor = '#646cff';
              }
            }}
            onMouseLeave={(e) => {
              if (onSwapChord) {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.borderColor = '#333';
              }
            }}
          >
            <div className="chord-name">
              {displayChord(chord)}
            </div>
            {chord.function && (
              <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>
                {chord.function}
              </div>
            )}
            {onSwapChord && (
              <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '0.25rem' }}>
                click to swap
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
