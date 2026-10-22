/* =========================================================
   UI DEL DASHBOARD: formatos y piezas reutilizables
   ========================================================= */

/** Escapa texto para insertarlo en HTML de forma segura */
export const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const nf0 = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const soles = (v) => `S/ ${nf0.format(Number(v) || 0)}`;
export const soles2 = (v) => `S/ ${nf2.format(Number(v) || 0)}`;
export const num = (v) => nf0.format(Number(v) || 0);
export const pct = (v) => `${((Number(v) || 0) * 100).toFixed(1)}%`;
export const fecha = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '—');

/** Fecha de hoy (hora local) como 'AAAA-MM-DD' */
export const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Semáforo según avance vs tiempo: ≥100% en ritmo, ≥80% atento, menor rezagado */
export function tagEstado(vsTiempo, conMeta = true) {
  if (!conMeta) return '<span class="tag tag--muted">Sin meta</span>';
  if (vsTiempo >= 1) return `<span class="tag tag--ok"><i class="ri-arrow-up-line"></i>${pct(vsTiempo)}</span>`;
  if (vsTiempo >= 0.8) return `<span class="tag tag--warn"><i class="ri-subtract-line"></i>${pct(vsTiempo)}</span>`;
  return `<span class="tag tag--bad"><i class="ri-arrow-down-line"></i>${pct(vsTiempo)}</span>`;
}

export const barra = (valor, mini = true) =>
  `<div class="bar${mini ? ' bar--mini' : ''}"><span style="width:${Math.min(Math.max(valor, 0) * 100, 100)}%"></span></div>`;

export const progreso = (valor) => `<div class="cell-progress"><b>${pct(valor)}</b>${barra(valor)}</div>`;

export const cargando = () => '<div class="empty"><span class="spinner"></span><span>Cargando...</span></div>';

export const vacio = (icono, titulo, texto = '', extra = '') =>
  `<div class="empty"><i class="${icono}"></i><strong>${esc(titulo)}</strong><span>${texto}</span>${extra}</div>`;

export const kpi = ({ icono, label, valor, hint = '', extra = '', oscuro = false }) => `
  <article class="kpi${oscuro ? ' kpi--dark' : ''}">
    <span class="kpi__label"><i class="${icono}"></i>${esc(label)}</span>
    <span class="kpi__value">${valor}</span>
    ${extra}
    ${hint ? `<span class="kpi__hint">${hint}</span>` : ''}
  </article>`;

/** Notificación temporal */
export function toast(mensaje, tipo = 'ok') {
  const zona = document.querySelector('[data-toasts]');
  if (!zona) return;
  const t = document.createElement('div');
  t.className = `toast toast--${tipo}`;
  const icono = tipo === 'ok' ? 'ri-checkbox-circle-fill' : tipo === 'bad' ? 'ri-error-warning-fill' : 'ri-information-fill';
  t.innerHTML = `<i class="${icono}"></i><span>${esc(mensaje)}</span>`;
  zona.appendChild(t);
  setTimeout(() => t.remove(), tipo === 'bad' ? 7000 : 4000);
}

/** Ejecuta una acción mostrando estado de carga en el botón */
export async function conBoton(boton, accion) {
  const original = boton.innerHTML;
  boton.disabled = true;
  boton.innerHTML = '<i class="ri-loader-4-line"></i> Procesando...';
  try {
    return await accion();
  } finally {
    boton.disabled = false;
    boton.innerHTML = original;
  }
}
