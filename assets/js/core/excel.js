/* =========================================================
   EXCEL: lectura de la hoja SEJ y descarga del reporte
   - Usa SheetJS (variable global XLSX que se carga en dashboard.html)
   - Encuentra solo la fila de encabezados (hoy está en la fila 9)
   ========================================================= */

export const HOJA_DATA = 'SEJ';

// Encabezado del Excel -> columna en la base de datos
export const COLUMNAS = {
  'REGION ASESOR': 'region_asesor',
  'AGENCIA ASESOR': 'agencia_asesor',
  'COORDINADOR': 'coordinador',
  'ASESOR': 'asesor',
  'CARGO': 'cargo',
  'META MONTO': 'meta_monto',
  'META NUMERO': 'meta_numero',
  'OBSERVACIONES': 'observaciones',
  'DNI CLIENTE': 'dni_cliente',
  'NOMBRE CLIENTE': 'nombre_cliente',
  'FECHA DE REGISTRO': 'fecha_registro',
  'TIPO DE CLIENTE': 'tipo_cliente',
  'MONTO DESEMBOLSADO': 'monto_desembolsado',
  'TIPO DE CREDITO': 'tipo_credito',
  'FECHA DE DESEMBOLSO': 'fecha_desembolso',
  'REGION DESEMBOLSO': 'region_desembolso',
  'AGENCIA DESEMBOLSO': 'agencia_desembolso',
  'ANALISTA': 'analista',
  'CUENTA': 'cuenta',
  'OPERACION': 'operacion',
  'N° SOLICITUD': 'nro_solicitud',
  'TEA': 'tea',
  'RESULTADO VISITA': 'resultado_visita',
  'CODIGO ASESOR': 'codigo_asesor',
  'DNI ASESOR': 'dni_asesor',
  'CODIGO DE PYV': 'codigo_pyv',
  'FECHA DE INGRESO': 'fecha_ingreso',
  'NUEVOS': 'nuevos',
  'VALIDO?': 'valido',
  'SUSTENTO': 'sustento',
};

// Columnas obligatorias (las mismas que exige tu script)
const REQUERIDAS = [
  'region_desembolso', 'agencia_desembolso', 'monto_desembolsado',
  'dni_cliente', 'fecha_desembolso', 'observaciones', 'sustento',
];

const FECHAS = ['fecha_registro', 'fecha_desembolso', 'fecha_ingreso'];
const NUMEROS = ['meta_monto', 'meta_numero', 'monto_desembolsado', 'tea'];
const ENTEROS = ['nuevos'];
// Se guardan en MAYÚSCULAS y sin espacios sobrantes (igual que el script)
const MAYUSCULAS = [
  'region_desembolso', 'agencia_desembolso', 'observaciones', 'sustento',
  'codigo_asesor', 'valido', 'tipo_credito', 'tipo_cliente',
];

/** Normaliza un texto para comparar encabezados: sin tildes, mayúsculas, un solo espacio */
export const normalizar = (v) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const MAPA = Object.fromEntries(Object.entries(COLUMNAS).map(([k, v]) => [normalizar(k), v]));

const pad = (n) => String(n).padStart(2, '0');

/** Convierte un valor de fecha de Excel a 'AAAA-MM-DD'. Devuelve { valor, esTexto } */
export function aFecha(v) {
  if (v === null || v === undefined || v === '') return { valor: null, esTexto: false };

  if (typeof v === 'number' && Number.isFinite(v)) {
    // Número de serie de Excel (días desde 1899-12-30)
    const d = new Date(Math.round((v - 25569) * 86400000));
    return { valor: d.toISOString().slice(0, 10), esTexto: false };
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return { valor: `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`, esTexto: false };
  }

  const s = String(v).trim();
  let m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/); // dd/mm/aaaa
  if (m) return { valor: `${m[3]}-${pad(m[2])}-${pad(m[1])}`, esTexto: true };
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);               // aaaa-mm-dd
  if (m) return { valor: `${m[1]}-${pad(m[2])}-${pad(m[3])}`, esTexto: true };
  return { valor: null, esTexto: true };
}

