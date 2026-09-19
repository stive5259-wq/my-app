# DropForge 1.0.4 — Bass Evidence

This is the narrow bass-quality pass after the 1.0.3 four-stem release.

## What changes

- Preserve absolute bass MIDI register.
- Remove forced C1-C3 folding.
- Remove automatic estimated-key snapping from bass transcription.
- Keep Basic Pitch as the event-opportunity source.
- Add pYIN continuous F0 evidence.
- Reuse Basic Pitch's 3-bins-per-semitone contour output as an independent pitch cue.
- Group simultaneous octave/harmonic alternatives into one note opportunity.
- Score candidates using:
  - Basic Pitch event confidence
  - pYIN support
  - Basic Pitch contour support
  - event-local harmonic prominence
  - subharmonic / even-only penalties
- Only change the strongest Basic Pitch pitch when the evidence margin is sufficiently
  strong. Ambiguous cases deliberately keep the strongest Basic Pitch candidate.
- Emit:
  - bass_evidence.json
  - bass_evidence.svg

The SVG is a diagnostic piano-roll-style view:
raw Basic Pitch notes, fused notes, pYIN, Basic Pitch contour and kick positions.

## Intentionally NOT in this pass

- repetition auto-editing
- cross-stem bleed veto
- new sidechain classifier
- pitch-bend/glide MIDI export
- new neural F0 dependency

Those stay frozen so the octave/fundamental resolver can be evaluated independently.

## Controlled fixture

If the existing job `~/Music/DropForge/7b7acca2d452/bass_16bar.wav` exists, the
updater runs the 1.0.4 bass decoder directly on it without rerunning Demucs and writes:

- DropForge_Bass_1.0.4_EVIDENCE_VERIFY.mid
- bass_evidence_1.0.4_VERIFY.json
- bass_evidence_1.0.4_VERIFY.svg
