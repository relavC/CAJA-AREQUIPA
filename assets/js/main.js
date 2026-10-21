/* =========================================================
   MAIN.JS — Punto de entrada de JavaScript
   Cada funcionalidad vive en su propio módulo (assets/js/modules).
   Para agregar una nueva, impórtala y súmala al arreglo.
   ========================================================= */
import { initHeader } from './modules/header.js';
import { initSliders } from './modules/slider.js';
import { initTabs } from './modules/tabs.js';
import { initSimulator } from './modules/simulator.js';
import { initCounters } from './modules/counters.js';
import { initReveal } from './modules/reveal.js';
import { initBackToTop, setCurrentYear } from './modules/ui.js';

const modules = [
  initHeader,
  initSliders,
  initTabs,
  initSimulator,
  initCounters,
  initReveal,
  initBackToTop,
  setCurrentYear,
];

// Si un módulo falla, los demás siguen funcionando
modules.forEach((init) => {
  try {
    init();
  } catch (error) {
    console.error(`[${init.name}]`, error);
  }
});
