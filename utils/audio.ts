// Simple synth sound generator to avoid external assets
const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
};

const playTone = (freq: number, type: OscillatorType, duration: number, volume: number = 0.1) => {
  if (!audioCtx) initAudio();
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  
  gain.gain.setValueAtTime(volume, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
};

export const playSound = (effect: 'swap' | 'match' | 'invalid' | 'win' | 'pop') => {
  // Silent fallback if context fails
  try {
    switch (effect) {
      case 'swap':
        playTone(300, 'sine', 0.1);
        break;
      case 'invalid':
        playTone(150, 'sawtooth', 0.2);
        break;
      case 'match':
        playTone(400, 'sine', 0.1, 0.2);
        setTimeout(() => playTone(600, 'sine', 0.1, 0.2), 100);
        break;
      case 'pop':
        playTone(200, 'square', 0.1, 0.05);
        break;
      case 'win':
        playTone(400, 'sine', 0.2);
        setTimeout(() => playTone(500, 'sine', 0.2), 200);
        setTimeout(() => playTone(600, 'sine', 0.4), 400);
        break;
    }
  } catch (e) {
    console.warn("Audio playback failed", e);
  }
};