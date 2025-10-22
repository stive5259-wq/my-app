import type { DragEvent } from 'react';
import type { Chord } from '../core/generator';

type LabeledChord = Chord & { displayName?: string };

type Props = {
  chords: LabeledChord[];
  playingIndex?: number | null;
  disabled?: boolean;
  onSwap?: (index: number) => void;
  onReorder?: (fromIndex: number, toIndex: number) => void;
  onCopy?: (index: number) => void;
  onPaste?: (index: number) => void;
  canPaste?: boolean;
  onAddAfter?: (index: number) => void;
};

function clampIndex(i: number, len: number) {
  return Math.max(0, Math.min(len - 1, i));
}

export default function ProgressionDisplay(props: Props) {
  const {
    chords,
    playingIndex = null,
    disabled = false,
    onSwap,
    onReorder,
    onCopy,
    onPaste,
    canPaste = false,
    onAddAfter,
  } = props;

  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    if (disabled) return;
    e.dataTransfer?.setData('text/plain', String(index));
    try {
      const img = document.createElement('div');
      img.style.width = '0px';
      img.style.height = '0px';
      document.body.appendChild(img);
      e.dataTransfer.setDragImage(img, 0, 0);
      setTimeout(() => document.body.removeChild(img), 0);
    } catch {
      // ignore drag image failures (not critical for UX)
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, toIndex: number) => {
    if (disabled) return;
    e.preventDefault();
    const fromData = e.dataTransfer?.getData('text/plain') ?? '';
    const fromIndex = clampIndex(parseInt(fromData, 10), chords.length);
    if (!Number.isFinite(fromIndex) || fromIndex === toIndex) return;
    onReorder?.(fromIndex, toIndex);
  };

  return (
    <div aria-label="Progression" data-testid="progression">
      {chords.map((ch, idx) => {
        const isPlaying = playingIndex === idx;
        const label = ch.displayName ?? `${ch.root}${ch.quality ?? ''}`;
        return (
          <div
            key={idx}
            role="button"
            data-testid="chord"
            aria-pressed={isPlaying ?? undefined}
            aria-label={`Chord ${idx + 1}`}
            draggable={!disabled}
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, idx)}
            onClick={() => !disabled && onSwap?.(idx)}
            style={{
              border: isPlaying ? '2px solid #2b6cb0' : '1px solid #ccc',
              padding: '8px',
              margin: '8px 0',
              borderRadius: 6,
              cursor: disabled ? 'not-allowed' : 'grab',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span data-testid={`chord-label-${idx}`}>
                {label}
              </span>
              {isPlaying && <small>NOW PLAYING</small>}
              {!isPlaying && <small>click to swap</small>}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                data-testid={`copy-${idx}`}
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onCopy?.(idx);
                }}
              >
                Copy
              </button>
              <button
                type="button"
                data-testid={`paste-${idx}`}
                disabled={disabled || !canPaste}
                onClick={(e) => {
                  e.stopPropagation();
                  onPaste?.(idx);
                }}
              >
                Paste
              </button>
              <button
                type="button"
                data-testid={`add-after-${idx}`}
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddAfter?.(idx);
                }}
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
