/* =========================================================
   CÁLCULOS DEL REPORTE (equivalentes a tu script de Colab)
   Funciones puras: reciben datos y devuelven resultados.
   ========================================================= */

const MS_DIA = 86400000;
const aUTC = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

/**
 * Días útiles entre dos fechas (inclusive), de lunes a sábado y sin feriados.
 * Igual a NETWORKDAYS.INTL(inicio, fin, 11, feriados) de Excel.
 */
export function diasUtiles(inicio, fin, feriados = []) {
  if (!inicio || !fin || fin < inicio) return 0;
  const libres = new Set(feriados);
  let n = 0;
  for (let t = aUTC(inicio); t <= aUTC(fin); t += MS_DIA) {
    const d = new Date(t);
    const iso = d.toISOString().slice(0, 10);
    if (d.getUTCDay() !== 0 && !libres.has(iso)) n++; // 0 = domingo
  }
  return n;
}

/** Último día del mes de un periodo 'AAAA-MM-01' */
export function finDeMes(periodo) {
  const d = new Date(Date.UTC(+periodo.slice(0, 4), +periodo.slice(5, 7), 0));
  return d.toISOString().slice(0, 10);
}

export const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO',
  'AGOSTO', 'SETIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
export const nombreMes = (periodo) => MESES[+periodo.slice(5, 7) - 1];

const div = (a, b) => (b ? a / b : 0);
const monto = (c) => Number(c.monto_desembolsado) || 0;

/** Avance de tiempo del mes según la fecha de corte */
export function calcularDias({ inicio, fin, corte }, feriados) {
  const utiles = diasUtiles(inicio, fin, feriados);
  const transcurridos = diasUtiles(inicio, corte, feriados);
  return { utiles, transcurridos, avance: div(transcurridos, utiles) };
}

/**
 * Filtros base del Resumen 2: fecha de desembolso entre inicio y corte
 * y, si se pide, excluye "NO PROCEDE" en OBSERVACIONES.
 */
function pasaFiltroBase(c, { inicio, corte, excluirNoProcede }) {
  if (!c.fecha_desembolso || c.fecha_desembolso < inicio || c.fecha_desembolso > corte) return false;
  if (excluirNoProcede && (c.observaciones || '').toUpperCase() === 'NO PROCEDE') return false;
  return true;
}

const pasaSustento = (c, sustento) =>
  sustento === 'TODOS' || (c.sustento || '').toUpperCase() === sustento;

/**
 * RESUMEN 2: avance por región del cuadro.
 * @param {object[]} creditos
 * @param {object} cfg { regiones: string[], agenciaRegion: {AGENCIA: REGION}, cuotas: {REGION: n}, feriados: string[], params }
 */
export function resumen2(creditos, { regiones, agenciaRegion, cuotas, feriados, params }) {
  const dias = calcularDias(params, feriados);
  const acum = Object.fromEntries(regiones.map((r) => [r, { monto: 0, si: 0, no: 0 }]));
  const sinRegion = {}; // agencias que no están en el cuadro

  creditos.forEach((c) => {
    if (!pasaFiltroBase(c, params)) return;
    const agencia = (c.agencia_desembolso || '').toUpperCase();
    const region = agenciaRegion[agencia];
    if (!region || !acum[region]) {
      if (pasaSustento(c, params.sustento)) {
        const k = agencia || '(EN BLANCO)';
        sinRegion[k] = (sinRegion[k] || 0) + monto(c);
      }
      return;
    }
    if (pasaSustento(c, params.sustento)) acum[region].monto += monto(c);
    const s = (c.sustento || '').toUpperCase();
    if (s === 'SI') acum[region].si++;
    if (s === 'NO') acum[region].no++;
  });

  const filas = regiones.map((region) => {
    const a = acum[region];
    const cuota = Number(cuotas[region]) || 0;
    const vsCuota = div(a.monto, cuota);
    return { region, monto: a.monto, cuota, vsCuota, vsTiempo: div(vsCuota, dias.avance), si: a.si, no: a.no };
  });

  const total = filas.reduce(
    (t, f) => ({ monto: t.monto + f.monto, cuota: t.cuota + f.cuota, si: t.si + f.si, no: t.no + f.no }),
    { monto: 0, cuota: 0, si: 0, no: 0 }
  );
  total.vsCuota = div(total.monto, total.cuota);
  total.vsTiempo = div(total.vsCuota, dias.avance);

  return { filas, total, dias, sinRegion };
}

