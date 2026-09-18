# DropForge 1.0.2 — reliability pass

This release fixes the empty-bass-MIDI failure found with the controlled
`130 G MIN Sun is Shining (Lovelee Dae)` test.

## Fixed

- Basic Pitch is no longer called with a minimum frequency below its native MIDI-21
  note matrix. DropForge now decodes the native model range, then filters MIDI events
  itself to the intended bass range.
- Suspicious zero-note bass results fail loudly instead of exporting a misleading
  successful empty MIDI.
- `diagnostics.json` records raw/filtered/clipped/final event counts and Basic Pitch
  activation statistics.
- `DropForge_Bass_RAW.mid` preserves the decoder result before harmonic/sidechain/grid
  cleanup.
- Overlapping same-pitch bass notes are normalized before conventional MIDI export to
  avoid DAW note-off ambiguity.
- Runtime logging is written to
  `~/Library/Application Support/DropForge/1.0.2/dropforge.log`.
- Content-addressed caching reuses the selected 16-bar structure and Demucs section
  stems on repeated runs.

## Regression protection

The automated suite now asserts that Basic Pitch frequency bounds are not passed into
v0.4.0 and checks the exact active-stem/zero-note contradiction that exposed this bug.
