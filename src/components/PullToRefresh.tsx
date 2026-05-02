import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onRefresh?: () => Promise<void> | void;
  children: ReactNode;
  /** Aşağı çekme eşiği (px). Bunu geçerse refresh tetiklenir. */
  threshold?: number;
  /** Maksimum görünür çekme mesafesi (px). */
  maxPull?: number;
}

/**
 * Mobil pull-to-refresh — sayfa en üstteyken aşağı çek, eşiği geç, bırak.
 * Spring animasyonlu indicator + content offset.
 * Firestore realtime sub olduğu için onRefresh kısa bir placebo gecikme.
 */
export function PullToRefresh({
  onRefresh,
  children,
  threshold = 72,
  maxPull = 110,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleTouchEnd = useCallback(async () => {
    const reached = pullDistance >= threshold;
    startY.current = null;

    if (reached && !refreshing) {
      setRefreshing(true);
      try {
        await Promise.resolve(onRefresh?.());
        // Firestore realtime — minimal placebo gecikme ki spinner görünür kalsın
        await new Promise((resolve) => setTimeout(resolve, 500));
      } finally {
        setRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, threshold, onRefresh]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    function onTouchStart(event: TouchEvent) {
      if (refreshing) return;
      const scrollTop =
        document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop > 0) {
        startY.current = null;
        return;
      }
      const touch = event.touches[0];
      if (!touch) return;
      startY.current = touch.clientY;
    }

    function onTouchMove(event: TouchEvent) {
      if (startY.current == null) return;
      if (refreshing) return;
      const touch = event.touches[0];
      if (!touch) return;
      const delta = touch.clientY - startY.current;
      if (delta <= 0) {
        setPullDistance(0);
        return;
      }
      // Apple-style resistance
      const resistance = delta * 0.5;
      setPullDistance(Math.min(resistance, maxPull));
    }

    node.addEventListener('touchstart', onTouchStart, { passive: true });
    node.addEventListener('touchmove', onTouchMove, { passive: true });
    node.addEventListener('touchend', handleTouchEnd);
    node.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      node.removeEventListener('touchstart', onTouchStart);
      node.removeEventListener('touchmove', onTouchMove);
      node.removeEventListener('touchend', handleTouchEnd);
      node.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [refreshing, maxPull, handleTouchEnd]);

  const reached = pullDistance >= threshold;
  const indicatorOffset = refreshing ? threshold : pullDistance;
  const contentOffset = refreshing ? threshold * 0.55 : pullDistance * 0.5;
  const arrowRotate = reached ? 180 : 0;
  const opacity = Math.min(1, pullDistance / 30);

  return (
    <div ref={containerRef} className="relative">
      {/* Indicator — sayfa en üstünden aşağı kayar */}
      <motion.div
        aria-hidden={!refreshing && pullDistance < 8}
        className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center"
        animate={{ y: indicatorOffset - 36 }}
        transition={
          refreshing || pullDistance > 0
            ? { type: 'spring', stiffness: 350, damping: 28 }
            : { duration: 0.18, ease: 'easeOut' }
        }
        style={{ opacity }}
      >
        <div className="flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[11px] font-medium text-muted-foreground shadow-lg">
          {refreshing ? (
            <>
              <Loader2 className="size-3.5 animate-spin text-primary" />
              <span>Yenileniyor…</span>
            </>
          ) : (
            <>
              <motion.span
                animate={{ rotate: arrowRotate }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="inline-flex"
              >
                <ArrowDown className="size-3.5" />
              </motion.span>
              <span>{reached ? 'Bırak' : 'Yenile'}</span>
            </>
          )}
        </div>
      </motion.div>

      {/* İçerik — bir miktar aşağı kayar (tactile feedback) */}
      <motion.div
        animate={{ y: contentOffset }}
        transition={
          refreshing || pullDistance > 0
            ? { type: 'spring', stiffness: 350, damping: 28 }
            : { duration: 0.2, ease: 'easeOut' }
        }
      >
        {children}
      </motion.div>
    </div>
  );
}
