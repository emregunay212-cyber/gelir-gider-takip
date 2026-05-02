import { useCallback, useState } from 'react';
import { Mic, MicOff, Check, Plus, RotateCcw, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import {
  parseExpenseFromSpeech,
  type ParsedExpense,
} from '@/lib/voice-parser';
import { AddExpenseDialog } from './AddExpenseDialog';

export function VoiceExpenseButton() {
  const [overlay, setOverlay] = useState(false);
  const [open, setOpen] = useState(false);
  const [defaults, setDefaults] = useState<ParsedExpense | undefined>();

  const handleError = useCallback((error: string) => {
    if (error === 'no-speech') return;
    if (error === 'aborted') return;
    if (error === 'not-allowed') {
      toast.error('Mikrofon izni gerekli', {
        description: 'Tarayıcı ayarlarından izin ver.',
      });
      return;
    }
    toast.error('Ses tanıma hatası', { description: error });
  }, []);

  const {
    supported,
    listening,
    finalText,
    interimText,
    start,
    stop,
    reset,
  } = useSpeechRecognition({
    continuous: true,
    onError: handleError,
  });

  const displayText = (finalText + (interimText ? ` ${interimText}` : '')).trim();

  function openOverlay() {
    setOverlay(true);
    reset();
    start();
  }

  function closeOverlay() {
    stop();
    reset();
    setOverlay(false);
  }

  function handleConfirm() {
    stop();
    const text = displayText;
    if (!text) {
      toast.warning('Henüz bir şey söylemedin');
      return;
    }
    const parsed = parseExpenseFromSpeech(text);
    if (parsed.amount <= 0) {
      toast.error('Tutarı anlayamadım', {
        description: `"${text}" — örn: "215 TL çiğ köfte aldım"`,
      });
      return;
    }
    setDefaults(parsed);
    setOverlay(false);
    reset();
    setOpen(true);
    toast.success('Anlaşıldı 🎤', { description: text });
  }

  function handleContinue() {
    if (!listening) start();
  }

  function handleReset() {
    stop();
    reset();
    setTimeout(() => start(), 100);
  }

  function handleToggleMic() {
    if (listening) {
      stop();
    } else {
      start();
    }
  }

  if (!supported) return null;

  return (
    <>
      <motion.button
        type="button"
        whileTap={{ scale: 0.92 }}
        whileHover={{ scale: 1.03 }}
        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
        onClick={openOverlay}
        aria-label="Sesle harcama ekle"
        className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-700 shadow-md hover:bg-white/95"
      >
        <Mic className="size-6" />
      </motion.button>

      <AnimatePresence>
        {overlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-3 backdrop-blur-sm sm:items-center"
          >
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Sesle Harcama Ekle</p>
                <button
                  type="button"
                  onClick={closeOverlay}
                  aria-label="Kapat"
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Mic durum göstergesi */}
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleToggleMic}
                  aria-label={listening ? 'Dinlemeyi durdur' : 'Konuşmaya başla'}
                  className="relative flex size-20 items-center justify-center"
                >
                  {listening && (
                    <>
                      <motion.span
                        className="absolute inset-0 rounded-full bg-red-500/20"
                        animate={{
                          scale: [1, 1.6, 1],
                          opacity: [0.5, 0, 0.5],
                        }}
                        transition={{ duration: 1.6, repeat: Infinity }}
                      />
                      <motion.span
                        className="absolute inset-0 rounded-full bg-red-500/30"
                        animate={{
                          scale: [1, 1.4, 1],
                          opacity: [0.6, 0, 0.6],
                        }}
                        transition={{
                          duration: 1.6,
                          repeat: Infinity,
                          delay: 0.4,
                        }}
                      />
                    </>
                  )}
                  <span
                    className={`relative flex size-16 items-center justify-center rounded-full text-white transition-colors ${
                      listening ? 'bg-red-500' : 'bg-muted-foreground/40'
                    }`}
                  >
                    {listening ? (
                      <Mic className="size-8" />
                    ) : (
                      <MicOff className="size-8" />
                    )}
                  </span>
                </button>
              </div>

              <p className="text-center text-xs text-muted-foreground">
                {listening
                  ? '🔴 Dinliyorum… mikrofona tıklayarak duraklatabilirsin'
                  : 'Mikrofona tıklayarak konuşmaya devam et'}
              </p>

              {/* Canlı transcript kutusu */}
              <div className="min-h-[6rem] rounded-xl border border-border bg-muted/30 p-3 text-sm leading-relaxed">
                {displayText ? (
                  <span className="break-words">
                    <span className="text-foreground">{finalText}</span>
                    {interimText && (
                      <span className="ml-1 text-muted-foreground italic">
                        {interimText}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground italic">
                    Örn: "215 TL çiğ köfte aldım Garanti'den"
                  </span>
                )}
              </div>

              {/* Aksiyon butonları */}
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="h-12"
                  title="Konuşmayı sıfırla, baştan başla"
                >
                  <RotateCcw className="size-4" />
                  Yeniden
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleContinue}
                  disabled={listening}
                  className="h-12"
                  title="Konuşmaya ekleme yap"
                >
                  <Plus className="size-4" />
                  Devam
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirm}
                  disabled={!displayText}
                  className="h-12"
                  title="Bittiğinde harcamayı kaydet"
                >
                  <Check className="size-4" />
                  Tamam
                </Button>
              </div>
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
