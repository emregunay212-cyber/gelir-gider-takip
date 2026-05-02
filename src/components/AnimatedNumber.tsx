import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';

interface Props {
  value: number;
  format?: (n: number) => string;
  className?: string;
  /** ms cinsinden animasyon süresi (varsayılan: spring physics ile ~600ms) */
  bounce?: number;
  duration?: number;
}

/**
 * Sayı değişimlerinde spring fizik tabanlı yumuşak count-up.
 * Sıfırdan veya önceki değerden hedefe akıcı şekilde geçer.
 */
export function AnimatedNumber({
  value,
  format,
  className,
  bounce = 0.2,
  duration = 0.8,
}: Props) {
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, {
    bounce,
    duration: duration * 1000,
  });
  const display = useTransform(spring, (latest) =>
    format ? format(latest) : Math.round(latest).toLocaleString('tr-TR'),
  );

  useEffect(() => {
    motionValue.set(value);
  }, [motionValue, value]);

  return <motion.span className={className}>{display}</motion.span>;
}

interface CountUpProps {
  value: number;
  durationMs?: number;
  format?: (n: number) => string;
  className?: string;
}

/**
 * İlk render'da 0'dan hedef değere sayar (RAF tabanlı).
 * Sonraki değer değişimlerinde mevcut değerden yenisine geçer.
 */
export function CountUp({
  value,
  durationMs = 800,
  format,
  className,
}: CountUpProps) {
  const [current, setCurrent] = useState<number>(0);
  const startRef = useRef<number>(0);
  const fromRef = useRef<number>(0);

  useEffect(() => {
    fromRef.current = current;
    startRef.current = performance.now();
    let raf = 0;

    function tick(now: number) {
      const elapsed = now - startRef.current;
      const progress = Math.min(1, elapsed / durationMs);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = fromRef.current + (value - fromRef.current) * eased;
      setCurrent(next);
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  return (
    <span className={className}>
      {format ? format(current) : Math.round(current).toLocaleString('tr-TR')}
    </span>
  );
}
