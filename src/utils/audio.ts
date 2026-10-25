import confetti from 'canvas-confetti';

// Global AudioContext singleton to bypass autoplay policies
let audioCtx: AudioContext | null = null;
let sfxEnabled = true;

if (typeof window !== 'undefined') {
  const stored = localStorage.getItem('zen_sfx_enabled');
  if (stored !== null) sfxEnabled = stored === 'true';
}

export const isSoundEffectsEnabled = (): boolean => sfxEnabled;

export const setSoundEffectsEnabled = (enabled: boolean): void => {
  sfxEnabled = enabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem('zen_sfx_enabled', String(enabled));
  }
};

export const getAudioContext = () => {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
};

// Initialize and resume the context on first user interaction
export const initAudioContext = () => {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume();
  }
};

export const playSoftPop = () => {
  if (!sfxEnabled) return;
  try {
    // Premium Haptic Feedback (micro-vibration)
    if (typeof window !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }

    const ctx = getAudioContext();
    if (!ctx) return;
    
    // Resume context if suspended
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = 'sine';
    
    const randomFreq = 580 + Math.random() * 40;
    osc.frequency.setValueAtTime(randomFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // Ignore audio errors
  }
};

/** Organic, crisp bamboo/woodblock click when checking tasks and subtasks */
export const playBambooTap = () => {
  if (!sfxEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(950, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.07);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(920, ctx.currentTime);
    filter.Q.setValueAtTime(6.0, ctx.currentTime);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.003);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.075);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch {}
};

/** Pure crystal water drop sound when adding tasks or switching calendar dates */
export const playWaterDrop = () => {
  if (!sfxEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(650, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1650, ctx.currentTime + 0.11);

    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.015);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.13);
  } catch {}
};

/** Deep Tibetan singing bowl chime with harmonic richness */
export const playSingingBowl = () => {
  if (!sfxEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const fundamental = 216;
    const harmonics = [fundamental, fundamental * 2.002, fundamental * 3.004, fundamental * 4.006];
    const harmonicGains = [0.45, 0.35, 0.15, 0.05];

    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);

    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + 0.04);
    masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.2);

    harmonics.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      oscGain.gain.setValueAtTime(harmonicGains[idx], ctx.currentTime);

      osc.connect(oscGain);
      oscGain.connect(masterGain);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 3.3);
    });
  } catch {}
};

/** Soft paper / breeze swoosh for swipe or rollover actions */
export const playSoftSwoosh = () => {
  if (!sfxEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const bufferSize = ctx.sampleRate * 0.14;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.8 + white * 0.2;
      data[i] = last;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.Q.setValueAtTime(1.5, ctx.currentTime);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(ctx.currentTime);
    noise.stop(ctx.currentTime + 0.15);
  } catch {}
};

/** Cascading gentle sakura cherry blossom petals across the screen */
export const triggerSakuraPetals = () => {
  try {
    const duration = 2.2 * 1000;
    const animationEnd = Date.now() + duration;
    const colors = ['#fbcfe8', '#f472b6', '#fda4af', '#fecdd3', '#ffffff'];

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 45,
        origin: { x: 0, y: 0.15 },
        colors,
        gravity: 0.55,
        scalar: 1.15,
        drift: 0.6,
        ticks: 200,
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 45,
        origin: { x: 1, y: 0.15 },
        colors,
        gravity: 0.55,
        scalar: 1.15,
        drift: -0.6,
        ticks: 200,
      });

      if (Date.now() < animationEnd) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  } catch {}
};

export const playZenChime = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    if (ctx.state === 'suspended') ctx.resume();

    const fundamental = 432;
    const freqs = [fundamental, fundamental * 2.76, fundamental * 5.4, fundamental * 8.9];
    const gains = [1, 0.6, 0.4, 0.1];
    
    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4.0);

    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = freq;
      oscGain.gain.value = gains[i];
      
      osc.connect(oscGain);
      oscGain.connect(masterGain);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 4.5);
    });
  } catch (e) {
    // Ignore audio errors
  }
};
