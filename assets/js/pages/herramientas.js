/* =========================================================
   HERRAMIENTAS — Registro de prospecciones (supervisores de venta)
   Guarda la fecha y hora automáticamente al registrar.
   Sin base de datos por ahora: los registros quedan en este
   navegador (localStorage) y se pueden descargar en CSV.
   ========================================================= */
import { $ } from '../utils/helpers.js';
import { initHeader } from '../modules/header.js';
import { SUPERVISORES, AGENCIAS } from '../data/prospecciones.js';

initHeader();

const CLAVE = 'sej_prospecciones';

const form = $('[data-tool-form]');
const errorBox = $('[data-form-error]');
const okBox = $('[data-form-ok]');
const reloj = $('[data-reloj]');
const tbody = $('[data-registros]');
const total = $('[data-total]');
const dniInput = $('[data-solo-numeros]');

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Desplegables ---------- */
const opciones = (lista) => lista.map((v) => `<option value="${esc(v)}">${esc(v)}</option>`).join('');
$('[data-select-supervisores]').insertAdjacentHTML('beforeend', opciones(SUPERVISORES));
$('[data-select-agencias]').insertAdjacentHTML('beforeend', opciones(AGENCIAS));

/* ---------- DNI: solo números ---------- */
dniInput.addEventListener('input', () => {
  const limpio = dniInput.value.replace(/\D/g, '').slice(0, 8);
  if (limpio !== dniInput.value) dniInput.value = limpio;
});

/* ---------- Fecha y hora ---------- */
const fechaHora = (d = new Date()) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ` +
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

const tic = () => { reloj.textContent = fechaHora(); };
tic();
setInterval(tic, 1000);

/* ---------- Almacenamiento local ---------- */
const leer = () => {
  try { return JSON.parse(localStorage.getItem(CLAVE)) || []; } catch { return []; }
};
const guardar = (lista) => {
  try { localStorage.setItem(CLAVE, JSON.stringify(lista)); return true; } catch { return false; }
};

function pintar() {
  const lista = leer();
  total.textContent = lista.length;
  tbody.innerHTML = lista.length
    ? lista.slice().reverse().map((r) => `
        <tr>
          <td style="white-space:nowrap">${esc(r.fecha_hora)}</td>
          <td>${esc(r.supervisor)}</td>
          <td>${esc(r.dni_asesor)}</td>
          <td>${esc(r.agencia)}</td>
          <td>${esc(r.analista)}</td>
          <td>${esc(r.comentario)}</td>
        </tr>`).join('')
    : '<tr><td colspan="6" class="center" style="color:var(--color-text-muted);padding:1.5rem">Aún no hay registros.</td></tr>';
}
pintar();

/* ---------- Validación y registro ---------- */
const MENSAJES = {
  supervisor: 'Selecciona el supervisor de venta.',
  dni_asesor: 'El DNI_Asesor debe tener 8 números.',
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
    showError(MENSAJES[invalido.name] || 'Revisa los campos obligatorios.');
    return;
  }
  showError('');

  const d = Object.fromEntries(new FormData(form));
  const registro = {
    fecha_hora: fechaHora(),          // se toma en el momento exacto de registrar
    registrado_en: new Date().toISOString(),
    supervisor: d.supervisor,
    dni_asesor: d.dni_asesor,
    agencia: d.agencia,
    analista: d.analista,
    comentario: d.comentario,
  };

  const lista = leer();
  lista.push(registro);
  if (!guardar(lista)) {
    showError('No se pudo guardar en este navegador (almacenamiento bloqueado).');
    return;
  }

  okBox.innerHTML = `<i class="ri-checkbox-circle-fill"></i> Prospección registrada el <b>${esc(registro.fecha_hora)}</b>.`;
  okBox.hidden = false;
  form.reset();
  pintar();
});

form.addEventListener('reset', () => {
  showError('');
  form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
});

/* ---------- Descargar CSV (se abre en Excel) ---------- */
$('[data-descargar]').addEventListener('click', () => {
  const lista = leer();
  if (!lista.length) {
    showError('No hay registros para descargar.');
    return;
  }
  const cab = ['Fecha y hora', 'Supervisor', 'DNI_Asesor', 'Agencia', 'Analista', 'Comentario'];
  const campo = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const filas = lista.map((r) =>
    [r.fecha_hora, r.supervisor, `="${r.dni_asesor}"`, r.agencia, r.analista, r.comentario]
      .map((v, i) => (i === 2 ? v : campo(v))).join(';'));
  const csv = '﻿' + [cab.map(campo).join(';'), ...filas].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: `prospecciones_${new Date().toISOString().slice(0, 10)}.csv` });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});
