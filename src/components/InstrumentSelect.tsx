import type { InstrumentId } from '../audio/instruments';

interface InstrumentSelectProps {
  instrumentId: InstrumentId;
  options: { id: InstrumentId; label: string }[];
  loadingId: InstrumentId | null;
  error: string | null;
  onSelect: (id: InstrumentId) => void;
  onClearError: () => void;
}

export function InstrumentSelect({
  instrumentId,
  options,
  loadingId,
  error,
  onSelect,
  onClearError,
}: InstrumentSelectProps) {
  return (
    <div style={{ marginBottom: '1rem', position: 'relative' }}>
      <label
        htmlFor="instrument-select"
        style={{ marginRight: '0.5rem', color: '#ccc', fontSize: '0.9rem' }}
      >
        Instrument:
      </label>
      <select
        id="instrument-select"
        data-testid="instrument-select"
        value={instrumentId}
        onChange={(event) => onSelect(event.target.value as InstrumentId)}
        disabled={Boolean(loadingId)}
        style={{
          padding: '0.5rem',
          borderRadius: '4px',
          backgroundColor: '#2a2a2a',
          color: '#eee',
          border: '1px solid #444',
          minWidth: '180px',
        }}
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {loadingId && (
        <span
          data-testid="instrument-loading"
          style={{ marginLeft: '0.75rem', color: '#888', fontSize: '0.85rem' }}
        >
          Loading…
        </span>
      )}
      {error && (
        <div
          role="status"
          data-testid="instrument-error"
          style={{
            position: 'absolute',
            top: '2.5rem',
            left: 0,
            backgroundColor: '#3a1f1f',
            color: '#ffb3b3',
            padding: '0.5rem 0.75rem',
            borderRadius: '4px',
            border: '1px solid #552222',
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center',
          }}
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={onClearError}
            style={{
              background: 'transparent',
              color: '#ffb3b3',
              border: '1px solid #ffb3b3',
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
