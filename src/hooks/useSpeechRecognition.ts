import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  lang?: string;
  /** True = recognition kullanıcı stop() çağırana kadar dinler. */
  continuous?: boolean;
  onError?: (error: string) => void;
}

interface State {
  supported: boolean;
  listening: boolean;
  /** Tüm session'ın kesinleşmiş (final) metni — duplicate-safe. */
  finalText: string;
  /** Şu an konuşulan ama henüz kesinleşmeyen interim metin. */
  interimText: string;
  error: string | null;
}

interface Controls {
  start: () => void;
  stop: () => void;
  /** finalText + interimText'i sıfırlar; recognition state'i değiştirmez. */
  reset: () => void;
}

export function useSpeechRecognition(options: Options = {}): State & Controls {
  const { lang = 'tr-TR', continuous = false, onError } = options;

  const Recognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition
      : undefined;
  const supported = Recognition !== undefined;

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // sessizce geç
    }
  }, []);

  const reset = useCallback(() => {
    setFinalText('');
    setInterimText('');
    setError(null);
  }, []);

  const start = useCallback(() => {
    if (!Recognition) {
      setError('not-supported');
      onError?.('not-supported');
      return;
    }

    setError(null);

    const rec = new Recognition();
    rec.lang = lang;
    rec.continuous = continuous;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = (event) => {
      setError(event.error);
      setListening(false);
      onError?.(event.error);
    };
    rec.onresult = (event) => {
      // Web Speech API event.results'ta SESSION'IN TAMAMI vardır.
      // Her tetikte sıfırdan yeniden hesapla — duplicate önlenir.
      let nextFinal = '';
      let nextInterim = '';
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          nextFinal += (nextFinal ? ' ' : '') + text.trim();
        } else {
          nextInterim = text.trim();
        }
      }
      setFinalText(nextFinal);
      setInterimText(nextInterim);
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown';
      setError(message);
      onError?.(message);
      setListening(false);
    }
  }, [Recognition, lang, continuous, onError]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        // sessizce geç
      }
    };
  }, []);

  return {
    supported,
    listening,
    finalText,
    interimText,
    error,
    start,
    stop,
    reset,
  };
}
