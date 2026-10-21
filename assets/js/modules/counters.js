/* =========================================================
   CONTADORES ANIMADOS
   Uso: <strong data-count="150" data-prefix="+" data-suffix=" años">0</strong>
   ========================================================= */
import { $$, formatNumber, prefersReducedMotion } from '../utils/helpers.js';

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function animate(el, duration = 1600) {
  const target = Number(el.dataset.count);
  const prefix = el.dataset.prefix ?? '';
  const suffix = el.dataset.suffix ?? '';
  const write = (value) => (el.textContent = `${prefix}${formatNumber(value)}${suffix}`);

  if (prefersReducedMotion()) return write(target);

  const start = performance.now();
  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    write(Math.round(target * easeOutCubic(progress)));
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function initCounters() {
  const counters = $$('[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((el) => observer.observe(el));
}
