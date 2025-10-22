EXPLANATION ==
Product Summary
	•	App Name: Chord Bloom
	•	Goal: Offline, minimalist chord progression generator (desktop/VST) for EDM/House producers. Creates harmonically-rich progressions with one-click "Smart Swap" for intelligent chord substitutions.
	•	Primary Users: Electronic music producers who want instant, high-quality progressions and MIDI export for their DAW.
	•	Demo Path: Generate → View progression with Piano Roll → Swap chords → Play/Stop with spacebar → Export to MIDI (planned)
	•	Tech Stack: React 18 + Vite + TypeScript, WebAudio API, Vitest for testing
	•	Code Volume: ~1,205 lines of TypeScript/TSX
Current Capabilities (by FEAT id, status)
FEAT-001: E2E Generation Skeleton — Status: IMPLEMENTED ✅
	•	Generate tonal/modal progressions (I-V-vi-IV pattern with 7th chords)
	•	Key selector (12 keys: C through B including flats)
	•	Mode selector (8 modes: major, minor, dorian, phrygian, lydian, mixolydian, aeolian, locrian)
	•	Piano Roll visualization with note grid and beat markers
	•	Audio playback using WebAudio oscillators (sine waves)
	•	Transport controls: Generate, Play/Stop, Spacebar toggle
	•	Smart Swap engine with two modes:
	◦	Change Harmony: Tonal substitution, modal interchange, tritone substitution, secondary dominants
	◦	Change Voicing: Extensions/alterations (7ths, 9ths, 11ths, 13ths), inversions, voicing types
	•	Visual playback indicator showing currently playing chord
	•	State machine: idle → generating → ready → playing → error
UI Map
Main Screen (Single Page App)
	•	States:
	◦	idle — Initial state, no progression generated
	◦	generating — Brief loading state (100ms simulated async)
	◦	ready — Progression displayed, ready for playback/swapping
	◦	playing — Audio playing, stop button shown, visual indicator on active chord
	◦	error — Error message displayed
Key Components:
	•	Header (App.tsx:146-149)
	◦	Title: "Chord Bloom"
	◦	Subtitle: "Smart Swap Chord Generator"
	•	Key & Mode Selectors (App.tsx:152-200)
	◦	Dropdown for key selection (12 chromatic notes)
	◦	Dropdown for mode selection (8 modes)
	◦	Disabled during generation
	•	Controls Component (Controls.tsx:9-31)
	◦	Generate button (disabled while generating)
	◦	Play button (disabled while generating or no progression)
	◦	Stop button (replaces Play when playing)
	◦	Audio Test button (440Hz beep for debugging)
	•	Swap Mode Toggles (App.tsx:226-252)
	◦	"Change Harmony" toggle
	◦	"Change Voicing" toggle
	◦	Only visible when progression exists
	•	ProgressionDisplay Component (ProgressionDisplay.tsx:22-82)
	◦	Shows key/mode info (e.g., "C Major")
	◦	Shows tempo (120 BPM)
	◦	Displays 4 chord blocks with:
	▪	Chord name (e.g., "Cmaj7", "Gdom7")
	▪	Roman numeral function (I, V, vi, IV)
	▪	"click to swap" hint
	▪	"NOW PLAYING" indicator during playback
	◦	Interactive: click chord to swap (disabled during playback)
	◦	Hover effects: scale(1.05), border color change
	•	PianoRoll Component (PianoRoll.tsx:34-141)
	◦	Left column: Note labels (e.g., "C4", "E4")
	◦	Grid: Visual representation of notes over time
	◦	Note blocks: Blue rectangles showing active notes
	◦	Beat grid lines: Vertical lines for timing reference
	◦	Black/white key differentiation via background color
Architecture Overview
Client Architecture:
	•	Single-page React application (SPA)
	•	Strict TypeScript configuration
	•	Component-based architecture with clear separation of concerns
Runtime Commands:
	•	pnpm dev — Vite dev server (HMR enabled)
	•	pnpm build — TypeScript compile + Vite production build
	•	pnpm test — Vitest test runner
	•	pnpm lint — ESLint
	•	pnpm preview — Preview production build
