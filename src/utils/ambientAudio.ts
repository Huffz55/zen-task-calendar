import { getAudioContext } from './audio';

export type AmbientSoundType = 'none' | 'rain' | 'waves' | 'forest' | 'wind' | 'fire';

interface ActiveAmbient {
  sourceNode: AudioBufferSourceNode;
  gainNode: GainNode;
  type: AmbientSoundType;
}

let activeAmbient: ActiveAmbient | null = null;
let currentVolume = 0.35;
let currentType: AmbientSoundType = 'none';
let fadeTimeoutId: ReturnType<typeof setTimeout> | null = null;

// Audio buffer caches for high performance, zero latency & 100% offline PWA
const bufferCache: Partial<Record<AmbientSoundType, AudioBuffer>> = {};
let cachedSampleRate = 0;

// Helper: Smoothly crossfade start and end of audio channels to guarantee 0-click seamless looping
function crossfadeLoop(left: Float32Array, right: Float32Array, length: number, fadeSamples: number) {
  for (let i = 0; i < fadeSamples; i++) {
    const factor = i / fadeSamples;
    const endIdx = length - fadeSamples + i;
    // Blend tail into head
    left[i] = left[i] * factor + left[endIdx] * (1 - factor);
    right[i] = right[i] * factor + right[endIdx] * (1 - factor);
  }
}

