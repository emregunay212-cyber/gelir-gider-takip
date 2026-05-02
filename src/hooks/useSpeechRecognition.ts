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

    // Önceki recognition varsa kapat — race condition'ı önler
    try {
      recognitionRef.current?.abort();
    } catch {
      // sessizce geç
    }

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
      // Bazı tarayıcılar (Mobile Chrome Türkçe) continuous modda her segment
      // güncellendikçe AYNI segmenti tekrar tekrar isFinal olarak yollar
      // ("215" → "215 lira" → "215 lira çiğ köfte" → ...).
      // Bu yüzden segmentleri akıllıca birleştiriyoruz: yeni segment öncekini
      // prefix olarak içeriyorsa replace, yoksa yeni segment olarak ekle.
      const segments: string[] = [];
      let lastInterim = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript.trim();
        if (!text) continue;

        if (result.isFinal) {
          const prev = segments[segments.length - 1];
          if (
            prev &&
            (text.startsWith(prev) || prev.startsWith(text))
          ) {
            // Overlap var — daha uzun olanı tut (kümülatif güncelleme)
            segments[segments.length - 1] =
              text.length >= prev.length ? text : prev;
          } else if (prev !== text) {
            // Bağımsız yeni segment
            segments.push(text);
          }
        } else {
          lastInterim = text;
        }
      }

      setFinalText(segments.join(' '));
      setInterimText(lastInterim);
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
