export interface ScheduledNoteHandle {
  stop: (when?: number) => void;
}

export interface ScheduleNoteOptions {
  duration: number;
  velocity?: number;
  voices: number;
}
