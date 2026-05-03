import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/components/ui/card';
import { useExpense } from '@/features/expense/ExpenseProvider';
import { useSettings } from '@/features/settings/SettingsProvider';
import { formatTRY, monthLabel, getDaysInMonth } from '@/lib/format';

interface Props {
  /** YYYY-MM */
  month: string;
}

interface DayCell {
  date: string; // YYYY-MM-DD
  day: number; // 1-31
  total: number;
  ratio: number; // 0-1+ (1 = limit, 1+ = aşım)
}

const WEEKDAY_LABELS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

/**
 * GitHub-style takvim heatmap: ayın her günü kare, harcama yoğunluğuna
 * göre renk tonu. Pazartesi haftanın başı.
 */
export function MonthHeatmap({ month }: Props) {
  const { entries } = useExpense();
  const { dailyLimit } = useSettings();
  const [hoveredDay, setHoveredDay] = useState<DayCell | null>(null);

  const cells: DayCell[] = useMemo(() => {
    const days = getDaysInMonth(month);
    const list: DayCell[] = [];
    for (let d = 1; d <= days; d++) {
      const dayStr = d.toString().padStart(2, '0');
      const date = `${month}-${dayStr}`;
      const dayEntries = entries.filter((e) => e.date === date);
      const total = dayEntries.reduce((s, e) => s + e.amount, 0);
      const ratio = dailyLimit > 0 ? total / dailyLimit : 0;
      list.push({ date, day: d, total, ratio });
    }
    return list;
  }, [month, entries, dailyLimit]);

  // Ayın 1'inin haftaiçi indeksi (Pzt=0)
  const firstDay = new Date(`${month}-01`);
  const dayOfWeek = (firstDay.getDay() + 6) % 7; // Sun=0 → Pzt=0 base
  const padding = Array.from({ length: dayOfWeek });

  if (cells.every((c) => c.total === 0)) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {monthLabel(month)} — Günlük Yoğunluk
          </p>
          {hoveredDay && (
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {hoveredDay.day}.
              <span className="ml-1 font-semibold text-foreground">
                {formatTRY(hoveredDay.total)}
              </span>
            </p>
          )}
        </div>

        {/* Haftaiçi başlıkları */}
        <div className="mb-1 grid grid-cols-7 gap-1 text-[9px] text-muted-foreground">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="text-center">
              {label}
            </div>
          ))}
        </div>

        {/* Hücre grid */}
        <div className="grid grid-cols-7 gap-1">
          {padding.map((_, i) => (
            <div key={`pad-${i}`} aria-hidden />
          ))}
          {cells.map((cell, idx) => (
            <Cell
              key={cell.date}
              cell={cell}
              index={idx}
              onHover={() => setHoveredDay(cell)}
              onLeave={() => setHoveredDay(null)}
            />
          ))}
        </div>

        <Legend />
      </CardContent>
    </Card>
  );
}

interface CellProps {
  cell: DayCell;
  index: number;
  onHover: () => void;
  onLeave: () => void;
}

function Cell({ cell, index, onHover, onLeave }: CellProps) {
  const tone = colorTone(cell.ratio, cell.total);
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.25,
        delay: index * 0.01,
        ease: [0.16, 1, 0.3, 1],
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onFocus={onHover}
      onBlur={onLeave}
      className={`aspect-square rounded text-[9px] font-medium tabular-nums transition-transform hover:scale-110 ${tone.bg} ${tone.text}`}
      aria-label={`${cell.day}. gün: ${formatTRY(cell.total)}`}
    >
      {cell.day}
    </motion.button>
  );
}

interface Tone {
  bg: string;
  text: string;
}

/**
 * 5 seviyeli ton:
 *   0       → boş (gri ton, sadece sayı)
 *   0-0.5   → emerald (rahat)
 *   0.5-0.8 → yellow  (orta)
 *   0.8-1   → orange  (limit yaklaşıyor)
 *   1+      → red     (aşım)
 */
function colorTone(ratio: number, total: number): Tone {
  if (total === 0) {
    return {
      bg: 'bg-muted/30',
      text: 'text-muted-foreground',
    };
  }
  if (ratio < 0.5) {
    return {
      bg: 'bg-emerald-500/30',
      text: 'text-emerald-100',
    };
  }
  if (ratio < 0.8) {
    return {
      bg: 'bg-yellow-500/40',
      text: 'text-yellow-50',
    };
  }
  if (ratio < 1) {
    return {
      bg: 'bg-orange-500/50',
      text: 'text-white',
    };
  }
  return {
    bg: 'bg-red-500/70',
    text: 'text-white',
  };
}

function Legend() {
  return (
    <div className="mt-2 flex items-center justify-center gap-1.5 text-[9px] text-muted-foreground">
      <span>az</span>
      <span className="size-3 rounded bg-muted/30" />
      <span className="size-3 rounded bg-emerald-500/30" />
      <span className="size-3 rounded bg-yellow-500/40" />
      <span className="size-3 rounded bg-orange-500/50" />
      <span className="size-3 rounded bg-red-500/70" />
      <span>çok</span>
    </div>
  );
}
