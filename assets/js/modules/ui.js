/* =========================================================
   UI: pequeños comportamientos generales
   ========================================================= */
import { $, $$ } from '../utils/helpers.js';

/** Botón "volver arriba" */
export function initBackToTop() {
  const btn = $('[data-back-to-top]');
  if (!btn) return;

  const toggle = () => btn.classList.toggle('is-visible', window.scrollY > 600);
  toggle();
  window.addEventListener('scroll', toggle, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

/** Año actual en el footer */
export function setCurrentYear() {
  $$('[data-year]').forEach((el) => (el.textContent = new Date().getFullYear()));
}
