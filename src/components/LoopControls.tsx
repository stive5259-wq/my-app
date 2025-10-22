type Props = {
  enabled: boolean;
  from: number;
  to: number;
  maxIndex: number;
  onToggle: () => void;
  onSetFrom: (n: number) => void;
  onSetTo: (n: number) => void;
};

export default function LoopControls(props: Props) {
  const { enabled, from, to, maxIndex, onToggle, onSetFrom, onSetTo } = props;
  const canUse = maxIndex >= 1;
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
      <label>
        <input
          type="checkbox"
          data-testid="loop-toggle"
          checked={enabled}
          onChange={onToggle}
          disabled={!canUse}
        />
        {' '}Loop
      </label>
      <label>
        From:
        <input
          data-testid="loop-from"
          type="number"
          min={0}
          max={maxIndex}
          value={from}
          onChange={(e) => onSetFrom(clamp(+e.target.value, 0, maxIndex))}
          disabled={!enabled}
        />
      </label>
      <label>
        To:
        <input
          data-testid="loop-to"
          type="number"
          min={from}
          max={maxIndex}
          value={to}
          onChange={(e) => onSetTo(clamp(+e.target.value, from, maxIndex))}
          disabled={!enabled}
        />
      </label>
      <span data-testid="loop-range" style={{ opacity: enabled ? 1 : 0.6 }}>
        Range: {enabled ? `${from}→${to}` : '—'}
      </span>
    </div>
  );
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
