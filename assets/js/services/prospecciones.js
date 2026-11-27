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

/** Quita los segundos para mostrar: '27/11/2026 21:05:23' -> '27/11/2026 21:05' */
export const sinSegundos = (texto) => String(texto ?? '').replace(/(\d{1,2}:\d{2}):\d{2}$/, '$1');

const nuevoId = () =>
  (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

function leer() {
  let lista;
  try { lista = JSON.parse(localStorage.getItem(CLAVE)) || []; } catch { lista = []; }
  // Registros antiguos: se les asigna id y se pasa dni_cliente a documento
  let cambio = false;
  lista.forEach((r) => {
    if (!r.id) { r.id = nuevoId(); cambio = true; }
    if (!r.estado_credito) { r.estado_credito = 'REFERIDO'; cambio = true; }
    if ('dni_cliente' in r) {
      if (!r.doc_cliente && r.dni_cliente) { r.tipo_doc_cliente = 'DNI'; r.doc_cliente = r.dni_cliente; }
      delete r.dni_cliente;
      cambio = true;
    }
  });
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

/** Status del crédito (el primero es el valor por defecto al registrar) */
export const ESTADOS_CREDITO = [
  { valor: 'REFERIDO',     nombre: 'Referido' },
  { valor: 'PENDIENTE',    nombre: 'Pendiente' },
  { valor: 'DESEMBOLSADO', nombre: 'Desembolsado' },
  { valor: 'PERDIDO',      nombre: 'Perdido' },
  { valor: 'PROXIMO',      nombre: 'Próximo' },
];
const ESTADO_INICIAL = ESTADOS_CREDITO[0].valor;
const esEstado = (v) => ESTADOS_CREDITO.some((e) => e.valor === v);
export const nombreEstado = (v) => ESTADOS_CREDITO.find((e) => e.valor === v)?.nombre ?? '';

const CAMPOS = ['supervisor', 'dni_asesor', 'tipo_doc_cliente', 'doc_cliente', 'agencia', 'analista', 'comentario'];

/** Monto en soles con 2 decimales (null si no es válido) */
const aMonto = (v) => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

const limpiar = (datos) => ({
  ...Object.fromEntries(CAMPOS.map((c) => [c, String(datos[c] ?? '').trim()])),
  monto: aMonto(datos.monto),
});

/** Todos los registros, del más reciente al más antiguo */
export const listar = () =>
  leer().sort((a, b) => String(b.registrado_en || '').localeCompare(String(a.registrado_en || '')));

export const obtener = (id) => leer().find((r) => r.id === id) || null;

/** Crea un registro; la fecha y hora se toman en este momento */
export function crear(datos) {
  const ahora = new Date();
  const registro = {
    id: nuevoId(), fecha_hora: fechaHora(ahora), registrado_en: ahora.toISOString(), ...limpiar(datos),
    estado_credito: esEstado(datos.estado_credito) ? datos.estado_credito : ESTADO_INICIAL,
  };
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
  const estado = esEstado(datos.estado_credito) ? datos.estado_credito : lista[i].estado_credito;
  if (estado !== lista[i].estado_credito) lista[i].estado_en = fechaHora();
  lista[i] = { ...lista[i], ...limpiar(datos), estado_credito: estado, editado_en: fechaHora() };
  escribir(lista);
  return lista[i];
}

/** Cambia solo el status del crédito (desde el desplegable de la tabla) */
export function cambiarEstado(id, estado) {
  if (!esEstado(estado)) throw new Error('Status de crédito no válido.');
  const lista = leer();
  const r = lista.find((x) => x.id === id);
  if (!r) throw new Error('El registro ya no existe.');
  r.estado_credito = estado;
  r.estado_en = fechaHora();
  escribir(lista);
  return r;
}

export function eliminar(id) {
  escribir(leer().filter((r) => r.id !== id));
}

/** Descarga los registros en CSV (separado por ; para Excel en español) */
export function descargarCSV(lista = listar()) {
  const cab = ['Fecha y hora', 'Supervisor', 'DNI_Asesor', 'Tipo_Doc_Cliente', 'Doc_Cliente', 'Monto (S/)', 'Status crédito', 'Agencia', 'Analista', 'Comentario', 'Editado'];
  const texto = (v) => (v ? `="${v}"` : '""');           // conserva ceros a la izquierda en Excel
  const monto = (v) => (v == null ? '' : Number(v).toFixed(2).replace('.', ','));
  const campo = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const filas = lista.map((r) => [
    campo(r.fecha_hora), campo(r.supervisor), texto(r.dni_asesor), campo(r.tipo_doc_cliente || ''), texto(r.doc_cliente), monto(r.monto), campo(nombreEstado(r.estado_credito || ESTADO_INICIAL)), campo(r.agencia),
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
