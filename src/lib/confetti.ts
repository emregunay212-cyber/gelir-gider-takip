import confetti from 'canvas-confetti';

/**
 * Maaş yatma, borç kapama gibi başarı anlarında ekrana konfeti yağdırır.
 * Reduce-motion açıksa boş geçer.
 */
export function celebrateSuccess(): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const duration = 1200;
  const end = Date.now() + duration;

  const colors = ['#818cf8', '#34d399', '#f472b6', '#fbbf24', '#60a5fa'];

  function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.7 },
      colors,
      scalar: 0.9,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.7 },
      colors,
      scalar: 0.9,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  }

  frame();
}

/**
 * Daha hafif bir kutlama — günlük "limit altında" başarısı için.
 */
export function celebrateSmall(): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  confetti({
    particleCount: 30,
    spread: 60,
    origin: { y: 0.6 },
    colors: ['#34d399', '#10b981', '#fbbf24'],
    scalar: 0.7,
  });
}
