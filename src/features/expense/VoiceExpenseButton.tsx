import { useCallback, useState } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import {
  parseExpenseFromSpeech,
  type ParsedExpense,
} from '@/lib/voice-parser';
import { AddExpenseDialog } from './AddExpenseDialog';

export function VoiceExpenseButton() {
  const [open, setOpen] = useState(false);
  const [defaults, setDefaults] = useState<Partial<ParsedExpense> | undefined>(
    undefined,
  );

  const handleFinal = useCallback((text: string) => {
    const parsed = parseExpenseFromSpeech(text);
    if (parsed.amount > 0) {
      setDefaults(parsed);
      setOpen(true);
      toast.success('Anlaşıldı 🎤', { description: text });
    } else {
      toast.error('Tutarı anlayamadım', {
        description: `"${text}" — örn: "105 TL sigara aldım Garanti'den"`,
      });
    }
  }, []);

  const handleError = useCallback((error: string) => {
    if (error === 'no-speech') {
      toast.warning('Ses algılanmadı', { description: 'Tekrar dener misin?' });
    } else if (error === 'not-allowed') {
      toast.error('Mikrofon izni gerekli', {
        description: 'Tarayıcı ayarlarından izin ver.',
      });
    } else if (error !== 'aborted') {
      toast.error('Ses tanıma hatası', { description: error });
    }
  }, []);

  const { supported, listening, transcript, start, stop } =
    useSpeechRecognition({
      onFinalResult: handleFinal,
      onError: handleError,
    });

  if (!supported) return null;

  return (
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.03 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        onClick={listening ? stop : start}
        aria-label={listening ? 'Dinlemeyi durdur' : 'Sesle harcama ekle'}
        className={`flex size-14 shrink-0 items-center justify-center rounded-xl shadow-md transition-colors ${
          listening
            ? 'bg-red-500 text-white animate-pulse'
            : 'bg-white text-indigo-700 hover:bg-white/95'
        }`}
      >
        {listening ? <MicOff className="size-6" /> : <Mic className="size-6" />}
      </motion.button>

      <AnimatePresence>
        {listening && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={stop}
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="mx-4 max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative mx-auto mb-4 flex size-20 items-center justify-center">
                {/* Pulse rings */}
                <motion.span
                  className="absolute inset-0 rounded-full bg-red-500/20"
                  animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
                <motion.span
                  className="absolute inset-0 rounded-full bg-red-500/30"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: 0.4 }}
                />
                <span className="relative flex size-16 items-center justify-center rounded-full bg-red-500 text-white">
                  <Mic className="size-8" />
                </span>
              </div>
              <p className="text-base font-semibold">Sizi dinliyorum…</p>
              <p className="mt-2 min-h-[3rem] text-sm text-muted-foreground">
                {transcript || (
                  <span className="italic">
                    Örn: "105 TL sigara aldım Garanti'den"
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={stop}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Loader2 className="size-3 animate-spin" />
                Bekleniyor — durdur
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AddExpenseDialog
        open={open}
        onClose={() => {
          setOpen(false);
          setDefaults(undefined);
        }}
        defaults={defaults}
      />
    </>
  );
}
