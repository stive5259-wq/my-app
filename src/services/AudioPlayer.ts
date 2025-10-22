import type { Progression } from '../core/generator';
import { getInstrumentPlayer, type InstrumentId } from '../audio/instruments';
import type { ScheduledNoteHandle } from '../audio/types';

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private scheduledVoices: ScheduledNoteHandle[] = [];
  private isPlaying = false;
  private stopCallback: (() => void) | null = null;
  private currentChordCallback: ((index: number) => void) | null = null;
  private chordTimeouts: number[] = [];
  private instrumentId: InstrumentId | null = null;

  async play(
    progression: Progression,
    instrumentId: InstrumentId,
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

      const instrument = await getInstrumentPlayer(this.audioContext, instrumentId);
      this.instrumentId = instrument.id;
      console.log(`🎹 Instrument selected: ${this.instrumentId}`);

      this.isPlaying = true;
      this.stopCallback = onEnd;
      this.currentChordCallback = onChordChange || null;

      const { chords, tempoBpm } = progression;
      const beatDuration = 60 / tempoBpm; // seconds per beat
      let currentTime = this.audioContext.currentTime;

      if (this.currentChordCallback) {
        this.currentChordCallback(0);
      }

      chords.forEach((chord, chordIndex) => {
        const duration = chord.durationBeats * beatDuration;

        const timeUntilChord = (currentTime - this.audioContext!.currentTime) * 1000;
        if (this.currentChordCallback && chordIndex > 0) {
          const timeoutId = window.setTimeout(() => {
            if (this.currentChordCallback) {
              this.currentChordCallback(chordIndex);
            }
          }, timeUntilChord);
          this.chordTimeouts.push(timeoutId);
        }

        for (const midiNote of chord.notes) {
          console.log(`  🎼 Scheduling MIDI ${midiNote} for instrument ${instrument.id}`);
          const voice = instrument.scheduleNote(midiNote, currentTime, {
            duration,
            voices: chord.notes.length,
          });
          this.scheduledVoices.push(voice);
        }

        currentTime += duration;
      });

      const totalDuration = (currentTime - this.audioContext.currentTime) * 1000;
      console.log(`🎵 Total duration: ${totalDuration}ms`);

      const endTimeoutId = window.setTimeout(() => {
        if (this.isPlaying) {
          console.log('🎵 Playback ended');
          const callback = this.stopCallback;
          this.stop();
          if (callback) {
            callback();
          }
        }
      }, totalDuration);
      this.chordTimeouts.push(endTimeoutId);
    } catch (err) {
      console.error('❌ Failed to create AudioContext:', err);
      this.stop();
      throw err;
    }
  }

  stop(): void {
    if (!this.isPlaying) return;

    console.log('🎵 Stopping playback');

    const now = this.audioContext?.currentTime ?? 0;

    for (const voice of this.scheduledVoices) {
      try {
        voice.stop(now);
      } catch {
        // voice may already be stopped
      }
    }

    this.scheduledVoices = [];

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
    this.instrumentId = null;
  }

  getCurrentInstrumentId(): InstrumentId | null {
    return this.instrumentId;
  }
}
