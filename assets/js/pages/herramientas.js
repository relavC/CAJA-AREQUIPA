/* =========================================================
   HERRAMIENTAS — formulario de solicitud de crédito
   (Sin base de datos por ahora: solo valida y muestra un resumen)
   ========================================================= */
import { $, formatCurrency } from '../utils/helpers.js';
import { initHeader } from '../modules/header.js';

initHeader();

const form = $('[data-tool-form]');
const errorBox = $('[data-form-error]');
const result = $('[data-tool-result]');

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const MENSAJES = {
  nombre: 'Ingresa los nombres y apellidos.',
  dni: 'El DNI debe tener 8 dígitos.',
  celular: 'El celular debe tener 9 dígitos y empezar con 9.',
  correo: 'El correo no es válido.',
  tipo: 'Selecciona el tipo de crédito.',
  monto: 'El monto mínimo es S/ 300.',
  plazo: 'El plazo debe estar entre 1 y 240 meses.',
  agencia: 'Ingresa la agencia.',
};

const showError = (msg) => {
  errorBox.textContent = msg;
  errorBox.hidden = !msg;
};

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const invalido = [...form.elements].find((el) => el.name && !el.checkValidity());
  form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  if (invalido) {
    invalido.classList.add('is-invalid');
    invalido.focus();
    showError(MENSAJES[invalido.name] || 'Revisa los campos obligatorios.');
    return;
  }
  showError('');

  const d = Object.fromEntries(new FormData(form));
  const filas = [
    ['Cliente', d.nombre],
    ['DNI', d.dni],
    ['Celular', d.celular],
    ['Correo', d.correo || '—'],
    ['Tipo de crédito', d.tipo],
    ['Monto', formatCurrency(Number(d.monto))],
    ['Plazo', `${d.plazo} meses`],
    ['Agencia', d.agencia],
    ['Observaciones', d.observaciones || '—'],
  ];

  result.innerHTML = `
    <div class="tool-result__head">
      <i class="ri-checkbox-circle-fill"></i>
      <div>
        <h2>Solicitud registrada</h2>
        <p>Resumen de los datos ingresados (aún no se guardan en base de datos).</p>
      </div>
    </div>
    <dl class="tool-result__list">
      ${filas.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}
    </dl>`;
  result.hidden = false;
  form.reset();
  result.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

form.addEventListener('reset', () => {
  showError('');
  form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
});
