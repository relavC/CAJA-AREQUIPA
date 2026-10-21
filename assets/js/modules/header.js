/* =========================================================
   HEADER: sombra al hacer scroll, menú móvil y dropdowns
   ========================================================= */
import { $, $$ } from '../utils/helpers.js';

export function initHeader() {
  const header = $('[data-header]');
  const nav = $('[data-nav]');
  const burger = $('[data-burger]');
  const overlay = $('[data-overlay]');
  if (!header || !nav || !burger) return;

  const mobileQuery = window.matchMedia('(max-width: 1024px)');

  /* ---- Sombra al hacer scroll ---- */
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- Menú móvil ---- */
  const setMenu = (open) => {
    nav.classList.toggle('is-open', open);
    burger.classList.toggle('is-active', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    overlay?.classList.toggle('is-visible', open);
    document.body.classList.toggle('no-scroll', open);
  };

  burger.addEventListener('click', () => setMenu(!nav.classList.contains('is-open')));
  overlay?.addEventListener('click', () => setMenu(false));

  mobileQuery.addEventListener('change', (e) => {
    if (!e.matches) setMenu(false);
  });

  // Cerrar el menú al elegir un enlace (en móvil)
  $$('a', nav).forEach((link) =>
    link.addEventListener('click', () => {
      if (mobileQuery.matches) setMenu(false);
    })
  );

  /* ---- Dropdowns ---- */
  const closeDropdowns = (except = null) => {
    $$('.nav__item.is-open', nav).forEach((item) => {
      if (item === except) return;
      item.classList.remove('is-open');
      $('[data-dropdown-toggle]', item)?.setAttribute('aria-expanded', 'false');
    });
  };

  $$('[data-dropdown-toggle]', nav).forEach((toggle) => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = toggle.closest('.nav__item');
      const willOpen = !item.classList.contains('is-open');
      closeDropdowns(item);
      item.classList.toggle('is-open', willOpen);
      toggle.setAttribute('aria-expanded', String(willOpen));
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav__item--dropdown')) closeDropdowns();
  });

  /* ---- Tecla Escape ---- */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeDropdowns();
    setMenu(false);
  });
}
