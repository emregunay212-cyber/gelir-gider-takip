import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface Options {
  lang?: string;
  /** True = recognition kullanıcı stop() çağırana kadar dinler. */
  continuous?: boolean;
  onError?: (error: string) => void;
}

interface State {
  supported: boolean;
  listening: boolean;
  /** Tüm session'ların kesinleşmiş (final) metni — duplicate-safe. */
  finalText: string;
  /** Şu an konuşulan ama henüz kesinleşmeyen interim metin. */
  interimText: string;
  error: string | null;
}

interface Controls {
  start: () => void;
  stop: () => void;
  /** finalText + interimText'i sıfırlar. */
  reset: () => void;
}

/**
 * Web Speech API wrapper'ı.
 *
 * "Devam" senaryosu için iki kademeli buffer:
 *  - committedText: stop edilmiş önceki session'ların kesinleşmiş metni
 *  - currentSegments: aktif session'da gelen segmentler (kümülatif update'e dayanıklı)
 *  - finalText = committedText + currentSegments birleşimi
 *
 * Yeni `start()` çağrılırsa current → committed'a taşınır, yeni session sıfırdan başlar.
 */
export function useSpeechRecognition(options: Options = {}): State & Controls {
  const { lang = 'tr-TR', continuous = false, onError } = options;

  const Recognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition
      : undefined;
  const supported = Recognition !== undefined;

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const [committedText, setCommittedText] = useState('');
  const [currentSegments, setCurrentSegments] = useState<string[]>([]);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const finalText = useMemo(() => {
    const current = currentSegments.join(' ').trim();
    return [committedText, current].filter(Boolean).join(' ').trim();
  }, [committedText, currentSegments]);

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // sessizce geç
    }
  }, []);

  const reset = useCallback(() => {
    setCommittedText('');
    setCurrentSegments([]);
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

    // Önceki session'da current segmentler varsa committed'a taşı
    setCommittedText((prev) => {
      const current = currentSegments.join(' ').trim();
      return [prev, current].filter(Boolean).join(' ').trim();
    });
    setCurrentSegments([]);
    setInterimText('');

    // Önceki recognition objesini abort et
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
      // Speech API kümülatif update yapıyor (özellikle Mobile Chrome Türkçe).
      // Smart accumulate: yeni segment öncekini prefix olarak içeriyorsa
      // daha uzun olanı tut, bağımsız yeni segment ise listeye ekle.
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
            segments[segments.length - 1] =
              text.length >= prev.length ? text : prev;
          } else if (prev !== text) {
            segments.push(text);
          }
        } else {
          lastInterim = text;
        }
      }

      setCurrentSegments(segments);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
