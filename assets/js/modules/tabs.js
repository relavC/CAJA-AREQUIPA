/* =========================================================
   TABS de productos — renderiza tarjetas desde data/products.js
   ========================================================= */
import { $, $$ } from '../utils/helpers.js';
import { products } from '../data/products.js';

const productCard = ({ icon, title, description, features = [], badge, url = '#' }) => `
  <article class="product-card">
    ${badge ? `<span class="product-card__badge">${badge}</span>` : ''}
    <div class="product-card__icon"><i class="${icon}"></i></div>
    <h3>${title}</h3>
    <p>${description}</p>
    <ul>
      ${features.map((f) => `<li><i class="ri-checkbox-circle-fill"></i> ${f}</li>`).join('')}
    </ul>
    <a href="${url}" class="link-arrow">Conoce más <i class="ri-arrow-right-line"></i></a>
  </article>
`;

export function initTabs() {
  const root = $('[data-tabs]');
  if (!root) return;

  const buttons = $$('[data-tab]', root);
  const panel = $('[data-tab-panel]', root);

  const render = (key) => {
    const items = products[key] ?? [];
    panel.innerHTML = items.map(productCard).join('');

    // Reinicia la animación de entrada
    panel.classList.remove('is-animating');
    void panel.offsetWidth;
    panel.classList.add('is-animating');

    buttons.forEach((btn) => {
      const active = btn.dataset.tab === key;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', String(active));
      btn.tabIndex = active ? 0 : -1;
    });
  };

  buttons.forEach((btn, i) => {
    btn.addEventListener('click', () => render(btn.dataset.tab));

    // Navegación con flechas
    btn.addEventListener('keydown', (e) => {
      if (!['ArrowRight', 'ArrowLeft'].includes(e.key)) return;
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const nextBtn = buttons[(i + dir + buttons.length) % buttons.length];
      nextBtn.focus();
      render(nextBtn.dataset.tab);
    });
  });

  // Enlaces del menú que abren una pestaña concreta: <a data-go-tab="consumo">
  $$('[data-go-tab]').forEach((link) =>
    link.addEventListener('click', () => render(link.dataset.goTab))
  );

  const initial = buttons.find((b) => b.classList.contains('is-active')) ?? buttons[0];
  render(initial.dataset.tab);
}