// 🌧️ REALISTIC RAIN: Steady, velvety rain shower (zero harsh clicks, pure comforting rain)
function createRainBuffer(ctx: AudioContext): AudioBuffer {
  const duration = 6;
  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * duration;
  const buffer = ctx.createBuffer(2, bufferSize, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Dual-channel decorrelated pink noise for authentic acoustic stereo width
  let b0L = 0, b1L = 0, b2L = 0, b3L = 0;
  let b0R = 0, b1R = 0, b2R = 0, b3R = 0;

  for (let i = 0; i < bufferSize; i++) {
    const whiteL = Math.random() * 2 - 1;
    const whiteR = Math.random() * 2 - 1;

    // Lowpass/pink filtering for steady rain body
    b0L = 0.993 * b0L + whiteL * 0.055;
    b1L = 0.975 * b1L + whiteL * 0.045;
    b2L = 0.920 * b2L + whiteL * 0.035;
    b3L = 0.820 * b3L + whiteL * 0.025;
    const rainL = (b0L + b1L + b2L + b3L) * 0.16;

    b0R = 0.993 * b0R + whiteR * 0.055;
    b1R = 0.975 * b1R + whiteR * 0.045;
    b2R = 0.920 * b2R + whiteR * 0.035;
    b3R = 0.820 * b3R + whiteR * 0.025;
    const rainR = (b0R + b1R + b2R + b3R) * 0.16;

    // Gentle natural intensity fluctuation over time
    const t = i / sampleRate;
    const slowMod = 0.92 + 0.08 * Math.sin((2 * Math.PI * t) / duration);

    // Fine drizzle mist (soft high frequency, absolutely no clicks)
    const mistL = whiteL * 0.015;
    const mistR = whiteR * 0.015;

    left[i] = (rainL + mistL) * slowMod;
    right[i] = (rainR + mistR) * slowMod;
  }

  crossfadeLoop(left, right, bufferSize, Math.floor(sampleRate * 0.1));
  return buffer;
}

// 🌊 REALISTIC OCEAN WAVES: Rhythmic deep tidal swell + crashing foamy surf wash rolling onto the shore
function createWavesBuffer(ctx: AudioContext): AudioBuffer {
  const duration = 8.5; // Natural ~8.5 second ocean wave period
  const sampleRate = ctx.sampleRate;
  const bufferSize = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(2, bufferSize, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Pre-generate stereo broadband noise
  let rumbleL = 0, rumbleR = 0;
  let foamL = 0, foamR = 0;

  for (let i = 0; i < bufferSize; i++) {
    const t = i / sampleRate;
    const whiteL = Math.random() * 2 - 1;
    const whiteR = Math.random() * 2 - 1;

    // Deep sub-bass water swell (brown noise)
    rumbleL = (rumbleL + 0.025 * whiteL) / 1.025;
    rumbleR = (rumbleR + 0.025 * whiteR) / 1.025;

    // Foamy surf wash (band-shaped pink noise)
    foamL = 0.92 * foamL + whiteL * 0.08;
    foamR = 0.92 * foamR + whiteR * 0.08;

    // Wave swell envelope: Builds up smoothly to peak at t ~ 3.2s
    const swellEnv = Math.exp(-Math.pow((t - 3.2) / 1.4, 2));

    // Foamy crash & wash envelope: Crests slightly after swell (t ~ 3.7s) and slowly washes out across sand
    let surfEnv = 0;
    if (t < 3.2) {
      surfEnv = Math.pow(t / 3.2, 3) * 0.4;
    } else {
      // Long soothing wash receding into wet sand
      surfEnv = Math.exp(-(t - 3.2) / 2.0);
    }

    const swellGain = swellEnv * 0.55;
    const surfGain = surfEnv * 0.38;

    left[i] = rumbleL * swellGain + foamL * surfGain;
    right[i] = rumbleR * swellGain + foamR * surfGain;
  }

  crossfadeLoop(left, right, bufferSize, Math.floor(sampleRate * 0.15));
  return buffer;
}

// 🌲 REALISTIC FOREST: Whispering canopy breeze + sweet melodic morning birds
function createForestBuffer(ctx: AudioContext): AudioBuffer {
  const duration = 8;
  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * duration;
  const buffer = ctx.createBuffer(2, bufferSize, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Background canopy breeze (soft warm lowpass)
  let lastL = 0, lastR = 0;
  for (let i = 0; i < bufferSize; i++) {
    const whiteL = Math.random() * 2 - 1;
    const whiteR = Math.random() * 2 - 1;
    lastL = (lastL + 0.012 * whiteL) / 1.012;
    lastR = (lastR + 0.012 * whiteR) / 1.012;
    left[i] = lastL * 0.32;
    right[i] = lastR * 0.32;
  }

  // Helper to synthesize a sweet, organic bird chirp with smooth bell envelope
  const addBirdCall = (startSec: number, chirpDuration: number, startFreq: number, endFreq: number, pan = 0.5, amp = 0.045) => {
    const startSample = Math.floor(startSec * sampleRate);
    const len = Math.floor(chirpDuration * sampleRate);

    for (let j = 0; j < len; j++) {
      const idx = startSample + j;
      if (idx < bufferSize) {
        const progress = j / len;
        const t = j / sampleRate;

        // Smooth natural pitch curve
        const freq = startFreq + (endFreq - startFreq) * Math.sin(progress * Math.PI);
        // Soft bell-shaped amplitude envelope (zero clicks at edges)
        const env = Math.pow(Math.sin(progress * Math.PI), 2) * amp;
        // Natural subtle vibrato
        const vibrato = Math.sin(2 * Math.PI * 40 * t) * 45;

        const sample = env * Math.sin(2 * Math.PI * (freq + vibrato) * t);
        left[idx] += sample * (1 - pan * 0.5);
        right[idx] += sample * (0.5 + pan * 0.5);
      }
    }
  };

  // Natural songbird phrases at calm intervals
  // Phrase 1 (t=1.4s): Gentle double chirp
  addBirdCall(1.4, 0.09, 2900, 3600, 0.35, 0.042);
  addBirdCall(1.56, 0.12, 3300, 4100, 0.38, 0.046);

  // Phrase 2 (t=4.0s): Sweet descending melody
  addBirdCall(4.0, 0.14, 3800, 3050, 0.70, 0.038);
  addBirdCall(4.22, 0.08, 3350, 3850, 0.65, 0.034);

  // Phrase 3 (t=6.5s): Quiet distant reply
  addBirdCall(6.5, 0.11, 3100, 3750, 0.45, 0.038);

  crossfadeLoop(left, right, bufferSize, Math.floor(sampleRate * 0.1));
  return buffer;
}

// 🍃 GENTLE WIND: Soft, resonant breeze blowing through open hills
function createWindBuffer(ctx: AudioContext): AudioBuffer {
  const duration = 7;
  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * duration;
  const buffer = ctx.createBuffer(2, bufferSize, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  let b0L = 0, b1L = 0;
  let b0R = 0, b1R = 0;

  for (let i = 0; i < bufferSize; i++) {
    const t = i / sampleRate;
    const whiteL = Math.random() * 2 - 1;
    const whiteR = Math.random() * 2 - 1;

    // Resonant bandpass-like air flow
    b0L = 0.975 * b0L + whiteL * 0.055;
    b1L = 0.940 * b1L + b0L * 0.035;

    b0R = 0.975 * b0R + whiteR * 0.055;
    b1R = 0.940 * b1R + b0R * 0.035;

    // Wandering gusts: Slow rhythmic breeze rising and subsiding
    const gustL = 0.55 + 0.45 * Math.sin((2 * Math.PI * t) / duration);
    const gustR = 0.55 + 0.45 * Math.sin(((2 * Math.PI * t) / duration) + 0.4);

    left[i] = b1L * gustL * 0.45;
    right[i] = b1R * gustR * 0.45;
  }

  crossfadeLoop(left, right, bufferSize, Math.floor(sampleRate * 0.1));
  return buffer;
}

// 🔥 REALISTIC FIREPLACE: Warm glowing hearth + genuine dry wood snaps & crackles (100% NO WATER DRIPPING!)
function createFireBuffer(ctx: AudioContext): AudioBuffer {
  const duration = 6;
  const sampleRate = ctx.sampleRate;
  const bufferSize = sampleRate * duration;
  const buffer = ctx.createBuffer(2, bufferSize, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // 1. Deep warm flame body (Brownian rumble)
  let rumbleL = 0, rumbleR = 0;
  for (let i = 0; i < bufferSize; i++) {
    const whiteL = Math.random() * 2 - 1;
    const whiteR = Math.random() * 2 - 1;

    // Soft low flame rumble
    rumbleL = (rumbleL + 0.018 * whiteL) / 1.018;
    rumbleR = (rumbleR + 0.018 * whiteR) / 1.018;

    // Faint dry sizzle from hot resin
    const sizzleL = (whiteL - Math.random() * 2 + 1) * 0.006;
    const sizzleR = (whiteR - Math.random() * 2 + 1) * 0.006;

    left[i] = rumbleL * 0.32 + sizzleL;
    right[i] = rumbleR * 0.32 + sizzleR;
  }

  // 2. Authentic wood crackles: PURE DRY NOISE IMPULSES (zero sine waves = zero water dripping sound!)
  // Natural fireplace has ~12-16 discrete dry sparks/crackles per second
  const crackleCount = duration * 14;

  for (let c = 0; c < crackleCount; c++) {
    const startSample = Math.floor(Math.random() * (bufferSize - sampleRate * 0.02));
    const pan = Math.random(); // Random stereo position across the hearth
    const isLoudSnap = Math.random() < 0.12;

    // Sharp, instantaneous impulse: 1 to 2.5 milliseconds
    const durationMs = isLoudSnap ? 0.0028 : 0.0014;
    const numSamples = Math.floor(sampleRate * durationMs);
    const amp = isLoudSnap ? 0.16 + Math.random() * 0.12 : 0.035 + Math.random() * 0.065;

    for (let j = 0; j < numSamples; j++) {
      const idx = startSample + j;
      if (idx < bufferSize) {
        // Ultra-fast exponential decay creates the crisp "snap" of dry pine/oak wood
        const decay = Math.exp(-j / (numSamples * 0.35));
        const noiseImpulse = (Math.random() * 2 - 1) * amp * decay;
        left[idx] += noiseImpulse * (1 - pan);
        right[idx] += noiseImpulse * pan;
      }
    }
  }

  crossfadeLoop(left, right, bufferSize, Math.floor(sampleRate * 0.1));
  return buffer;
}

function getSoundBuffer(ctx: AudioContext, type: AmbientSoundType): AudioBuffer | null {
  if (type === 'none') return null;

  // Invalidate cache if audio sample rate changed
  if (cachedSampleRate !== ctx.sampleRate) {
    Object.keys(bufferCache).forEach(k => delete bufferCache[k as AmbientSoundType]);
    cachedSampleRate = ctx.sampleRate;
  }

  if (bufferCache[type]) {
    return bufferCache[type]!;
  }

  let buf: AudioBuffer;
  switch (type) {
    case 'rain':
      buf = createRainBuffer(ctx);
      break;
    case 'waves':
      buf = createWavesBuffer(ctx);
      break;
    case 'forest':
      buf = createForestBuffer(ctx);
      break;
    case 'wind':
      buf = createWindBuffer(ctx);
      break;
    case 'fire':
      buf = createFireBuffer(ctx);
      break;
    default:
      return null;
  }

  bufferCache[type] = buf;
  return buf;
}

export function stopAmbientSound(fadeTimeMs = 500) {
  if (fadeTimeoutId) {
    clearTimeout(fadeTimeoutId);
    fadeTimeoutId = null;
  }

  if (!activeAmbient) {
    currentType = 'none';
    return;
  }

  const { sourceNode, gainNode } = activeAmbient;
  const ctx = getAudioContext();

  if (ctx && ctx.state !== 'closed') {
    const now = ctx.currentTime;
    const fadeDuration = fadeTimeMs / 1000;

    try {
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeDuration);

      fadeTimeoutId = setTimeout(() => {
        try {
          sourceNode.stop();
          sourceNode.disconnect();
          gainNode.disconnect();
        } catch {}
        fadeTimeoutId = null;
      }, fadeTimeMs + 50);
    } catch {
      try { sourceNode.stop(); } catch {}
    }
  }

  activeAmbient = null;
  currentType = 'none';
}

export function setAmbientVolume(volume: number) {
  currentVolume = Math.max(0, Math.min(1, volume));
  if (activeAmbient) {
    const ctx = getAudioContext();
    if (ctx) {
      const now = ctx.currentTime;
      activeAmbient.gainNode.gain.cancelScheduledValues(now);
      activeAmbient.gainNode.gain.linearRampToValueAtTime(currentVolume, now + 0.08);
    }
  }
}

export function getAmbientVolume(): number {
  return currentVolume;
}

export function getAmbientSound(): AmbientSoundType {
  return currentType;
}

export function playAmbientSound(type: AmbientSoundType, volume = currentVolume) {
  if (type === 'none') {
    stopAmbientSound();
    return;
  }

  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  // Smoothly fade out previous sound if one is currently playing
  if (activeAmbient) {
    stopAmbientSound(200);
  }

  currentVolume = volume;
  currentType = type;

  const buffer = getSoundBuffer(ctx, type);
  if (!buffer) return;

  const now = ctx.currentTime;
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.0001, now);
  masterGain.connect(ctx.destination);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  source.connect(masterGain);
  source.start(now);

  // Smooth 1.0s fade-in
  masterGain.gain.linearRampToValueAtTime(currentVolume, now + 1.0);

  activeAmbient = {
    sourceNode: source,
    gainNode: masterGain,
    type,
  };
}
