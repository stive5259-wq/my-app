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
- Then the dev console contains no `error` entries