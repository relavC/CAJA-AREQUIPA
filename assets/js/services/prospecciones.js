/* =========================================================
   PROSPECCIONES — almacenamiento de registros (CRUD)
   Por ahora en localStorage del navegador. Cuando se conecte la
   base de datos, solo hay que reemplazar las funciones de este
   archivo (listar, crear, actualizar, eliminar).
   ========================================================= */
const CLAVE = 'sej_prospecciones';

/** 'DD/MM/AAAA HH:MM:SS' en hora local */
export const fechaHora = (d = new Date()) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ` +
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

const nuevoId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

function leer() {
  let lista;
  try { lista = JSON.parse(localStorage.getItem(CLAVE)) || []; } catch { lista = []; }
  // Registros antiguos sin id: se les asigna uno
  let cambio = false;
  lista.forEach((r) => { if (!r.id) { r.id = nuevoId(); cambio = true; } });
  if (cambio) escribir(lista);
  return lista;
}

function escribir(lista) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    throw new Error('No se pudo guardar en este navegador (almacenamiento bloqueado o lleno).');
  }
}

const CAMPOS = ['supervisor', 'dni_asesor', 'agencia', 'analista', 'comentario'];
const limpiar = (datos) => Object.fromEntries(CAMPOS.map((c) => [c, String(datos[c] ?? '').trim()]));

/** Todos los registros, del más reciente al más antiguo */
export const listar = () =>
  leer().sort((a, b) => String(b.registrado_en).localeCompare(String(a.registrado_en)));

export const obtener = (id) => leer().find((r) => r.id === id) || null;

/** Crea un registro; la fecha y hora se toman en este momento */
export function crear(datos) {
  const ahora = new Date();
  const registro = { id: nuevoId(), fecha_hora: fechaHora(ahora), registrado_en: ahora.toISOString(), ...limpiar(datos) };
  const lista = leer();
  lista.push(registro);
  escribir(lista);
  return registro;
}

/** Edita un registro (conserva la fecha y hora original y anota cuándo se editó) */
export function actualizar(id, datos) {
  const lista = leer();
  const i = lista.findIndex((r) => r.id === id);
  if (i < 0) throw new Error('El registro ya no existe.');
  lista[i] = { ...lista[i], ...limpiar(datos), editado_en: fechaHora() };
  escribir(lista);
  return lista[i];
}

export function eliminar(id) {
  escribir(leer().filter((r) => r.id !== id));
}

/** Descarga los registros en CSV (separado por ; para Excel en español) */
export function descargarCSV(lista = listar()) {
  const cab = ['Fecha y hora', 'Supervisor', 'DNI_Asesor', 'Agencia', 'Analista', 'Comentario', 'Editado'];
  const campo = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const filas = lista.map((r) => [
    campo(r.fecha_hora), campo(r.supervisor), `="${r.dni_asesor}"`, campo(r.agencia),
    campo(r.analista), campo(r.comentario), campo(r.editado_en || ''),
  ].join(';'));
  const csv = '﻿' + [cab.map(campo).join(';'), ...filas].join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), {
    href: url, download: `prospecciones_${new Date().toISOString().slice(0, 10)}.csv`,
  });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
