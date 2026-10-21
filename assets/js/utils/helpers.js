/* =========================================================
   HELPERS reutilizables
   ========================================================= */

/** Selecciona un elemento */
export const $ = (selector, ctx = document) => ctx.querySelector(selector);

/** Selecciona varios elementos como arreglo */
export const $$ = (selector, ctx = document) => [...ctx.querySelectorAll(selector)];

/** Formatea montos en soles */
export const formatCurrency = (value) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(value);

/** Formatea números con separador de miles */
export const formatNumber = (value) => new Intl.NumberFormat('es-PE').format(value);

/** ¿El usuario prefiere menos animaciones? */
export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
