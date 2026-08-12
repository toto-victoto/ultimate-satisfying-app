import { Platform } from 'react-native';

type AudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

let context: AudioContext | null = null;
let muted = false;

function getContext() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const AudioCtor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!AudioCtor) return null;
  context ??= new AudioCtor();
  if (context.state === 'suspended') void context.resume();
  return context;
}

function voice(options: {
  from: number;
  to: number;
  duration: number;
  volume?: number;
  type?: OscillatorType;
  delay?: number;
}) {
  if (muted) return;
  const ctx = getContext();
  if (!ctx) return;
  const now = ctx.currentTime + (options.delay ?? 0);
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = options.type ?? 'sine';
  oscillator.frequency.setValueAtTime(Math.max(20, options.from), now);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, options.to), now + options.duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(options.volume ?? 0.12, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(now);
  oscillator.stop(now + options.duration + 0.02);
}

export function setSynthMuted(value: boolean) { muted = value; }
export function isSynthSupported() { return Platform.OS === 'web'; }

export function playPop(size = 60) {
  const pitch = 620 - Math.max(0, Math.min(100, size)) * 2.4;
  voice({ from: pitch * 1.45, to: pitch * 0.62, duration: 0.085, volume: 0.11, type: 'sine' });
  voice({ from: pitch * 2.1, to: pitch * 1.15, duration: 0.035, volume: 0.025, type: 'triangle' });
}

export function playWave() {
  voice({ from: 410, to: 175, duration: 0.62, volume: 0.055, type: 'sine' });
  voice({ from: 610, to: 260, duration: 0.48, volume: 0.018, type: 'sine', delay: 0.025 });
}

export function playPressureStart() {
  voice({ from: 95, to: 185, duration: 0.46, volume: 0.07, type: 'sine' });
}

export function playPressureRelease() {
  voice({ from: 150, to: 54, duration: 0.19, volume: 0.16, type: 'sine' });
  voice({ from: 420, to: 95, duration: 0.12, volume: 0.045, type: 'triangle' });
}

export function playSquish() {
  voice({ from: 230, to: 72, duration: 0.16, volume: 0.09, type: 'triangle' });
}

export function playBounce() {
  voice({ from: 115, to: 370, duration: 0.13, volume: 0.085, type: 'sine' });
  voice({ from: 370, to: 220, duration: 0.1, volume: 0.045, type: 'sine', delay: 0.13 });
}

export function playStretchTick(tension: number) {
  const normalized = Math.max(0, Math.min(1, tension));
  const pitch = 180 + normalized * 480;
  voice({ from: pitch, to: pitch * 0.82, duration: 0.045, volume: 0.025 + normalized * 0.025, type: 'triangle' });
}

export function playStretchReturn() {
  voice({ from: 330, to: 125, duration: 0.22, volume: 0.06, type: 'sine' });
}
