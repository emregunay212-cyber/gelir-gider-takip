import { useCallback, useEffect, useRef, useState } from 'react';

interface Options {
  lang?: string;
  /** True = recognition kullanıcı stop() çağırana kadar dinler. */
  continuous?: boolean;
  onFinalResult?: (transcript: string) => void;
  onInterimResult?: (transcript: string) => void;
  onError?: (error: string) => void;
}

interface State {
  supported: boolean;
  listening: boolean;
  transcript: string;
  error: string | null;
}

interface Controls {
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(options: Options = {}): State & Controls {
  const {
    lang = 'tr-TR',
    continuous = false,
    onFinalResult,
    onInterimResult,
    onError,
  } = options;

  const Recognition =
    typeof window !== 'undefined'
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition
      : undefined;
  const supported = Recognition !== undefined;

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  const start = useCallback(() => {
    if (!Recognition) {
      setError('not-supported');
      onError?.('not-supported');
      return;
    }

    setError(null);
    setTranscript('');

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
      const result = event.results[event.results.length - 1];
      const text = result[0].transcript;
      setTranscript(text);
      if (result.isFinal) {
        onFinalResult?.(text);
      } else {
        onInterimResult?.(text);
      }
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
  }, [Recognition, lang, continuous, onFinalResult, onInterimResult, onError]);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        // sessizce geç
      }
    };
  }, []);

  return { supported, listening, transcript, error, start, stop, reset };
}
