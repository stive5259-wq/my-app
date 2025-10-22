## FEAT-001 — E2E Generation Skeleton

### Scenarios
1. **Generate renders stubbed progression**
- Given a fresh start
- When I click **Generate**
- Then I see the chord names `Cmaj | Gmaj | Am | Fmaj` in order

2. **Play toggles to Stop and sets playing state**
- Given a rendered progression
- When I click **Play**
- Then audio playback starts, the button label becomes **Stop**, and the app state shows `playing`

3. **Stop halts playback quickly**
- Given the app is `playing`
- When I click **Stop**
- Then audio halts within 50ms and the app returns to `ready`

4. **Space toggles Play/Stop**
- Given a rendered progression and focus is not in a text input
- When I press **Space**
- Then playback toggles identically to clicking the button

5. **Generate/Play disabled during generating**
- Given state `generating`
- Then **Generate** and **Play** controls are disabled and the status shows a busy indication

6. **No console errors**
- Given a full Generate → Play → Stop loop
- Then the dev console contains no `error` entries- [ ] Given identical voicings, when voiceLeadingDistance(a, a) is computed, then result equals 0 in tests/unit/theory.test.ts.
- [ ] Given a source voicing and target chord, when optimizeVoicing() is applied, then new distance ≤ original distance in tests/unit/theory.test.ts.
- [ ] Given G7 in C major, when getTritoneSubstitution('G') is called, then the returned root is 'Db' in tests/unit/theory.test.ts.
- [ ] Given a generated C major progression, when smartSwap(prog, 1, 'harmony', 42) is called, then durationBeats unchanged and voiceLeadingDistance(original, swapped) ≤ 24 in tests/unit/generator.test.ts.
- [ ] Given a generated A aeolian progression, when smartSwap(prog, 0, 'voicing', 7) is called, then root unchanged and quality differs in tests/unit/generator.test.ts.
