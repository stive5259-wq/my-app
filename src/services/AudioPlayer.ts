import type { Progression } from '../core/generator';

const GAIN_RAMP_MS = 8;

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private scheduledNodes: OscillatorNode[] = [];
  private isPlaying = false;
  private stopCallback: (() => void) | null = null;
  private currentChordCallback: ((index: number) => void) | null = null;
  private chordTimeouts: number[] = [];

  async play(
    progression: Progression,
    onEnd: () => void,
    onChordChange?: (index: number) => void
  ): Promise<void> {
    if (this.isPlaying) {
      this.stop();
    }

    console.log('🎵 Starting playback...', progression);

    try {
      this.audioContext = new AudioContext();

      // Resume AudioContext if suspended (browser autoplay policy)
      if (this.audioContext.state === 'suspended') {
        console.log('⏸️ AudioContext suspended, resuming...');
        await this.audioContext.resume();
      }

      console.log('✅ AudioContext state:', this.audioContext.state);
      console.log('✅ AudioContext currentTime:', this.audioContext.currentTime);

      this.isPlaying = true;
      this.stopCallback = onEnd;
      this.currentChordCallback = onChordChange || null;
    } catch (err) {
      console.error('❌ Failed to create AudioContext:', err);
      throw err;
    }

    const { chords, tempoBpm } = progression;
    const beatDuration = 60 / tempoBpm; // seconds per beat
    let currentTime = this.audioContext.currentTime;

    // Notify first chord
    if (this.currentChordCallback) {
      this.currentChordCallback(0);
    }

    chords.forEach((chord, chordIndex) => {
      const duration = chord.durationBeats * beatDuration;

      // Schedule chord change callback
      const timeUntilChord = (currentTime - this.audioContext!.currentTime) * 1000;
      if (this.currentChordCallback && chordIndex > 0) {
        const timeoutId = window.setTimeout(() => {
          if (this.currentChordCallback) {
            this.currentChordCallback(chordIndex);
          }
        }, timeUntilChord);
        this.chordTimeouts.push(timeoutId);
      }

      // Schedule notes for this chord
      for (const midiNote of chord.notes) {
        const frequency = this.midiToFrequency(midiNote);
        console.log(`  🎼 Note: MIDI ${midiNote} = ${frequency.toFixed(2)} Hz`);

        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;

        // Envelope: quick fade-in, sustain, quick fade-out
        const rampTime = GAIN_RAMP_MS / 1000;
        const noteVolume = 0.3 / chord.notes.length; // Even louder for testing

        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(noteVolume, currentTime + rampTime);
        gainNode.gain.setValueAtTime(noteVolume, currentTime + duration - rampTime);
        gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext!.destination);

        try {
          oscillator.start(currentTime);
          oscillator.stop(currentTime + duration);
          console.log(`    ▶️ Scheduled to play at ${currentTime.toFixed(2)}s for ${duration.toFixed(2)}s`);
        } catch (err) {
          console.error('    ❌ Failed to start oscillator:', err);
        }

        this.scheduledNodes.push(oscillator);
      }

      currentTime += duration;
    });

    // Schedule the end callback
    const totalDuration = (currentTime - this.audioContext.currentTime) * 1000;
    console.log(`🎵 Total duration: ${totalDuration}ms`);

    const endTimeoutId = window.setTimeout(() => {
      if (this.isPlaying) {
        console.log('🎵 Playback ended');
        const callback = this.stopCallback; // Save callback before stop() clears it
        this.stop();
        if (callback) {
          callback();
        }
      }
    }, totalDuration);
    this.chordTimeouts.push(endTimeoutId);
  }

  stop(): void {
    if (!this.isPlaying) return;

    console.log('🎵 Stopping playback');

    const now = this.audioContext?.currentTime ?? 0;

    // Stop all scheduled oscillators
    for (const node of this.scheduledNodes) {
      try {
        node.stop(now);
      } catch {
        // Oscillator may already be stopped
      }
    }

    this.scheduledNodes = [];

    // Clear all timeouts
    for (const timeoutId of this.chordTimeouts) {
      clearTimeout(timeoutId);
    }
    this.chordTimeouts = [];

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isPlaying = false;
    this.stopCallback = null;
    this.currentChordCallback = null;
  }

  private midiToFrequency(midiNote: number): number {
    // A4 (MIDI 69) = 440 Hz
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }
}