function aNumero(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/[^\d.\-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

function aTexto(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/** Busca la fila de encabezados (la que contiene "MONTO DESEMBOLSADO") */
export function encontrarEncabezado(aoa, maxFilas = 40) {
  for (let i = 0; i < Math.min(aoa.length, maxFilas); i++) {
    if ((aoa[i] || []).some((c) => normalizar(c) === 'MONTO DESEMBOLSADO')) return i;
  }
  return -1;
}

/**
 * Convierte la hoja (arreglo de filas) en registros para la base de datos.
 * @param {Array<Array>} aoa  filas de la hoja SEJ
 * @returns {{ filas: object[], avisos: string[], errores: string[], filaEncabezado: number }}
 */
export function parsearHoja(aoa) {
  const avisos = [];
  const errores = [];
  const iEnc = encontrarEncabezado(aoa);
  if (iEnc === -1) {
    return { filas: [], avisos, errores: ['No se encontró la fila de encabezados (con "MONTO DESEMBOLSADO") en la hoja SEJ.'], filaEncabezado: -1 };
  }

  // Índice de cada columna
  const indices = {};
  aoa[iEnc].forEach((celda, i) => {
    const campo = MAPA[normalizar(celda)];
    if (campo && !(campo in indices)) indices[campo] = i;
  });

  const faltan = REQUERIDAS.filter((c) => !(c in indices));
  if (faltan.length) {
    const nombres = Object.entries(COLUMNAS).filter(([, v]) => faltan.includes(v)).map(([k]) => k);
    errores.push(`Faltan estas columnas en la hoja SEJ: ${nombres.join(', ')}.`);
    return { filas: [], avisos, errores, filaEncabezado: iEnc + 1 };
  }

  let fechasTexto = 0;
  let fechasInvalidas = 0;
  let sustentoConTilde = 0;
  let montosVacios = 0;
  const filas = [];

  for (let r = iEnc + 1; r < aoa.length; r++) {
    const fila = aoa[r] || [];
    const reg = {};
    let tieneDatos = false;

    for (const campo of Object.values(COLUMNAS)) {
      const i = indices[campo];
      const crudo = i === undefined ? null : fila[i];
      if (crudo !== null && crudo !== undefined && String(crudo).trim() !== '') tieneDatos = true;

      if (FECHAS.includes(campo)) {
        const { valor, esTexto } = aFecha(crudo);
        if (campo === 'fecha_desembolso' && esTexto) {
          if (valor) fechasTexto++;
          else fechasInvalidas++;
        }
        reg[campo] = valor;
      } else if (NUMEROS.includes(campo)) {
        reg[campo] = aNumero(crudo);
      } else if (ENTEROS.includes(campo)) {
        const n = aNumero(crudo);
        reg[campo] = n === null ? null : Math.round(n);
      } else {
        let t = aTexto(crudo);
        if (t !== null && MAYUSCULAS.includes(campo)) t = t.toUpperCase();
        if (campo === 'sustento' && t === 'SÍ') {
          t = 'SI';
          sustentoConTilde++;
        }
        reg[campo] = t;
      }
    }

    if (!tieneDatos) continue; // fila vacía
    if (reg.monto_desembolsado === null) montosVacios++;
    filas.push(reg);
  }

  if (fechasTexto) avisos.push(`${fechasTexto} fechas de desembolso venían como texto; se convirtieron a fecha.`);
  if (fechasInvalidas) avisos.push(`${fechasInvalidas} fechas de desembolso no se pudieron leer; esas filas no suman en el avance.`);
  if (sustentoConTilde) avisos.push(`${sustentoConTilde} sustentos venían como "SÍ" (con tilde); se guardaron como "SI".`);
  if (montosVacios) avisos.push(`${montosVacios} filas no tienen monto desembolsado.`);

  return { filas, avisos, errores, filaEncabezado: iEnc + 1 };
}

/** Mes más frecuente de las fechas de desembolso, como 'AAAA-MM-01' */
export function periodoSugerido(filas) {
  const cuenta = {};
  filas.forEach((f) => {
    if (f.fecha_desembolso) {
      const p = `${f.fecha_desembolso.slice(0, 7)}-01`;
      cuenta[p] = (cuenta[p] || 0) + 1;
    }
  });
  const orden = Object.entries(cuenta).sort((a, b) => b[1] - a[1]);
  return orden.length ? orden[0][0] : null;
}

/** Lee un archivo Excel (ArrayBuffer) y devuelve el resultado de parsearHoja */
export function leerExcel(XLSX, buffer) {
  const wb = XLSX.read(buffer, { type: 'array' });
  const nombre = wb.SheetNames.find((n) => normalizar(n) === HOJA_DATA);
  if (!nombre) {
    return { filas: [], avisos: [], errores: [`El archivo no tiene una hoja llamada "${HOJA_DATA}". Hojas encontradas: ${wb.SheetNames.join(', ')}.`], filaEncabezado: -1 };
  }
  const aoa = XLSX.utils.sheet_to_json(wb.Sheets[nombre], { header: 1, raw: true, defval: null });
  return parsearHoja(aoa);
}

/* ---------------------------------------------------------
   DESCARGA DEL REPORTE (Resumen 2, Resumen 1 y SEJ)
   --------------------------------------------------------- */
const fechaExcel = (iso) => (iso ? new Date(`${iso}T00:00:00`) : null);

export function descargarReporte(XLSX, { creditos, r1, r2, params, nombreMes }) {
  const wb = XLSX.utils.book_new();

  // ---- Resumen 2 ----
  const filas2 = [
    ['Parámetros', '', '', 'Días', ''],
    ['Inicio de mes', fechaExcel(params.inicio), '', 'Útiles', r2.dias.utiles],
    ['Fin de mes', fechaExcel(params.fin), '', 'Transcurridos', r2.dias.transcurridos],
    ['Fecha de corte', fechaExcel(params.corte), '', 'Avance Tiempo', r2.dias.avance],
    ['Excluir "NO PROCEDE"', params.excluirNoProcede ? 'SI' : 'NO'],
    ['Sustento', params.sustento],
    [],
    ['REGIÓN', 'CMA', `CUOTA ${nombreMes}`, 'AVANCE vs CUOTA', 'AVANCE vs TIEMPO', 'SUSTENTO SI', 'SUSTENTO NO'],
    ...r2.filas.map((f) => [f.region, f.monto, f.cuota, f.vsCuota, f.vsTiempo, f.si, f.no]),
    ['TOTAL', r2.total.monto, r2.total.cuota, r2.total.vsCuota, r2.total.vsTiempo, r2.total.si, r2.total.no],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(filas2, { cellDates: true, dateNF: 'dd/mm/yyyy' });
  ws2['!cols'] = [{ wch: 24 }, { wch: 15 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 12 }];
  // Formato de porcentajes y montos
  const inicioTabla = 8;
  for (let r = inicioTabla; r < filas2.length; r++) {
    ['B', 'C'].forEach((L) => { const c = ws2[`${L}${r + 1}`]; if (c) c.z = '#,##0'; });
    ['D', 'E'].forEach((L) => { const c = ws2[`${L}${r + 1}`]; if (c) c.z = '0.0%'; });
  }
  if (ws2.E4) ws2.E4.z = '0.0%';
  XLSX.utils.book_append_sheet(wb, ws2, 'Resumen 2');

  // ---- Resumen 1 ----
  const filas1 = [['Etiquetas de fila', 'Suma de MONTO DESEMBOLSADO', 'Cuenta de DNI CLIENTE']];
  r1.regiones.forEach((reg) => {
    filas1.push([reg.region, reg.monto, reg.cuenta]);
    reg.agencias.forEach((a) => filas1.push([`    ${a.agencia}`, a.monto, a.cuenta]));
  });
  filas1.push(['Total general', r1.total.monto, r1.total.cuenta]);
  const ws1 = XLSX.utils.aoa_to_sheet(filas1);
  ws1['!cols'] = [{ wch: 35 }, { wch: 28 }, { wch: 24 }];
  for (let r = 2; r <= filas1.length; r++) { if (ws1[`B${r}`]) ws1[`B${r}`].z = '#,##0.00'; }
  XLSX.utils.book_append_sheet(wb, ws1, 'Resumen 1');

  // ---- SEJ (data con los encabezados originales) ----
  const encabezados = Object.keys(COLUMNAS);
  const campos = Object.values(COLUMNAS);
  const filasSej = [encabezados, ...creditos.map((c) =>
    campos.map((k) => (FECHAS.includes(k) ? fechaExcel(c[k]) : c[k] ?? null)))];
  const wsSej = XLSX.utils.aoa_to_sheet(filasSej, { cellDates: true, dateNF: 'dd/mm/yyyy' });
  XLSX.utils.book_append_sheet(wb, wsSej, 'SEJ');

  XLSX.writeFile(wb, `Reporte_Resumen_${nombreMes}_${params.corte}.xlsx`);
}
