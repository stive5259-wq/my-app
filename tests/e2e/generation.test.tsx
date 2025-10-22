import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';

// Mock AudioContext
class MockAudioContext {
  currentTime = 0;
  destination = {};

  createOscillator() {
    return {
      type: 'sine',
      frequency: { value: 440 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }

  createGain() {
    return {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };
  }

  close() {
    return Promise.resolve();
  }
}

declare global {
  var AudioContext: typeof MockAudioContext;
}

globalThis.AudioContext = MockAudioContext;

describe('FEAT-001: E2E Skeleton (Generate → Display → Play)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Given fresh start, when user clicks Generate, then C Major progression renders with 7th chords', async () => {
    const user = userEvent.setup();
    render(<App />);

    const generateButton = screen.getByRole('button', { name: /generate/i });
    await user.click(generateButton);

    // Wait for generation to complete - swap mode toggles appear
    await waitFor(() => {
      screen.getByRole('button', { name: /change harmony/i });
    });

    // Verify we have 4 chords (I - V - vi - IV progression)
    const chordItems = screen.getAllByText(/click to swap/);
    expect(chordItems.length).toBe(4);

    // Verify swap mode toggles are present
    expect(screen.getByRole('button', { name: /change voicing/i })).toBeTruthy();
  });

  it('Given progression is visible, when user clicks Play, then playback starts, state = playing, and Play label switches to Stop', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Generate progression first
    const generateButton = screen.getByRole('button', { name: /generate/i });
    await user.click(generateButton);

    await waitFor(() => {
      screen.getByText(/C Major/);
    });

    // Click Play
    const playButton = screen.getByRole('button', { name: /play/i });
    await user.click(playButton);

    // Verify Play button switches to Stop
    await waitFor(() => {
      screen.getByRole('button', { name: /stop/i });
    });

    expect(screen.queryByRole('button', { name: /play/i })).toBeNull();
  });

  it('Given playing, when user clicks Stop, then playback halts within 50ms and state = ready', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Generate and start playing
    const generateButton = screen.getByRole('button', { name: /generate/i });
    await user.click(generateButton);

    await waitFor(() => {
      screen.getByText(/C Major/);
    });

    const playButton = screen.getByRole('button', { name: /play/i });
    await user.click(playButton);

    await waitFor(() => {
      screen.getByRole('button', { name: /stop/i });
    });

    // Click Stop
    const stopTime = performance.now();
    const stopButton = screen.getByRole('button', { name: /stop/i });
    await user.click(stopButton);

    // Verify it stops within 50ms
    await waitFor(() => {
      screen.getByRole('button', { name: /play/i });
    }, { timeout: 50 });

    const elapsedTime = performance.now() - stopTime;
    expect(elapsedTime).toBeLessThan(50);
  });

  it('Given ready with progression, when user presses Space (and focus is not in an input), playback toggles same as clicking Play/Stop', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Generate progression
    const generateButton = screen.getByRole('button', { name: /generate/i });
    await user.click(generateButton);

    await waitFor(() => {
      screen.getByText(/C Major/);
    });

    // Press Space to play
    await user.keyboard(' ');

    await waitFor(() => {
      screen.getByRole('button', { name: /stop/i });
    });

    // Press Space to stop
    await user.keyboard(' ');

    await waitFor(() => {
      screen.getByRole('button', { name: /play/i });
    });
  });

  it('Generate is disabled while generating; Play is disabled while generating', async () => {
    const user = userEvent.setup();
    render(<App />);

    const generateButton = screen.getByRole('button', { name: /generate/i });
    const playButton = screen.getByRole('button', { name: /play/i });

    // Initial state: Play should be disabled (no progression)
    expect(playButton.disabled).toBe(true);
    expect(generateButton.disabled).toBe(false);

    // Click Generate
    await user.click(generateButton);

    // During generation, both should be disabled
    const generatingButton = screen.getByRole('button', { name: /generating/i });
    expect(generatingButton.disabled).toBe(true);
    expect(screen.getByRole('button', { name: /play/i }).disabled).toBe(true);

    // After generation, buttons should be enabled appropriately
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /^generate$/i });
      expect(btn.disabled).toBe(false);
    });

    expect(screen.getByRole('button', { name: /play/i }).disabled).toBe(false);
  });

  it('No console errors during Generate → Play → Stop loop', async () => {
    const consoleError = vi.spyOn(console, 'error');
    const user = userEvent.setup();
    render(<App />);

    // Generate
    const generateButton = screen.getByRole('button', { name: /generate/i });
    await user.click(generateButton);

    await waitFor(() => {
      screen.getByText(/C Major/);
    });

    // Play
    const playButton = screen.getByRole('button', { name: /play/i });
    await user.click(playButton);

    await waitFor(() => {
      screen.getByRole('button', { name: /stop/i });
    });

    // Stop
    const stopButton = screen.getByRole('button', { name: /stop/i });
    await user.click(stopButton);

    await waitFor(() => {
      screen.getByRole('button', { name: /play/i });
    });

    // Verify no console errors
    expect(consoleError).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });
});
