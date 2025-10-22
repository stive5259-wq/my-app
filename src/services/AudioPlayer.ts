import type { Progression } from '../core/generator';

const GAIN_RAMP_MS = 8;

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private scheduledNodes: OscillatorNode[] = [];
  private isPlaying = false;
  private stopCallback: (() => void) | null = null;

  async play(progression: Progression, onEnd: () => void): Promise<void> {
    if (this.isPlaying) {
      this.stop();
    }

    this.audioContext = new AudioContext();
    this.isPlaying = true;
    this.stopCallback = onEnd;

    const { chords, tempoBpm } = progression;
    const beatDuration = 60 / tempoBpm; // seconds per beat
    let currentTime = this.audioContext.currentTime;

    for (const chord of chords) {
      const duration = chord.durationBeats * beatDuration;

      for (const midiNote of chord.notes) {
        const frequency = this.midiToFrequency(midiNote);
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;

        // Envelope: quick fade-in, sustain, quick fade-out
        const rampTime = GAIN_RAMP_MS / 1000;
        const noteVolume = 0.15 / chord.notes.length; // Divide volume by number of notes

        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(noteVolume, currentTime + rampTime);
        gainNode.gain.setValueAtTime(noteVolume, currentTime + duration - rampTime);
        gainNode.gain.linearRampToValueAtTime(0, currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.start(currentTime);
        oscillator.stop(currentTime + duration);

        this.scheduledNodes.push(oscillator);
      }

      currentTime += duration;
    }

    // Schedule the end callback
    const totalDuration = (currentTime - this.audioContext.currentTime) * 1000;
    setTimeout(() => {
      if (this.isPlaying) {
        const callback = this.stopCallback; // Save callback before stop() clears it
        this.stop();
        if (callback) {
          callback();
        }
      }
    }, totalDuration);
  }

  stop(): void {
    if (!this.isPlaying) return;

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

    // Close audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isPlaying = false;
    this.stopCallback = null;
  }

  private midiToFrequency(midiNote: number): number {
    // A4 (MIDI 69) = 440 Hz
    return 440 * Math.pow(2, (midiNote - 69) / 12);
  }
}
