import type { Progression } from '../core/generator';

interface PianoRollProps {
  progression: Progression | null;
}

export function PianoRoll({ progression }: PianoRollProps) {
  if (!progression) {
    return null;
  }

  // Find the range of MIDI notes used
  const allNotes = progression.chords.flatMap(chord => chord.notes);
  const minNote = Math.min(...allNotes);
  const maxNote = Math.max(...allNotes);
  const noteRange = maxNote - minNote + 1;

  // Calculate total beats
  const totalBeats = progression.chords.reduce((sum, chord) => sum + chord.durationBeats, 0);

  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const getNoteLabel = (midiNote: number) => {
    const octave = Math.floor(midiNote / 12) - 1;
    const noteIndex = midiNote % 12;
    return `${noteNames[noteIndex]}${octave}`;
  };

  const isBlackKey = (midiNote: number) => {
    const noteIndex = midiNote % 12;
    return [1, 3, 6, 8, 10].includes(noteIndex); // C#, D#, F#, G#, A#
  };

  return (
    <div style={{ margin: '2rem 0' }}>
      <h3>Piano Roll</h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '60px 1fr',
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '8px',
        overflow: 'hidden',
        maxWidth: '100%',
      }}>
        {/* Note labels column */}
        <div style={{ borderRight: '1px solid #333' }}>
          {Array.from({ length: noteRange }, (_, i) => {
            const midiNote = maxNote - i;
            const isBlack = isBlackKey(midiNote);
            return (
              <div
                key={midiNote}
                style={{
                  height: '24px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  backgroundColor: isBlack ? '#2a2a2a' : '#1a1a1a',
                  borderBottom: '1px solid #333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  color: isBlack ? '#888' : '#ccc',
                }}
              >
                {getNoteLabel(midiNote)}
              </div>
            );
          })}
        </div>

        {/* Piano roll grid */}
        <div style={{ position: 'relative', minHeight: `${noteRange * 24}px` }}>
          {/* Grid lines */}
          {Array.from({ length: noteRange }, (_, i) => {
            const midiNote = maxNote - i;
            const isBlack = isBlackKey(midiNote);
            return (
              <div
                key={`line-${midiNote}`}
                style={{
                  position: 'absolute',
                  top: `${i * 24}px`,
                  left: 0,
                  right: 0,
                  height: '24px',
                  backgroundColor: isBlack ? '#222' : '#1a1a1a',
                  borderBottom: '1px solid #333',
                }}
              />
            );
          })}

          {/* Beat grid lines */}
          {Array.from({ length: totalBeats + 1 }, (_, i) => (
            <div
              key={`beat-${i}`}
              style={{
                position: 'absolute',
                left: `${(i / totalBeats) * 100}%`,
                top: 0,
                bottom: 0,
                width: '1px',
                backgroundColor: i % 4 === 0 ? '#555' : '#333',
              }}
            />
          ))}

          {/* Note blocks */}
          {progression.chords.map((chord, chordIndex) => {
            const startBeat = progression.chords
              .slice(0, chordIndex)
              .reduce((sum, c) => sum + c.durationBeats, 0);
            const leftPercent = (startBeat / totalBeats) * 100;
            const widthPercent = (chord.durationBeats / totalBeats) * 100;

            return chord.notes.map((midiNote, noteIndex) => {
              const rowIndex = maxNote - midiNote;
              return (
                <div
                  key={`${chordIndex}-${noteIndex}`}
                  style={{
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`,
                    top: `${rowIndex * 24 + 2}px`,
                    height: '20px',
                    backgroundColor: '#646cff',
                    border: '1px solid #535bf2',
                    borderRadius: '3px',
                    opacity: 0.8,
                  }}
                />
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}
