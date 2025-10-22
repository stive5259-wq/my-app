import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../src/App';
import { __instrumentDebug } from '../../src/audio/instruments';
import { __samplerDebug } from '../../src/audio/sampler';
import { resetAudioStateForTests } from '../../src/state/audioState';
import { AudioPlayer } from '../../src/services/AudioPlayer';

class MockAudioContext {
  currentTime = 0;
  destination = {};
  state: AudioContextState = 'running';

  resume() {
    return Promise.resolve();
  }

  close() {
    return Promise.resolve();
  }
}

type FetchCall = { url: string };

describe('Instrument selection', () => {
  beforeEach(() => {
    __instrumentDebug.reset();
    __samplerDebug.reset();
    resetAudioStateForTests();
    window.localStorage.clear();
    globalThis.AudioContext = MockAudioContext as unknown as typeof AudioContext;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it('lists Grand Piano in the instrument menu', () => {
    const fetchStub = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    }));
    vi.stubGlobal('fetch', fetchStub);

    render(<App />);

    const select = screen.getByTestId('instrument-select');
    const options = within(select).getAllByRole('option').map(option => option.textContent);
    expect(options).toContain('Grand Piano');
  });

  it('passes grand piano instrument id to audio engine when playing', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    })));

    const playSpy = vi
      .spyOn(AudioPlayer.prototype, 'play')
      .mockImplementation(async (_progression, instrumentId, onEnd) => {
        expect(instrumentId).toBe('grand-piano');
        onEnd();
      });

    render(<App />);

    await user.selectOptions(screen.getByTestId('instrument-select'), 'grand-piano');
    await waitFor(() => expect(screen.queryByTestId('instrument-loading')).toBeNull());

    await user.click(screen.getByRole('button', { name: /generate/i }));
    await waitFor(() => screen.getByText(/C Minor/i));

    await user.click(screen.getByRole('button', { name: /play/i }));
    await waitFor(() => expect(playSpy).toHaveBeenCalled());

    playSpy.mockRestore();
  });

  it('persists grand piano selection across reloads', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    })));

    const { unmount } = render(<App />);

    const select = screen.getByTestId('instrument-select') as HTMLSelectElement;
    await user.selectOptions(select, 'grand-piano');
    await waitFor(() => expect(screen.queryByTestId('instrument-loading')).toBeNull());
    expect(select.value).toBe('grand-piano');

    unmount();
    render(<App />);

    const restored = screen.getByTestId('instrument-select') as HTMLSelectElement;
    await waitFor(() => expect(restored.value).toBe('grand-piano'));
  });

  it('does not re-fetch cached samples when re-selecting grand piano', async () => {
    const user = userEvent.setup();
    const fetchCalls: FetchCall[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      fetchCalls.push({ url });
      return {
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      } as Response;
    }));

    render(<App />);

    const select = screen.getByTestId('instrument-select');
    await user.selectOptions(select, 'grand-piano');
    await waitFor(() => expect(screen.queryByTestId('instrument-loading')).toBeNull());
    const initialCalls = fetchCalls.length;
    expect(initialCalls).toBeGreaterThan(0);

    await user.selectOptions(select, 'synth');
    await user.selectOptions(select, 'grand-piano');
    await waitFor(() => expect(screen.queryByTestId('instrument-loading')).toBeNull());

    expect(fetchCalls.length).toBe(initialCalls);
  });

  it('shows error toast and falls back to synth when grand piano fails to load', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      arrayBuffer: async () => {
        throw new Error('network fail');
      },
    })));

    render(<App />);

    const select = screen.getByTestId('instrument-select') as HTMLSelectElement;
    await user.selectOptions(select, 'grand-piano');

    await waitFor(() => expect(screen.queryByTestId('instrument-error')).not.toBeNull());
    expect(select.value).toBe('synth');
    expect(screen.getByTestId('instrument-error').textContent).toContain('Unable to load Grand Piano');
  });
});
