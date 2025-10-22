Master App Document

1. Product Summary
App name: Smart Swap Generator
Goal: Generate harmonically rich progressions with deterministic theory validation.
Primary users: Producers and engineers experimenting with EDM/house chord flows.
Demo path: `pnpm dev` → open local Vite preview.

2. Current Capabilities (Atomic)
- FEAT-001: E2E skeleton (generate → play) — status: done
- FEAT-003: Deterministic theory + Smart Swap unit tests — status: done

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

5. Data and Contracts
Entities:
- TestCase { id: string }

6. Decisions (ADR index)
- ADR-0001: title

7. Open Risks
- Randomized Smart Swap outputs -> Mitigation: deterministic seeds exercised by Vitest

8. Roadmap (Next 3)
- FEAT-00X: title
