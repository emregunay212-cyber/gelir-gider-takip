import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, ChevronRight, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useReminders, type Reminder } from './useReminders';
import { formatTRY } from '@/lib/format';
import { showNotification } from '@/lib/notifications';

const SEVERITY_STYLES = {
  info: 'border-primary/30 bg-primary/5 text-primary',
  warning:
    'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5 text-[var(--color-warning)]',
  danger:
    'border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 text-[var(--color-danger)]',
} as const;

const NOTIFIED_LS_KEY_PREFIX = 'reminder_notified_';

/**
 * Bugün için aksiyon gerektiren hatırlatmaları kart olarak gösterir.
 * Ayrıca her hatırlatma için (gün başına bir kez) push notification yollar.
 */
export function RemindersCard() {
  const navigate = useNavigate();
  const { reminders } = useReminders();
  const notifiedRef = useRef<Set<string>>(new Set());

  // Push notification: aynı reminder günde bir kez gönderilir
  useEffect(() => {
    if (reminders.length === 0) return;
    if (typeof window === 'undefined') return;
    if (
      typeof Notification === 'undefined' ||
      Notification.permission !== 'granted'
    ) {
      return;
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    for (const reminder of reminders) {
      const flagKey = `${NOTIFIED_LS_KEY_PREFIX}${reminder.id}_${today}`;
      if (notifiedRef.current.has(flagKey)) continue;

      try {
        const stored = localStorage.getItem(flagKey);
        if (stored) {
          notifiedRef.current.add(flagKey);
          continue;
        }
      } catch {
        // localStorage yok — devam et
      }

      // Sadece urgent (warning/danger) için push at, info'lar sessiz kalsın
      if (reminder.severity !== 'info') {
        void showNotification({
          title: reminder.title,
          body: reminder.message,
          tag: reminder.id,
          requireInteraction: reminder.severity === 'danger',
        });
      }

      try {
        localStorage.setItem(flagKey, '1');
      } catch {
        // sessizce geç
      }
      notifiedRef.current.add(flagKey);
    }
  }, [reminders]);

  if (reminders.length === 0) return null;

  return (
    <Card className="border-dashed border-amber-500/30 bg-amber-500/5">
      <CardContent className="space-y-2 p-3">
        <div className="flex items-center gap-2">
          <Bell className="size-4 text-amber-300" />
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
            Bugünün Hatırlatmaları
          </p>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {reminders.length} öge
          </span>
        </div>
        <ul className="space-y-1.5">
          <AnimatePresence initial={false}>
            {reminders.map((reminder, index) => (
              <ReminderRow
                key={reminder.id}
                reminder={reminder}
                index={index}
                onClick={() => {
                  if (reminder.href) navigate(reminder.href);
                }}
              />
            ))}
          </AnimatePresence>
        </ul>
      </CardContent>
    </Card>
  );
}

interface RowProps {
  reminder: Reminder;
  index: number;
  onClick: () => void;
}

function ReminderRow({ reminder, index, onClick }: RowProps) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{
        duration: 0.25,
        delay: index * 0.04,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors hover:opacity-90 ${
          SEVERITY_STYLES[reminder.severity]
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{reminder.title}</p>
          <p className="truncate text-[11px] opacity-80">{reminder.message}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {reminder.amount != null && reminder.amount > 0 && (
            <span className="text-sm font-semibold tabular-nums">
              {formatTRY(reminder.amount)}
            </span>
          )}
          {reminder.href ? (
            <ChevronRight className="size-3.5 shrink-0" />
          ) : (
            <X className="size-3.5 shrink-0" />
          )}
        </div>
      </button>
    </motion.li>
  );
}