Key Modules: 1. Core Layer (Pure Functions)
	•	src/core/theory.ts (225 lines)
	◦	Music theory primitives: NoteName, ChordQuality, Mode, Scale
	◦	18 chord qualities (maj, min, dim, aug, maj7, min7, dom7, extensions up to 13ths)
	◦	8 modal interval patterns (major, minor, dorian, phrygian, lydian, mixolydian, aeolian, locrian)
	◦	Functions: getDiatonicChord(), getParallelModes(), getTritoneSubstitution(), getSecondaryDominant()
	◦	Voice leading algorithm: optimizeVoicing(), voiceLeadingDistance()
	•	src/core/generator.ts (287 lines)
	◦	Types: Chord, Progression, SwapMode
	◦	generateProgression(): Creates I-V-vi-IV progression with voice leading optimization
	◦	Smart Swap Engine (smartSwap() at generator.ts:110-148)
	▪	Intelligent Randomness: Builds substitution pool, randomly selects
	▪	Algorithmic Voice Leading: Optimizes voicing for minimal motion
	▪	Context-Aware Harmony: Analyzes tonality, modality, function
	◦	buildHarmonySubstitutions(): Implements tonal sub, modal interchange, tritone sub, secondary dominants
	◦	buildVoicingSubstitutions(): Cycles through extensions, inversions, voicing types
2. Services Layer (Side Effects)
	•	src/services/AudioPlayer.ts (161 lines)
	◦	Manages WebAudio context lifecycle
	◦	play(): Schedules oscillators for entire progression
	◦	stop(): Halts playback within 50ms, cleans up resources
	◦	midiToFrequency(): A4 = 440Hz conversion
	◦	ADSR-like envelope with 8ms attack/release ramps
	◦	Volume: 0.3 / chord.notes.length (prevents clipping)
	◦	Callbacks: onEnd, onChordChange for visual sync
3. UI Components
	•	src/App.tsx (272 lines) — Main orchestrator
	◦	State management: useState for app state, progression, error, swapCount, swapMode, key, mode
	◦	Event handlers: handleGenerate(), handlePlay(), handleStop(), handleSwapChord(), handleSpaceKey()
	◦	Refs: audioPlayerRef for persistent AudioPlayer instance
	◦	Keyboard handler: Space key (guarded against input focus)
	•	src/components/Controls.tsx (32 lines) — Transport buttons
	•	src/components/ProgressionDisplay.tsx (83 lines) — Chord blocks UI
	•	src/components/PianoRoll.tsx (142 lines) — Note visualization
4. Entry Point
	•	src/main.tsx (11 lines) — React root render with StrictMode
Data Flow:
	1	User clicks Generate → handleGenerate() → generateProgression(key, mode) → Updates progression state
	2	User clicks chord → handleSwapChord(index) → smartSwap(progression, index, swapMode, seed) → Updates chord in progression
	3	User clicks Play → handlePlay() → audioPlayerRef.current.play(progression, onEnd, onChordChange) → AudioContext schedules notes
	4	AudioPlayer triggers onChordChange(index) → Updates currentPlayingChord → ProgressionDisplay shows indicator
	5	User clicks Stop/Space → handleStop() → audioPlayerRef.current.stop() → Cleanup
State Management:
	•	Local React state (no Redux/Zustand)
	•	Unidirectional data flow
	•	State machine enforced via AppState type
