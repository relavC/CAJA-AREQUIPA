/* =========================================================
   MAIN.JS — Punto de entrada de JavaScript (portal)
   Cada funcionalidad vive en su propio módulo (assets/js/modules).
   Para agregar una nueva, impórtala y súmala al arreglo.
   ========================================================= */
import { initHeader } from './modules/header.js';
import { initSliders } from './modules/slider.js';

const modules = [initHeader, initSliders];

// Si un módulo falla, los demás siguen funcionando
modules.forEach((init) => {
  try {
    init();
  } catch (error) {
    console.error(`[${init.name}]`, error);
  }
});
