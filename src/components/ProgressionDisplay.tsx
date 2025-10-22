import type { Progression } from '../core/generator';

interface ProgressionDisplayProps {
  progression: Progression | null;
  onSwapChord?: (index: number) => void;
}

export function ProgressionDisplay({ progression, onSwapChord }: ProgressionDisplayProps) {
  if (!progression) {
    return null;
  }

  return (
    <div>
      <h2>Progression ({progression.tempoBpm} BPM)</h2>
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
              {chord.root}{chord.quality}
            </div>
            {onSwapChord && (
              <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '0.25rem' }}>
                click to swap
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
