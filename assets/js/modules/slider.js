/* =========================================================
   SLIDER reutilizable
   Uso en HTML: <div data-slider data-interval="6000">...</div>
   ========================================================= */
import { $, $$, prefersReducedMotion } from '../utils/helpers.js';

export class Slider {
  constructor(root, { interval = 6000, autoplay = true } = {}) {
    this.root = root;
    this.track = $('.slider__track', root);
    this.slides = $$('.slide', root);
    this.dotsWrap = $('[data-slider-dots]', root);
    this.prevBtn = $('[data-slider-prev]', root);
    this.nextBtn = $('[data-slider-next]', root);

    this.index = 0;
    this.interval = interval;
    this.autoplay = autoplay && !prefersReducedMotion();
    this.timer = null;

    if (!this.track || this.slides.length === 0) return;
    this.init();
  }

  init() {
    this.buildDots();
    this.bindEvents();
    this.goTo(0);
    this.start();
  }

  buildDots() {
    if (!this.dotsWrap) return;
    this.dots = this.slides.map((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'slider__dot';
      dot.type = 'button';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Ir a la diapositiva ${i + 1}`);
      dot.addEventListener('click', () => {
        this.goTo(i);
        this.restart();
      });
      this.dotsWrap.appendChild(dot);
      return dot;
    });
  }

  bindEvents() {
    this.prevBtn?.addEventListener('click', () => { this.prev(); this.restart(); });
    this.nextBtn?.addEventListener('click', () => { this.next(); this.restart(); });

    // Pausa al pasar el mouse o enfocar con teclado
    this.root.addEventListener('mouseenter', () => this.stop());
    this.root.addEventListener('mouseleave', () => this.start());
    this.root.addEventListener('focusin', () => this.stop());
    this.root.addEventListener('focusout', () => this.start());

    // Pausa si la pestaña no está visible
    document.addEventListener('visibilitychange', () =>
      document.hidden ? this.stop() : this.start()
    );

    // Teclado
    this.root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') this.prev();
      if (e.key === 'ArrowRight') this.next();
    });

    // Swipe táctil / mouse
    let startX = 0;
    let startY = 0;
    this.track.addEventListener('pointerdown', (e) => {
      startX = e.clientX;
      startY = e.clientY;
    });
    this.track.addEventListener('pointerup', (e) => {
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        dx < 0 ? this.next() : this.prev();
        this.restart();
      }
    });
  }

  goTo(i) {
    const total = this.slides.length;
    this.index = (i + total) % total;
    this.track.style.transform = `translateX(-${this.index * 100}%)`;

    this.slides.forEach((slide, idx) => {
      const active = idx === this.index;
      slide.classList.toggle('is-active', active);
      slide.setAttribute('aria-hidden', String(!active));
      slide.inert = !active; // evita tabular a slides ocultos
    });

    this.dots?.forEach((dot, idx) => {
      const active = idx === this.index;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-selected', String(active));
    });
  }

  next() { this.goTo(this.index + 1); }
  prev() { this.goTo(this.index - 1); }

  start() {
    if (!this.autoplay || this.timer) return;
    this.timer = setInterval(() => this.next(), this.interval);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  restart() {
    this.stop();
    this.start();
  }
}

export function initSliders() {
  $$('[data-slider]').forEach(
    (el) => new Slider(el, { interval: Number(el.dataset.interval) || 6000 })
  );
}
