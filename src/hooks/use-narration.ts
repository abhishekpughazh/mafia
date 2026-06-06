import { useCallback, useRef } from 'react';

/**
 * useNarration — wraps the Web Speech API to speak text out loud.
 * The TV host uses this to narrate game events automatically.
 */
export function useNarration() {
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string, options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
  }) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = options?.rate ?? 0.88;
    utterance.pitch = options?.pitch ?? 0.9;
    utterance.volume = options?.volume ?? 1;

    // Prefer a deep/dramatic voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      v.name.toLowerCase().includes('daniel') ||
      v.name.toLowerCase().includes('alex') ||
      v.name.toLowerCase().includes('google uk english male') ||
      v.name.toLowerCase().includes('male')
    );
    if (preferred) utterance.voice = preferred;

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { speak, stop };
}