Data & Contracts
Core Entities:
// Theory primitives
NoteName = 'C' | 'Db' | 'D' | 'Eb' | 'E' | 'F' | 'Gb' | 'G' | 'Ab' | 'A' | 'Bb' | 'B'
Mode = 'major' | 'minor' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'aeolian' | 'locrian'
ChordQuality = 18 variants (maj, min, dim, aug, maj7, min7, dom7, min7b5, dim7, maj9, min9, dom7b9, dom7#9, maj11, min11, dom11, maj13, min13, dom13)
ChordFunction = 'I' | 'ii' | 'iii' | 'IV' | 'V' | 'vi' | 'vii'

// Core data structures
interface Chord {
  root: NoteName;
  quality: ChordQuality;
  octave: number;
  notes: number[];        // MIDI note numbers (e.g., [60, 64, 67] for C4-E4-G4)
  durationBeats: number;
  function?: string;      // Roman numeral (e.g., "1", "5")
}

interface Progression {
  chords: Chord[];
  tempoBpm: number;       // Default: 120
  key: NoteName;
  mode: Mode;
}

interface Scale {
  root: NoteName;
  mode: Mode;
  intervals: number[];    // Semitones from root (e.g., [0,2,4,5,7,9,11] for major)
}

interface ChordDefinition {
  quality: ChordQuality;
  intervals: number[];    // Semitones from root
  displayName: string;    // UI suffix (e.g., "m7", "7b9")
}

type SwapMode = 'harmony' | 'voicing'
type AppState = 'idle' | 'generating' | 'ready' | 'playing' | 'error'
APIs/Contracts:
	•	No backend; all client-side
	•	WebAudio API for audio playback
	•	Future: File System API for MIDI export (not yet implemented)
Commands to Run
Development:
pnpm dev          # Start Vite dev server (http://localhost:5173)
Testing:
pnpm test         # Run Vitest tests
pnpm lint         # Run ESLint
Build:
pnpm build        # TypeScript compile + Vite production build
pnpm preview      # Preview production build
Scripts:
./scripts/health-check.sh    # Runs lint, build, test (all failures ignored)
./scripts/acp.sh             # Add, commit, push helper
./scripts/snap.sh            # Create snapshot
./scripts/applypatch.sh      # Apply unified diff patch
Dependencies
Production:
	•	react@^18.3.1
	•	react-dom@^18.3.1
Development:
	•	typescript@^5.5.3
	•	vite@^5.4.1
	•	vitest@^2.0.5
	•	@vitejs/plugin-react@^4.3.1
	•	@testing-library/react@^16.0.0
	•	@testing-library/user-event@^14.5.2
	•	jsdom@^25.0.0
	•	eslint@^9.9.0 + React plugins
	•	typescript-eslint@^8.0.1
Notable:
	•	No music theory libraries (tonal.js, teoria) — all custom
	•	No audio libraries (Tone.js, Howler) — raw WebAudio
	•	No state management libraries (Redux, Zustand)
	•	No UI frameworks (MUI, Chakra) — vanilla CSS
Known Limitations/TODOs
From BRIEF.md Non-Goals (Deferred):
	•	MIDI import functionality
	•	MIDI export functionality
	•	Offline/PWA capabilities
	•	VST packaging
	•	Advanced UI (scale browsers, chord library, manual chord building)
From Code Analysis:
	•	No explicit FIXME/TODO/HACK comments found in source
	•	Audio Test button present for debugging (App.tsx:67-100) — suggests audio issues during development
	•	Extensive console logging in AudioPlayer (AudioPlayer.ts:22-106) — debug code not removed
	•	handleTestAudio() function in App (App.tsx:67-100) — temporary debugging feature
	•	Mock AudioContext in tests (generation.test.tsx:7-36) — real audio not testable in jsdom
Implicit Limitations:
	•	Fixed 4-chord progression (I-V-vi-IV pattern)
	•	Fixed 4-beat duration per chord
	•	Fixed tempo (120 BPM)
	•	Fixed octave (4)
	•	Simple sine wave synthesis (no rich timbres)
	•	No reverb, delay, or other effects
	•	No chord progressions longer/shorter than 4 chords
	•	No undo/redo for swaps
	•	No save/load session state
	•	Swap seed increments linearly (no explicit randomness control)
Acceptance Coverage
Tests Present: (tests/e2e/generation.test.tsx) ✅ PASS: Generate renders progression with 7th chords (Scenario 1)
	•	Verifies 4 chords render with "click to swap" hints
	•	Verifies swap mode toggles appear
✅ PASS: Play toggles to Stop and sets playing state (Scenario 2)
	•	Verifies button label changes
	•	Verifies state transition
✅ PASS: Stop halts playback within 50ms (Scenario 3)
	•	Performance timing verification
✅ PASS: Space toggles Play/Stop (Scenario 4)
	•	Keyboard interaction verified
✅ PASS: Generate/Play disabled during generating (Scenario 5)
	•	Button states verified across state transitions
✅ PASS: No console errors during full loop (Scenario 6)
	•	Error console spy confirms clean execution
Gaps Identified:
	•	No tests for Smart Swap engine specifically
	•	No tests for key/mode selection affecting output
	•	No tests for voice leading quality
	•	No tests for chord swap modes (harmony vs voicing)
	•	No tests for chord display names
	•	No tests for piano roll rendering
	•	No tests for visual playback indicator
	•	No tests for concurrent swap prevention during playback
	•	No unit tests for music theory functions (theory.ts)
	•	No unit tests for audio player (AudioPlayer.ts)
	•	No integration tests for Smart Swap substitution logic
Acceptance Criteria Coverage: 6/6 scenarios from ACCEPTANCE.md implemented and passing
Risks & Tech Debt
Current Risks:
	1	Audio Playback Reliability (High)
	◦	Debug code still present (test button, extensive console logs)
	◦	Suggests instability during development
	◦	Browser autoplay policies may block playback in some contexts
	◦	Mitigation: User gesture required (button/space)
	2	Music Theory Quality (Medium)
	◦	Voice leading algorithm unvalidated (no unit tests)
	◦	Substitution pool quality unverified (no musical expert review)
	◦	Risk: Swaps may produce unmusical results at edge cases
	◦	Mitigation: Randomness provides diversity, user can re-swap
	3	Data Model Calcification (Low)
	◦	Fixed 4-chord structure may be hard to extend
	◦	Fixed duration/octave baked into generator
	◦	Mitigation: ADR-0001 acknowledges, defers to future features
	4	Browser Compatibility (Low)
	◦	WebAudio API not tested cross-browser
	◦	AudioContext may behave differently on Safari/Firefox
	◦	Mitigation: Modern evergreen browsers well-supported
Tech Debt:
	•	Debug code not removed (App.tsx:67-100, App.tsx:210-223)
	•	Console logging excessive in AudioPlayer (AudioPlayer.ts)
	•	No error boundary for React component errors
	•	No loading indicators beyond button text change
	•	Hardcoded colors/styles (no design tokens)
	•	No accessibility (ARIA labels, keyboard nav beyond spacebar)
	•	No mobile responsiveness considerations
	•	AudioPlayer class could be extracted to worker thread (future perf)
From ADR-0001:
	•	Piano Roll and advanced swapping were "unknowns" — now partially resolved
	•	Theory-first approach was rejected to reduce integration risk — validated
	•	VST packaging deferred (Rust/Wasm or JUCE conversion needed)
From DESIGN/FEAT-001.yml Risks:
	•	WebAudio lifecycle quirks — mitigated by user gesture requirement ✅
	•	Data model drift — mitigated by minimal fields and tests ✅
	•	Keyboard event conflicts — mitigated by input focus guard ✅
Next 3 Concrete Tasks
Based on ADR-0001 follow-ups and current state:
	1	FEAT-002: Enhance Piano Roll Interactivity
	◦	Add note selection/highlighting on click
	◦	Show note names on hover
	◦	Add beat/bar labels
	◦	Add zoom controls for longer progressions (prep for variable length)
	◦	Files to touch: src/components/PianoRoll.tsx
	2	FEAT-003: Add Unit Tests for Music Theory
	◦	Test voice leading algorithm (optimizeVoicing, voiceLeadingDistance)
	◦	Test substitution builders (buildHarmonySubstitutions, buildVoicingSubstitutions)
	◦	Test edge cases (all 8 modes, all 12 keys, all chord qualities)
	◦	Verify modal interchange produces correct borrowed chords
	◦	Files to create: tests/unit/theory.test.ts, tests/unit/generator.test.ts
	3	FEAT-004: MIDI Export
	◦	Add "Export MIDI" button (enabled when progression exists)
	◦	Implement MIDI file generation (could use @tonejs/midi or custom)
	◦	Convert Progression to MIDI format (track, notes, tempo, duration)
	◦	Trigger file download via File System API or Blob
	◦	Update ACCEPTANCE.md with new scenarios
	◦	Files to touch: src/App.tsx, new src/services/MidiExporter.ts
Alternative Next Tasks (if prioritizing quality over features):
	•	Remove debug code and console logs
	•	Add error boundary and user-facing error messages
	•	Improve accessibility (ARIA labels, keyboard navigation)
	•	Add visual feedback for audio context initialization
	•	Implement undo/redo for chord swaps

MASTER_DOC_PATCH ==
--- a/MASTER_DOC.md
+++ b/MASTER_DOC.md
@@ -1,34 +1,210 @@
 Master App Document
 
 1. Product Summary
-App name:
-Goal:
-Primary users:
-Demo path:
+App name: Chord Bloom
+Goal: Offline, minimalist chord progression generator (desktop/VST) for EDM/House producers. Creates harmonically-rich progressions with one-click "Smart Swap" for intelligent chord substitutions using advanced music theory.
+Primary users: Electronic music producers who want instant, high-quality progressions and MIDI export for their DAW.
+Demo path: Generate (select key/mode) → View progression with Piano Roll → Click chords to swap (harmony/voicing modes) → Play/Stop with spacebar → Export to MIDI (planned)
+Tech stack: React 18 + Vite + TypeScript, WebAudio API, Vitest
+Code volume: ~1,205 lines
 
 2. Current Capabilities (Atomic)
-- FEAT-001:  — status:
+- FEAT-001: E2E Generation Skeleton — status: IMPLEMENTED ✅
+  * Generate I-V-vi-IV progressions with 7th chords
+  * Key selector (12 chromatic keys)
+  * Mode selector (8 modes: major, minor, dorian, phrygian, lydian, mixolydian, aeolian, locrian)
+  * Smart Swap with 2 modes (Change Harmony: tonal sub, modal interchange, tritone sub, secondary dominants | Change Voicing: extensions, inversions)
+  * Piano Roll visualization (notes, beat grid, labels)
+  * WebAudio playback (sine oscillators, 120 BPM fixed)
+  * Transport controls (Generate, Play/Stop, Spacebar toggle)
+  * Visual playback indicator
+  * State machine (idle → generating → ready → playing → error)
+  * 6/6 acceptance tests passing
 
 3. UX Map
 Screens:
-- ScreenName: states [empty, loading, error, data]
+- MainScreen (Single Page): states [idle, generating, ready, playing, error]
+  * Header: "Chord Bloom" title + subtitle
+  * Key/Mode Selectors: dropdowns (disabled during generation)
+  * Controls: Generate button, Play/Stop button, Audio Test button
+  * Swap Mode Toggles: "Change Harmony" / "Change Voicing" (visible when progression exists)
+  * ProgressionDisplay: 4 chord blocks with names, functions, "click to swap" hints, "NOW PLAYING" indicator
+  * PianoRoll: Note labels (left), grid with note blocks (blue), beat lines (vertical)
+
+Components:
+- App.tsx: Main orchestrator, state management, event handlers
+- Controls.tsx: Transport buttons (Generate, Play/Stop)
+- ProgressionDisplay.tsx: Chord blocks UI, click-to-swap, visual playback indicator
+- PianoRoll.tsx: Note visualization grid
 
 4. Architecture Overview
-Client:
-Runtime commands:
+Client: Single-page React app (SPA), strict TypeScript, component-based
+
+Runtime commands:
+- pnpm dev: Vite dev server
+- pnpm build: TypeScript compile + Vite production build
+- pnpm test: Vitest test runner
+- pnpm lint: ESLint
+- pnpm preview: Preview production build
+
+Scripts:
+- scripts/health-check.sh: lint + build + test (failures ignored)
+- scripts/acp.sh: add, commit, push helper
+- scripts/snap.sh: snapshot creation
+- scripts/applypatch.sh: apply unified diff
+
 Key modules:
-- path: purpose
+- src/core/theory.ts: Music theory primitives (NoteName, ChordQuality, Mode, Scale), voice leading algorithm, substitution functions
+- src/core/generator.ts: Smart Swap engine, progression generation, substitution pool builders
+- src/services/AudioPlayer.ts: WebAudio lifecycle, playback scheduling, MIDI-to-frequency conversion
+- src/components/Controls.tsx: Transport buttons
+- src/components/ProgressionDisplay.tsx: Chord blocks UI
+- src/components/PianoRoll.tsx: Note visualization
+- src/App.tsx: Main orchestrator, state management
+- src/main.tsx: React root entry
+- tests/e2e/generation.test.tsx: 6 acceptance tests (all passing)
+
+Data flow:
+1. User clicks Generate → generateProgression(key, mode) → updates progression state
+2. User clicks chord → smartSwap(progression, index, swapMode, seed) → updates chord in progression
+3. User clicks Play → audioPlayerRef.play(progression, onEnd, onChordChange) → schedules oscillators
+4. AudioPlayer triggers onChordChange(index) → updates currentPlayingChord → visual indicator
+5. User clicks Stop/Space → audioPlayerRef.stop() → cleanup
+
+State management:
+- Local React state (useState), no Redux/Zustand
+- Unidirectional data flow
+- State machine enforced via AppState type
 
 5. Data and Contracts
 Entities:
-- Entity { id: string }
+- NoteName: 'C' | 'Db' | 'D' | 'Eb' | 'E' | 'F' | 'Gb' | 'G' | 'Ab' | 'A' | 'Bb' | 'B'
+- Mode: 'major' | 'minor' | 'dorian' | 'phrygian' | 'lydian' | 'mixolydian' | 'aeolian' | 'locrian'
+- ChordQuality: 18 variants (maj, min, dim, aug, maj7, min7, dom7, min7b5, dim7, maj9, min9, dom7b9, dom7#9, maj11, min11, dom11, maj13, min13, dom13)
+- Chord { root: NoteName; quality: ChordQuality; octave: number; notes: number[]; durationBeats: number; function?: string }
+- Progression { chords: Chord[]; tempoBpm: number; key: NoteName; mode: Mode }
+- Scale { root: NoteName; mode: Mode; intervals: number[] }
+- ChordDefinition { quality: ChordQuality; intervals: number[]; displayName: string }
+- SwapMode: 'harmony' | 'voicing'
+- AppState: 'idle' | 'generating' | 'ready' | 'playing' | 'error'
+
+APIs:
+- No backend; all client-side
+- WebAudio API for audio playback
+- Future: File System API for MIDI export (not yet implemented)
+
+Dependencies:
+Production:
+- react@^18.3.1
+- react-dom@^18.3.1
+
+Development:
+- typescript@^5.5.3, vite@^5.4.1, vitest@^2.0.5
+- @vitejs/plugin-react@^4.3.1
+- @testing-library/react@^16.0.0, @testing-library/user-event@^14.5.2, jsdom@^25.0.0
+- eslint@^9.9.0 + React plugins, typescript-eslint@^8.0.1
+
+Notable: No music theory libraries (tonal.js), no audio libraries (Tone.js), no state management libraries, no UI frameworks
 
 6. Decisions (ADR index)
-- ADR-0001: title
+- ADR-0001: Adopt E2E Skeleton (Generate → Display → Play) for FEAT-001 (Accepted 2025-10-22)
+  * Decision: Minimal end-to-end path with stubbed progression, WebAudio playback, locked minimal shared types
+  * Pros: Fast demo value, validates integration boundaries, audio stack verified early
+  * Cons: No theory/beauty guarantees yet, Piano Roll and swapping were unknowns
+  * Follow-ups: FEAT-002 (Piano Roll enhancements), FEAT-003 (Swap API), FEAT-004 (beauty heuristics), FEAT-005 (MIDI export), FEAT-006 (offline/PWA), FEAT-007 (VST portability)
 
 7. Open Risks
-- risk -> mitigation
+Current risks:
+- Audio Playback Reliability (High): Debug code present (test button, console logs), browser autoplay policies → Mitigation: User gesture required (button/space)
+- Music Theory Quality (Medium): Voice leading unvalidated, substitution pool unverified → Mitigation: Randomness provides diversity, user can re-swap
+- Data Model Calcification (Low): Fixed 4-chord structure may be hard to extend → Mitigation: ADR-0001 acknowledges, defers to future features
+- Browser Compatibility (Low): WebAudio API untested cross-browser → Mitigation: Modern evergreen browsers well-supported
+
+Tech debt:
+- Debug code not removed (App.tsx:67-100, 210-223; AudioPlayer.ts extensive logging)
+- No error boundary for React component errors
+- No loading indicators beyond button text change
+- Hardcoded colors/styles (no design tokens)
+- No accessibility (ARIA labels, keyboard nav beyond spacebar)
+- No mobile responsiveness
+
+Known limitations:
+- Fixed 4-chord I-V-vi-IV progression
+- Fixed 4-beat duration per chord, 120 BPM, octave 4
+- Simple sine wave synthesis (no rich timbres, reverb, delay)
+- No undo/redo for swaps
+- No save/load session state
+- Swap seed increments linearly
+
+Deferred (from BRIEF non-goals):
+- MIDI import, MIDI export (planned)
+- Offline/PWA capabilities
+- VST packaging
+- Advanced UI (scale browsers, chord library, manual chord building)
+
+Test coverage gaps:
+- No unit tests for Smart Swap engine
+- No unit tests for music theory functions (theory.ts)
+- No unit tests for AudioPlayer
+- No tests for key/mode selection affecting output
+- No tests for voice leading quality
+- No tests for chord swap modes
+- No tests for piano roll rendering
+- No integration tests for substitution logic
 
 8. Roadmap (Next 3)
-- FEAT-00X: title
+Priority Features:
+- FEAT-002: Enhance Piano Roll Interactivity
+  * Add note selection/highlighting on click
+  * Show note names on hover, beat/bar labels
+  * Add zoom controls for longer progressions
+  * Files: src/components/PianoRoll.tsx
+
+- FEAT-003: Add Unit Tests for Music Theory
+  * Test voice leading algorithm (optimizeVoicing, voiceLeadingDistance)
+  * Test substitution builders (buildHarmonySubstitutions, buildVoicingSubstitutions)
+  * Test edge cases (all 8 modes, 12 keys, 18 chord qualities)
+  * Verify modal interchange correctness
+  * Files: tests/unit/theory.test.ts, tests/unit/generator.test.ts
+
+- FEAT-004: MIDI Export
+  * Add "Export MIDI" button
+  * Implement MIDI file generation (consider @tonejs/midi or custom)
+  * Convert Progression to MIDI format (track, notes, tempo, duration)
+  * Trigger file download via File System API or Blob
+  * Update ACCEPTANCE.md with new scenarios
+  * Files: src/App.tsx, new src/services/MidiExporter.ts
+
+Alternative Quality Tasks (if prioritizing stability):
+- Remove debug code and console logs
+- Add error boundary and user-facing error messages
+- Improve accessibility (ARIA labels, keyboard navigation)
+- Add visual feedback for audio context initialization
+- Implement undo/redo for chord swaps
+
+Future (from ADR-0001):
+- FEAT-005: Advanced beauty heuristics & voice-leading rules
+- FEAT-006: Offline/PWA shell
+- FEAT-007: VST portability (Rust/Wasm or JUCE)
+
+9. Acceptance Status
+FEAT-001 (E2E Generation Skeleton):
+✅ Scenario 1: Generate renders progression with 7th chords
+✅ Scenario 2: Play toggles to Stop and sets playing state
+✅ Scenario 3: Stop halts playback within 50ms
+✅ Scenario 4: Space toggles Play/Stop
+✅ Scenario 5: Generate/Play disabled during generating
+✅ Scenario 6: No console errors during full loop
+
+Coverage: 6/6 acceptance scenarios passing (tests/e2e/generation.test.tsx)
+
+10. Smart Swap Engine Details
+Core Principle 1 — Intelligent Randomness:
+- Builds pool of hundreds of valid substitutes based on context
+- Randomly selects one from pool (seed-based for reproducibility)
+
+Core Principle 2 — Algorithmic Voice Leading:
+- Calculates specific inversion/voicing of new chord for minimal melodic movement
+- Ensures smooth transitions even with dramatic harmonic changes
+
+Core Principle 3 — Context-Aware Harmony:
+- Harmony mode: Tonal substitution (I↔iii↔vi, ii↔IV, V↔vii), modal interchange (borrows from parallel modes), tritone substitution (dom7 → tritone away), secondary dominants (V7/x)
+- Voicing mode: Extensions/alterations (7ths, 9ths, 11ths, 13ths), inversions (bass note changes), voicing types (close vs spread)
+
+Implementation: generator.ts:110-271 (smartSwap, buildHarmonySubstitutions, buildVoicingSubstitutions)