/**
 * RESUMEN 1: monto y cantidad por región y agencia de desembolso (toda la data cargada).
 * Las agencias asignadas a AYACUCHO en el cuadro se agrupan como AYACUCHO, igual que el script.
 */
export function resumen1(creditos, agenciaRegion = {}) {
  const grupos = {};
  creditos.forEach((c) => {
    const agencia = c.agencia_desembolso || '(EN BLANCO)';
    let region = c.region_desembolso || '(EN BLANCO)';
    if (agenciaRegion[agencia] === 'AYACUCHO') region = 'AYACUCHO';
    grupos[region] ??= {};
    grupos[region][agencia] ??= { monto: 0, cuenta: 0 };
    grupos[region][agencia].monto += monto(c);
    if (c.dni_cliente !== null && c.dni_cliente !== undefined && c.dni_cliente !== '') grupos[region][agencia].cuenta++;
  });

  const regiones = Object.keys(grupos).sort().map((region) => {
    const agencias = Object.keys(grupos[region]).sort()
      .map((agencia) => ({ agencia, ...grupos[region][agencia] }));
    return {
      region,
      monto: agencias.reduce((s, a) => s + a.monto, 0),
      cuenta: agencias.reduce((s, a) => s + a.cuenta, 0),
      agencias,
    };
  });

  const total = {
    monto: regiones.reduce((s, r) => s + r.monto, 0),
    cuenta: regiones.reduce((s, r) => s + r.cuenta, 0),
  };
  return { regiones, total };
}

/**
 * Avance por supervisor (CÓDIGO ASESOR), con los mismos filtros del Resumen 2.
 * @param {object} metas { CODIGO: { meta_monto, meta_numero } }
 */
export function porSupervisor(creditos, { params, metas = {}, dias }) {
  const grupos = {};
  creditos.forEach((c) => {
    if (!pasaFiltroBase(c, params) || !pasaSustento(c, params.sustento)) return;
    const codigo = (c.codigo_asesor || '(SIN CÓDIGO)').toUpperCase();
    grupos[codigo] ??= { codigo, nombres: {}, monto: 0, numero: 0 };
    const g = grupos[codigo];
    g.monto += monto(c);
    g.numero++;
    if (c.coordinador) g.nombres[c.coordinador] = (g.nombres[c.coordinador] || 0) + 1;
  });

  // Incluye supervisores con meta aunque aún no tengan desembolsos
  Object.keys(metas).forEach((codigo) => {
    grupos[codigo] ??= { codigo, nombres: {}, monto: 0, numero: 0 };
  });

  return Object.values(grupos)
    .map((g) => {
      const meta = metas[g.codigo] || {};
      const metaMonto = Number(meta.meta_monto) || 0;
      const metaNumero = Number(meta.meta_numero) || 0;
      const nombre = Object.entries(g.nombres).sort((a, b) => b[1] - a[1])[0]?.[0] || g.codigo;
      const vsMeta = div(g.monto, metaMonto);
      return {
        codigo: g.codigo, nombre, monto: g.monto, numero: g.numero,
        metaMonto, metaNumero, vsMeta, vsTiempo: div(vsMeta, dias.avance),
        ticket: div(g.monto, g.numero),
      };
    })
    .sort((a, b) => b.monto - a.monto);
}
