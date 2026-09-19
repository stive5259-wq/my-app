# DropForge 1.0.3 — full stem pack

Small, low-risk output upgrade layered on the 1.0.2 reliability build.

Every new job now exposes the complete Demucs four-stem output for the selected
16-bar section:

- drums_16bar.wav
- bass_16bar.wav
- vocals_16bar.wav
- other_16bar.wav

The UI includes direct download links and quick browser previews for Vocals and Other.
The existing Drums + Bass preview remains unchanged.

"Other" is Demucs' broad remaining-content stem: synths, chords, leads, stabs,
effects, guitars/keys and other non-vocal/non-drum/non-bass material can all land
there. It should not be described as instrument-by-instrument separation.

The Demucs stage cache key is versioned to require all four stems, so the first run
after updating can rerun separation once. Subsequent identical sections can reuse it.
