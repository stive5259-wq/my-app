# ADR-0001: Adopt E2E Skeleton (Generate → Display → Play) for FEAT-001

- **Status:** Accepted (2025-10-22)
- **Context:** The brief demands a demoable loop with high musical quality later, offline operation, and eventual VST packaging. Early integration risks include data model mismatches between theory, UI, and audio.

## Decision
Implement a minimal, end‑to‑end path with a stubbed progression and WebAudio playback. Lock minimal shared types (`Chord`, `Progression`) and a simple state machine. Defer swapping, advanced theory, and Piano Roll to subsequent features.

## Consequences
- **Pros**
- Fast demo value; validates integration boundaries.
- Minimal shared types reduce refactor risk later.
- Audio stack verified early; user gesture constraints understood.
- **Cons**
- No theory or beauty guarantees yet; stubbed content only.
- Piano Roll and swapping still unknowns (tackled next).

## Alternatives Considered
1. **Theory‑First (rejected now):** High risk of integration rework; low demo value.
2. **Visual‑First (rejected now):** UI could calcify around a static shape that later conflicts with dynamic generation.

## Follow‑ups
- **FEAT-002:** Piano Roll (static render of `Progression` + selection)
- **FEAT-003:** Swap API: deterministic seed‑based harmony/voicing variations
- **FEAT-004:** Basic beauty heuristics & voice‑leading rules in generator
- **FEAT-005:** MIDI export; **FEAT-006:** Offline/PWA shell
- **FEAT-007:** Portability plan for VST (extract pure core; consider Rust ⇄ Wasm or C++ via JUCE)