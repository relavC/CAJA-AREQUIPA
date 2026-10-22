/* =========================================================
   VISTA (ADMIN): CARGAR EXCEL
   Lee la hoja SEJ, muestra una vista previa con avisos y
   reemplaza la data del mes elegido en la base de datos.
   ========================================================= */
import { $ } from '../../utils/helpers.js';
import { leerExcel, periodoSugerido } from '../../core/excel.js';
import { nombreMes } from '../../core/calculos.js';
import { esc, soles2, num, fecha, conBoton, toast } from '../ui.js';

function historial(cargas) {
  if (!cargas.length) return '<p style="color:var(--color-text-muted)">Todavía no hay cargas.</p>';
  return `<div class="table-wrap"><table class="table">
    <thead><tr><th>Fecha y hora</th><th>Mes</th><th>Archivo</th><th class="num">Filas</th></tr></thead>
    <tbody>${cargas.map((c) => `<tr>
      <td>${new Date(c.creado_en).toLocaleString('es-PE')}</td>
      <td>${nombreMes(c.periodo)} ${c.periodo.slice(0, 4)}</td>
      <td>${esc(c.archivo)}</td><td class="num">${num(c.filas)}</td></tr>`).join('')}</tbody>
  </table></div>`;
}

export async function render(ctx) {
  const { el, api, datos, setPeriodo } = ctx;
  const [cargas, agencias] = await Promise.all([api.ultimasCargas(10), api.obtenerAgencias()]);
  if (!ctx.vigente()) return;
  const mapaAgencias = new Set(agencias.map((a) => a.agencia));

  el.innerHTML = `
    <section class="panel">
      <div class="panel__head"><div><h2><i class="ri-upload-cloud-2-line"></i> Subir Excel del día</h2>
        <p>Se lee la hoja <b>SEJ</b>; la fila de encabezados se detecta sola (hoy es la fila 9).</p></div></div>
      <div class="panel__body" style="display:grid;gap:1.25rem">
        <label class="dropzone" data-drop>
          <i class="ri-file-excel-2-line"></i>
          <strong>Arrastra aquí tu archivo o haz clic para elegirlo</strong>
          <small>Formato .xlsx (ej. AVANCE.xlsx)</small>
          <input type="file" accept=".xlsx,.xls" data-archivo />
        </label>
        <div data-preview></div>
      </div>
    </section>
    <section class="panel">
      <div class="panel__head"><div><h2><i class="ri-history-line"></i> Últimas cargas</h2></div></div>
      <div class="panel__body panel__body--flush" style="padding:0 0 .5rem">${historial(cargas)}</div>
    </section>`;

  const drop = $('[data-drop]', el);
  const input = $('[data-archivo]', el);
  const preview = $('[data-preview]', el);

  const procesar = async (archivo) => {
    if (!archivo) return;
    if (!window.XLSX) return toast('No se pudo cargar la librería de Excel. Revisa tu conexión.', 'bad');

    preview.innerHTML = '<div class="alert alert--info"><i class="ri-loader-4-line"></i> Leyendo archivo...</div>';
    const res = leerExcel(window.XLSX, await archivo.arrayBuffer());

    if (res.errores.length) {
      preview.innerHTML = `<div class="alert alert--bad"><i class="ri-error-warning-line"></i><div><b>No se puede cargar este archivo</b><ul>${res.errores.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div></div>`;
      return;
    }

    const filas = res.filas;
    const sugerido = periodoSugerido(filas) || ctx.estado.periodo;
    const total = filas.reduce((s, f) => s + (f.monto_desembolsado || 0), 0);
    const fechas = filas.map((f) => f.fecha_desembolso).filter(Boolean).sort();
    const supervisores = new Set(filas.map((f) => f.codigo_asesor).filter(Boolean));
    const sinRegion = [...new Set(filas.map((f) => f.agencia_desembolso).filter((a) => a && !mapaAgencias.has(a)))].sort();
    const fueraDeMes = (p) => filas.filter((f) => f.fecha_desembolso && f.fecha_desembolso.slice(0, 7) !== p.slice(0, 7)).length;

    // Metas por supervisor que vengan en el Excel (columna META MONTO / META NUMERO)
    const metasExcel = {};
    filas.forEach((f) => {
      if (!f.codigo_asesor || (!f.meta_monto && !f.meta_numero)) return;
      const m = (metasExcel[f.codigo_asesor] ??= { codigo_asesor: f.codigo_asesor, meta_monto: 0, meta_numero: 0 });
      m.meta_monto = Math.max(m.meta_monto, f.meta_monto || 0);
      m.meta_numero = Math.max(m.meta_numero, f.meta_numero || 0);
    });
    const nMetas = Object.keys(metasExcel).length;

    preview.innerHTML = `
      <div style="display:grid;gap:1rem">
        <div class="stat-list">
          <div><small>Archivo</small><strong style="font-size:1rem">${esc(archivo.name)}</strong></div>
          <div><small>Filas con data</small><strong>${num(filas.length)}</strong></div>
          <div><small>Monto total</small><strong>${soles2(total)}</strong></div>
          <div><small>Desembolsos</small><strong style="font-size:1rem">${fecha(fechas[0])} – ${fecha(fechas[fechas.length - 1])}</strong></div>
          <div><small>Supervisores (códigos)</small><strong>${num(supervisores.size)}</strong></div>
          <div><small>Encabezados en fila</small><strong>${res.filaEncabezado}</strong></div>
        </div>
        ${res.avisos.length ? `<div class="alert alert--warn"><i class="ri-error-warning-line"></i><div><b>Avisos</b><ul>${res.avisos.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div></div>` : ''}
        ${sinRegion.length ? `<div class="alert alert--warn"><i class="ri-map-pin-line"></i><div><b>Agencias sin región asignada</b> (se cargan, pero no suman en el avance por región hasta asignarlas en <a href="#agencias" style="color:inherit;text-decoration:underline">Agencias y regiones</a>):<ul>${sinRegion.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div></div>` : ''}
        ${nMetas ? `<div class="alert alert--info"><i class="ri-flag-2-line"></i><div>El Excel trae metas para <b>${nMetas}</b> supervisores; se guardarán en "Metas del mes".</div></div>` : ''}
        <div class="toolbar">
          <label class="control"><span>Mes de la data</span><input type="month" data-mes value="${sugerido.slice(0, 7)}" /></label>
          <span class="grow" data-fuera style="font-size:var(--fs-sm);color:var(--color-text-muted)"></span>
          <button class="btn btn--primary" data-confirmar><i class="ri-database-2-line"></i> Cargar a la base de datos</button>
        </div>
        <div class="alert alert--info"><i class="ri-information-line"></i><div>La carga <b>reemplaza</b> toda la data del mes elegido por la de este archivo.</div></div>
      </div>`;

    const inputMes = $('[data-mes]', preview);
    const avisoFuera = $('[data-fuera]', preview);
    const actualizarFuera = () => {
      const n = fueraDeMes(`${inputMes.value}-01`);
      avisoFuera.textContent = n ? `⚠ ${n} filas tienen fecha de desembolso de otro mes.` : '';
    };
    inputMes.addEventListener('change', actualizarFuera);
    actualizarFuera();

    $('[data-confirmar]', preview).addEventListener('click', (e) => conBoton(e.currentTarget, async () => {
      if (!inputMes.value) return toast('Elige el mes de la data.', 'bad');
      const periodo = `${inputMes.value}-01`;
      if (!confirm(`Se reemplazará la data de ${nombreMes(periodo)} ${periodo.slice(0, 4)} con ${filas.length} filas. ¿Continuar?`)) return;
      try {
        const n = await api.cargarCreditos(periodo, archivo.name, filas);
        if (nMetas) await api.guardarMetas(periodo, Object.values(metasExcel));
        datos.invalidar(periodo);
        toast(`Se cargaron ${n} créditos de ${nombreMes(periodo)}.`);
        setPeriodo(periodo);
        location.hash = '#resumen';
      } catch (err) {
        toast(`Error al cargar: ${err.message}`, 'bad');
      }
    }));
  };

  input.addEventListener('change', () => procesar(input.files[0]));
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
  drop.addEventListener('drop', (e) => procesar(e.dataTransfer.files[0]));
}
