/* =========================================================
   REVEAL: aparece suavemente al hacer scroll
   Uso: agrega el atributo data-reveal a cualquier elemento.
   ========================================================= */
import { $$ } from '../utils/helpers.js';

export function initReveal() {
  const items = $$('[data-reveal]');
  if (!items.length) return;

  if (!('IntersectionObserver' in window)) {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  // Escalona la aparición de elementos hermanos
  items.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.hasAttribute('data-reveal'));
    const order = siblings.indexOf(el);
    if (order > 0) el.style.transitionDelay = `${Math.min(order * 80, 400)}ms`;
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  items.forEach((el) => observer.observe(el));
}
