Master App Document

1. Product Summary
App name: Smart Swap Generator
Goal: Generate harmonically rich progressions with deterministic theory validation.
Primary users: Producers and engineers experimenting with EDM/house chord flows.
Demo path: `pnpm dev` → open local Vite preview.

2. Current Capabilities (Atomic)
- FEAT-001: E2E skeleton (generate → play) — status: done
- FEAT-003: Deterministic theory + Smart Swap unit tests — status: done
- FEAT-004: Grand Piano instrument selection with cached samples — status: done
- FEAT-005: Chord arrange (drag, copy/paste, add) — status: done
- FEAT-006: Default startup key/mode = C minor — status: done
- FEAT-007: Export MIDI button — status: done
- FEAT-008A: UI grouping (Group→Next, Group All, TIED badges) — status: done
- FEAT-008B: Audio scheduler for grouping (ties) — status: done
- FEAT-009: Octave ± per chord, Seeded Randomize Voicing, and Loop Range — status: done

3. UX Map
Screens:
- ScreenName: states [empty, loading, error, data]

4. Architecture Overview
Client:
Runtime commands:
- `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm lint`
Key modules:
- src/core/theory.ts: Music theory utilities (interval math, substitutions, voice leading)
- src/core/generator.ts: Progression factory and Smart Swap engine
- tests/unit/theory.test.ts: Deterministic coverage for theory primitives
- tests/unit/generator.test.ts: Deterministic Smart Swap assertions
- tests/unit/grouping.test.ts: Tie planning + note-event scheduler assertions
- tests/unit/voicing.random.test.ts: Seeded voicing randomization bounds/span checks
- tests/unit/octaveOffset.test.ts: Octave offset clamp assertions
- tests/e2e/grouping-ui.test.tsx: UI acceptance for grouping toggles/badges
- tests/e2e/loop-ui.test.tsx: Loop range toggle/inputs
- src/services/grouping.ts: Tie planning and note-event scheduling for grouping
- src/services/rng.ts: Deterministic RNG helper for voicing
- src/services/voicingUtils.ts: Octave offset + seeded voicing helpers
- src/components/LoopControls.tsx: Loop enable/range UI
- src/services/MidiExporter.ts: Minimal MIDI writer and download helper
- src/audio/instruments.ts: Instrument registry, synth/piano scheduling, caching
- src/audio/sampler.ts: Grand Piano sample loading and playback wrappers
- src/hooks/useInstrument.ts: React hook for instrument persistence and preload
- src/components/InstrumentSelect.tsx: Instrument menu with status/error messaging
- src/components/ProgressionDisplay.tsx: Drag/drop, copy/paste, and add-after arrange controls
- tests/e2e/arrange.test.tsx: Acceptance coverage for drag reorder/copy/paste/add

5. Data and Contracts
Entities:
- TestCase { id: string }

6. Decisions (ADR index)
- ADR-0001: title

7. Open Risks
- Randomized Smart Swap outputs -> Mitigation: deterministic seeds exercised by Vitest
- HTML5 drag-and-drop edge cases across browsers -> Mitigation: rely on standard events, disable while playing

8. Roadmap (Next 3)
- FEAT-00X: title

9. Acceptance Status — FEAT-005
- Drag reorder: ✅ Reorders chords visually; playback follows new order in tests/e2e/arrange.test.tsx
- Copy/Paste: ✅ Copy + paste duplicates a chord label onto target
- Add After: ✅ Inserts cloned chord and increments chord count by one

10. Acceptance Status — FEAT-006
Default startup key/mode:
✅ Given the app just loaded, when the user clicks Generate without changing selectors, the rendered progression includes “C minor” (case-insensitive) as the key/mode (tests/e2e/default-key.test.tsx).

11. Acceptance Status — FEAT-007
Export MIDI:
✅ Given a generated progression (data), when the user clicks Export MIDI, a Blob of type `audio/midi` is created and download is triggered (tests/unit/midiExporter.test.ts, tests/e2e/midi-export.test.tsx).

12. Acceptance Status — FEAT-008A
UI grouping (no audio changes):
✅ Given data state, when **Group→Next** is toggled on chord 1, then chord 1 and 2 show a **TIED** badge (tests/e2e/grouping-ui.test.tsx).
✅ Given data state, when **Group All** is toggled on, then all chord tiles show **TIED** (tests/e2e/grouping-ui.test.tsx).
✅ Given a **reorder** operation, `groupNext[]` resets and TIED badges clear unless toggled again (tests/e2e/grouping-ui.test.tsx).

13. Acceptance Status — FEAT-008B
Audio scheduler for grouping:
✅ Group→Next scheduling: Unit tests confirm a common tone sustains across chord boundaries with a single extended event and no duplicate note-on (tests/unit/grouping.test.ts).
✅ Group All scheduling: Unit tests confirm at least one pitch class sustains from start to end with no re-trigger (tests/unit/grouping.test.ts).

14. Acceptance Status — FEAT-009
Octave / Seeded Voicing / Loop:
✅ Octave: Given a chord, when **Octave ▲** is clicked twice, its realized notes shift by +24 semitones within bounds (tests/unit/octaveOffset.test.ts).
✅ Randomize Voicing: With Randomize ON and seed `1234`, rendering twice yields identical voicings; after **Reseed**, voicings change while staying within bounds/span (tests/unit/voicing.random.test.ts).
✅ Loop: With Loop ON and range **From=1, To=3**, the UI reflects the range and playback routes a sliced sub-progression repeatedly (tests/e2e/loop-ui.test.tsx).
