import { describe, expect, beforeEach, afterEach, it, vi } from 'vitest';
import {
  getInstrumentPlayer,
  listInstrumentOptions,
  preloadInstrument,
  __instrumentDebug,
} from '../../src/audio/instruments';
import { __samplerDebug } from '../../src/audio/sampler';
import { resetAudioStateForTests } from '../../src/state/audioState';

class MockAudioContext implements AudioContext {
  // Minimal AudioContext implementation for tests
  readonly destination: AudioDestinationNode = {} as AudioDestinationNode;
  currentTime = 0;
  sampleRate = 44100;
  state: AudioContextState = 'running';

  createGain(): GainNode {
    return {
      gain: {
        value: 0,
        cancelScheduledValues: vi.fn(),
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    } as unknown as GainNode;
  }

  createBufferSource(): AudioBufferSourceNode {
    return {
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      playbackRate: {
        setValueAtTime: vi.fn(),
      },
    } as unknown as AudioBufferSourceNode;
  }

  decodeAudioData(buffer: ArrayBuffer): Promise<AudioBuffer> {
    return Promise.resolve({
      duration: 1,
      sampleRate: this.sampleRate,
      numberOfChannels: 1,
      getChannelData: () => new Float32Array(buffer.byteLength),
    } as unknown as AudioBuffer);
  }

  close(): Promise<void> {
    return Promise.resolve();
  }

  resume(): Promise<void> {
    return Promise.resolve();
  }

  // Unused members
  addEventListener!: AudioContext['addEventListener'];
  removeEventListener!: AudioContext['removeEventListener'];
  dispatchEvent!: AudioContext['dispatchEvent'];
  createAnalyser!: AudioContext['createAnalyser'];
  createBiquadFilter!: AudioContext['createBiquadFilter'];
  createBuffer!: AudioContext['createBuffer'];
  createChannelMerger!: AudioContext['createChannelMerger'];
  createChannelSplitter!: AudioContext['createChannelSplitter'];
  createConstantSource!: AudioContext['createConstantSource'];
  createConvolver!: AudioContext['createConvolver'];
  createDelay!: AudioContext['createDelay'];
  createDynamicsCompressor!: AudioContext['createDynamicsCompressor'];
  createIIRFilter!: AudioContext['createIIRFilter'];
  createOscillator!: AudioContext['createOscillator'];
  createPanner!: AudioContext['createPanner'];
  createPeriodicWave!: AudioContext['createPeriodicWave'];
  createScriptProcessor!: AudioContext['createScriptProcessor'];
  createStereoPanner!: AudioContext['createStereoPanner'];
  createWaveShaper!: AudioContext['createWaveShaper'];
  createMediaElementSource!: AudioContext['createMediaElementSource'];
  createMediaStreamDestination!: AudioContext['createMediaStreamDestination'];
  createMediaStreamSource!: AudioContext['createMediaStreamSource'];
  createMediaStreamTrackSource!: AudioContext['createMediaStreamTrackSource'];
  createMediaStreamTrackProcessor!: AudioContext['createMediaStreamTrackProcessor'];
  baseLatency = 0;
  outputLatency = 0;
  audioWorklet!: AudioContext['audioWorklet'];
  listener!: AudioContext['listener'];
  onstatechange: AudioContext['onstatechange'] = null;
}

describe('audio instruments', () => {
  beforeEach(() => {
    __instrumentDebug.reset();
    __samplerDebug.reset();
    resetAudioStateForTests();
    vi.restoreAllMocks();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(1024),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('lists Grand Piano option', () => {
    const options = listInstrumentOptions();
    expect(options.find(option => option.id === 'grand-piano')?.label).toBe('Grand Piano');
  });

  it('preloads grand piano samples only once', async () => {
    await preloadInstrument('grand-piano');
    await preloadInstrument('grand-piano');

    for (const url of __samplerDebug.sampleUrls) {
      expect(__samplerDebug.getFetchCount(url)).toBe(1);
    }
  });

  it('provides grand piano instrument player for audio context', async () => {
    const context = new MockAudioContext();
    await preloadInstrument('grand-piano');

    const player = await getInstrumentPlayer(context as unknown as AudioContext, 'grand-piano');
    expect(player.id).toBe('grand-piano');

    const schedule = () =>
      player.scheduleNote(60, context.currentTime, { duration: 1, voices: 3 });
    expect(schedule).not.toThrow();

    const handle = schedule();
    expect(handle).toHaveProperty('stop');
  });
});
