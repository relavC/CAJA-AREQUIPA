/* =========================================================
   HERRAMIENTAS — Registro de prospecciones (supervisores de venta)
   La fecha y hora se guardan automáticamente al registrar.
   Los registros se ven y administran en Dashboard → Registros.
   ========================================================= */
import { $ } from '../utils/helpers.js';
import { initHeader } from '../modules/header.js';
import { SUPERVISORES, AGENCIAS } from '../data/prospecciones.js';
import { crear, fechaHora } from '../services/prospecciones.js';
import { conectarDocumento, aplicarTipoDoc, opcionesTipoDoc, errorDoc } from '../utils/documento.js';

initHeader();

const form = $('[data-tool-form]');
const errorBox = $('[data-form-error]');
const okBox = $('[data-form-ok]');
const reloj = $('[data-reloj]');

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Desplegables ---------- */
const opciones = (lista) => lista.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
$('[data-select-supervisores]').insertAdjacentHTML('beforeend', opciones(SUPERVISORES));
$('[data-select-agencias]').insertAdjacentHTML('beforeend', opciones(AGENCIAS));

/* ---------- Documento del cliente: DNI, RUC o carnet de extranjería ---------- */
const tipoDoc = $('[data-tipo-doc]', form);
const docInput = $('[data-doc]', form);
tipoDoc.innerHTML = opcionesTipoDoc('DNI');
conectarDocumento(tipoDoc, docInput);

/* ---------- DNI del asesor: solo números ---------- */
form.querySelectorAll('[data-solo-numeros]').forEach((input) => {
  input.addEventListener('input', () => {
    const limpio = input.value.replace(/\D/g, '').slice(0, 8);
    if (limpio !== input.value) input.value = limpio;
  });
});

/* ---------- Reloj ---------- */
const tic = () => { reloj.textContent = fechaHora(); };
tic();
setInterval(tic, 1000);

/* ---------- Validación y registro ---------- */
const MENSAJES = {
  supervisor: 'Selecciona el supervisor de venta.',
  dni_asesor: 'El DNI_Asesor debe tener 8 números.',
  monto: 'Ingresa un monto válido en soles (mayor a 0).',
  agencia: 'Selecciona la agencia.',
  analista: 'Ingresa el analista asignado.',
  comentario: 'Ingresa un comentario.',
};

const showError = (msg) => {
  errorBox.textContent = msg;
  errorBox.hidden = !msg;
};

form.addEventListener('submit', (e) => {
  e.preventDefault();
  okBox.hidden = true;
  form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));

  // Recorta espacios para que "   " no cuente como texto válido
  ['analista', 'comentario'].forEach((n) => { form[n].value = form[n].value.trim(); });

  const invalido = [...form.elements].find((el) => el.name && !el.checkValidity());
  if (invalido) {
    invalido.classList.add('is-invalid');
    invalido.focus();
    showError(invalido.name === 'doc_cliente' ? errorDoc(tipoDoc.value) : MENSAJES[invalido.name] || 'Revisa los campos obligatorios.');
    return;
  }
  showError('');

  try {
    const registro = crear(Object.fromEntries(new FormData(form)));
    okBox.innerHTML = `<i class="ri-checkbox-circle-fill"></i> Prospección registrada el <b>${esc(registro.fecha_hora)}</b>.`;
    okBox.hidden = false;
    form.reset();
  } catch (err) {
    showError(err.message);
  }
});

form.addEventListener('reset', () => {
  showError('');
  setTimeout(() => aplicarTipoDoc(tipoDoc, docInput)); // vuelve a DNI tras limpiar
  form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
});
