# Project Brief: Chord Bloom (Final)

## 1. Project Goal 🎵
An offline, minimalist chord progression generator (desktop/VST) for EDM/House producers. It creates harmonically-rich progressions that can be exported to MIDI. Its core feature is a one-click **"Smart Swap"** that intelligently replaces any chord with a beautiful, musically-correct, and often unexpected alternative.

## 2. Target Audience 🎹
Electronic music producers who want to:
* Instantly generate new, high-quality progressions for starting tracks.
* Import and "improve" their existing MIDI progressions with new harmonic ideas.
* Get MIDI files to use directly in their DAW.

## 3. Core Philosophy & Non-Goals
* **Philosophy:** "Inspiration over options." The application makes strong, theory-based decisions for the user, removing the need for complex menus. The goal is a "happy accident" workflow.
* **Non-Goal:** This is *not* a "Scaler" clone. We are avoiding manual chord-building, scale browsers, and complex customization. The focus is on immediate, generative results.

## 4. Key Features & UX
* **Tonal/Modal Generation:** Instantly create a new progression. The user can select a **tonal** (e.g., `C Major`) or **modal** (e.g., `D Dorian`, `F Lydian`) foundation.
* **Import:** Load an existing MIDI file to analyze and modify.
* **"Smart Swap":** The main interaction. Clicking any chord block instantly replaces it. This swap is *always* governed by the theory engine.
* **Swap Toggles:** Simple toggles to guide the swap algorithm:
    * **Change Harmony:** Swaps the chord for a new one (e.g., `I` -> `vi`, or `V` -> `subV`).
    * **Change Voicing:** Keeps the chord's function but alters its texture (e.g., `Cmaj` -> `Cmaj7(9)`, or `C/G`).
* **Visualizer:** A clean piano roll that displays the current progression and updates instantly on swap.
* **Transport:** Simple, "jam-friendly" controls (Play, Stop). The **Spacebar** will intelligently play/pause.
* **Export:** One-click "Export to MIDI."

---

## The "Smart Swap" Engine: Core Principles 🎼

To make the "Smart Swap" function *always* sound good and *never* feel repetitive, its algorithm is built on three core principles.

### 1. Core Principle: Intelligent Randomness
This is the engine's "creative" driver. Every swap is **randomized** to ensure the user never gets the same result twice. When a user swaps a chord, the algorithm:
1.  Analyzes the chord's context (tonality, modality, function).
2.  Instantly builds a "pool" of hundreds of *valid theoretical substitutes* based on the principles below.
3.  **Randomly selects one option** from that pool.
This ensures every click is a unique, non-destructive, and musically valid creative decision.

### 2. Core Principle: Algorithmic Voice Leading
This is the engine's "musical" constraint. It ensures that no matter how complex the harmony, the progression sounds *smooth*.
* **How it works:** When swapping Chord A for Chord B, the algorithm *must not* just pick the root position of Chord B. It calculates the specific **inversion and voicing** of Chord B that creates the **smallest possible melodic movement** for each note from Chord A.
* **Result:** This ensures the progression feels connected and "beautiful," even when the underlying harmony changes dramatically.

### 3. Core Principle: Context-Aware Harmony
This is the engine's "brain." It provides the *harmonic options* for the randomization pool. The swap logic is guided by **tonality**, **modality**, and **function**.

---
#### **Swap Logic: "Change Harmony"**
Randomly picks from valid substitutions:

* **Tonal Substitution:** Swaps chords that share the same **tonal** job (e.g., Tonic `I` swaps with `vi` or `iii`; Dominant `V` swaps with `vii°7`).
* **Modal Interchange:** The key to "beautiful" sound. Borrows chords from **parallel modes** (e.g., in C Major, swapping the `IV (Fmaj7)` for the `iv (Fm7)` from C minor, or `I (Cmaj7)` for `bVI (Abmaj7)`).
* **Tritone Substitution:** A classic tension-builder. If the chord is a Dominant 7th (e.g., `G7`), it can be swapped for the dominant 7th a tritone away (e.g., `Db7`).
* **Secondary Dominants:** Adds powerful pull. The algorithm can replace a chord with the `V7` of the *next* chord (e.g., in `C | G | C`, the first `C` could be swapped to `D7`, which is the "V of G").

---
#### **Swap Logic: "Change Voicing"**
Keeps the chord's function but randomly changes its texture or color.

* **Extensions & Alterations:** Cycles between triads, 7ths, 9ths, 11ths, and 13ths (e.g., `Dm` -> `Dm9`). If dominant, it adds random alterations (e.g., `G7` -> `G7b9`).
* **Inversions (Changing the Bass Note):** Cycles the chord through its inversions (e.g., `Cmaj` -> `Cmaj/E` -> `Cmaj/G`) to create new bassline movement.
* **Voicing Types (Spread vs. Close):** Toggles between **Close Voicing** (notes are close together) and **Spread Voicings** (e.g., "Drop 2," "Drop 3") for a richer, more open sound common in house music.

---

## Demo Day Requirements
* Generate progression
* Swap chords (every swap sounds good or better)
* Piano roll that shows the generated chords and updates when swaps
* Player with pause, stop, play
* Space key for jamming (play/pause/stop in best way)
