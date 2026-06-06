import { useCallback, useRef } from 'react';

/**
 * useAlarm — generates alarm/notification sounds using the Web Audio API.
 * No external audio files needed.
 */
export function useAlarm() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getCtx = () => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  };

  /**
   * Play a dramatic alarm — three escalating buzzer bursts
   */
  const playAlarm = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;

    const playBurst = (startTime: number, freq: number, duration: number) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(freq, startTime);
      oscillator.frequency.exponentialRampToValueAtTime(freq * 1.5, startTime + duration * 0.5);
      oscillator.frequency.exponentialRampToValueAtTime(freq, startTime + duration);

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.6, startTime + 0.02);
      gainNode.gain.setValueAtTime(0.6, startTime + duration - 0.05);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // Three rapid alarm bursts
    playBurst(now, 880, 0.3);
    playBurst(now + 0.35, 988, 0.3);
    playBurst(now + 0.70, 1046, 0.4);
    playBurst(now + 1.20, 880, 0.3);
    playBurst(now + 1.55, 988, 0.3);
    playBurst(now + 1.90, 1046, 0.4);
  }, []);

  /**
   * Play a soft chime — used for gentle phase transitions
   */
  const playChime = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;

    const playNote = (startTime: number, freq: number, duration: number) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, startTime);

      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playNote(now, 523.25, 0.8);       // C5
    playNote(now + 0.15, 659.25, 0.8); // E5
    playNote(now + 0.30, 783.99, 1.0); // G5
  }, []);

  /**
   * Play an elimination sound — a low dramatic thud
   */
  const playElimination = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Low drone
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 1.5);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    osc.start(now);
    osc.stop(now + 1.5);
  }, []);

  return { playAlarm, playChime, playElimination };
}
