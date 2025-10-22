# Agents (single source of truth)
- Gemini 2.5 Pro — Challenger: stress-tests ideas, proposes options/spikes, drafts ADRs.
- ChatGPT-5 Thinking — Architect: produces DESIGN/FEAT-XXX.yml, acceptance tests, final ADRs.
- Cursor (MAIN) — Executor: plans, edits files, runs scripts, shows diffs.
- Claude Code — Builder: implements features, adds tests/docs.
- Codex (GPT-5 high) — Inspector: health checks, fixes, mini refactors, guardrail tests.

Flow: Gemini → ChatGPT → Cursor/Claude → Codex → Gemini retro.
