/* =========================================================
   VISTA: DETALLE DE CRÉDITOS (con filtros, búsqueda y exportación)
   El supervisor solo recibe sus créditos (lo garantiza la base de datos).
   ========================================================= */
import { $, $$ } from '../../utils/helpers.js';
import { nombreMes } from '../../core/calculos.js';
import { esc, soles, soles2, num, fecha, vacio, toast } from '../ui.js';

const POR_PAGINA = 25;

const opciones = (valores, actual, todos = 'Todos') =>
  `<option value="">${todos}</option>` +
  valores.map((v) => `<option value="${esc(v)}" ${v === actual ? 'selected' : ''}>${esc(v)}</option>`).join('');

export async function render(ctx) {
  const { el, estado, datos } = ctx;
  const { creditos, config } = await datos.mes();
  if (!ctx.vigente()) return;

  const mes = `${nombreMes(estado.periodo)} ${estado.periodo.slice(0, 4)}`;
  if (!creditos.length) {
    el.innerHTML = `<section class="panel">${vacio('ri-inbox-line', `No hay créditos para ${mes}`)}</section>`;
    return;
  }

  const veTodo = estado.perfil.rol !== 'supervisor';
  const regionDe = (c) => config.agenciaRegion[c.agencia_desembolso] || 'SIN REGIÓN';
  const unicos = (fn) => [...new Set(creditos.map(fn).filter(Boolean))].sort();

  const listas = {
    supervisores: unicos((c) => c.coordinador),
    regiones: unicos(regionDe),
    tipos: unicos((c) => c.tipo_credito),
  };

  const f = { q: '', supervisor: '', region: '', tipo: '', sustento: '', pagina: 1 };

  const filtrar = () => {
    const q = f.q.trim().toUpperCase();
    return creditos
      .filter((c) => !f.supervisor || c.coordinador === f.supervisor)
      .filter((c) => !f.region || regionDe(c) === f.region)
      .filter((c) => !f.tipo || c.tipo_credito === f.tipo)
      .filter((c) => !f.sustento || c.sustento === f.sustento)
      .filter((c) => !q || [c.nombre_cliente, c.dni_cliente, c.operacion, c.nro_solicitud, c.agencia_desembolso]
        .some((v) => String(v ?? '').toUpperCase().includes(q)))
      .sort((a, b) => (b.fecha_desembolso || '').localeCompare(a.fecha_desembolso || ''));
  };

  el.innerHTML = `
    <section class="panel">
      <div class="panel__body">
        <div class="toolbar">
          <label class="control grow"><span>Buscar</span><input type="search" data-f="q" placeholder="Cliente, DNI, operación, agencia..." /></label>
          ${veTodo ? `<label class="control"><span>Supervisor</span><select data-f="supervisor">${opciones(listas.supervisores, '')}</select></label>` : ''}
          <label class="control"><span>Región (cuadro)</span><select data-f="region">${opciones(listas.regiones, '')}</select></label>
          <label class="control"><span>Tipo de crédito</span><select data-f="tipo">${opciones(listas.tipos, '')}</select></label>
          <label class="control"><span>Sustento</span><select data-f="sustento">${opciones(['SI', 'NO'], '')}</select></label>
          <button class="btn btn--ghost btn--sm" data-exportar><i class="ri-file-excel-2-line"></i> Exportar</button>
        </div>
      </div>
    </section>
    <section class="panel" data-resultado></section>`;

  const zona = $('[data-resultado]', el);

  const pintar = () => {
    const lista = filtrar();
    const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
    f.pagina = Math.min(f.pagina, paginas);
    const visibles = lista.slice((f.pagina - 1) * POR_PAGINA, f.pagina * POR_PAGINA);
    const total = lista.reduce((s, c) => s + (Number(c.monto_desembolsado) || 0), 0);

    if (!lista.length) {
      zona.innerHTML = vacio('ri-search-line', 'Sin resultados', 'Prueba con otros filtros.');
      return;
    }

    zona.innerHTML = `
      <div class="panel__head">
        <div><h2><i class="ri-file-list-3-line"></i> ${num(lista.length)} créditos</h2><p>Total ${soles2(total)} · ${mes}</p></div>
      </div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr>
            <th>F. desembolso</th><th>Cliente</th><th>DNI</th><th class="num">Monto</th><th>Tipo</th>
            <th>Agencia</th><th>Región</th>${veTodo ? '<th>Supervisor</th>' : ''}<th class="center">Sustento</th><th>Observaciones</th>
          </tr></thead>
          <tbody>${visibles.map((c) => `
            <tr>
              <td>${fecha(c.fecha_desembolso)}</td>
              <td><b>${esc(c.nombre_cliente)}</b><br><small style="color:var(--color-text-muted)">${esc(c.tipo_cliente || '')}</small></td>
              <td>${esc(c.dni_cliente)}</td>
              <td class="num">${soles(c.monto_desembolsado)}</td>
              <td>${esc(c.tipo_credito)}</td>
              <td>${esc(c.agencia_desembolso)}</td>
              <td>${esc(regionDe(c))}</td>
              ${veTodo ? `<td>${esc(c.coordinador)}</td>` : ''}
              <td class="center">${c.sustento === 'SI' ? '<span class="tag tag--ok">SI</span>' : c.sustento === 'NO' ? '<span class="tag tag--bad">NO</span>' : '—'}</td>
              <td>${c.observaciones ? `<span class="tag tag--warn">${esc(c.observaciones)}</span>` : ''}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="pager">
        <span>Página ${f.pagina} de ${paginas}</span>
        <div>
          <button class="btn btn--ghost btn--sm" data-pag="-1" ${f.pagina === 1 ? 'disabled' : ''}><i class="ri-arrow-left-s-line"></i> Anterior</button>
          <button class="btn btn--ghost btn--sm" data-pag="1" ${f.pagina === paginas ? 'disabled' : ''}>Siguiente <i class="ri-arrow-right-s-line"></i></button>
        </div>
      </div>`;

    $$('[data-pag]', zona).forEach((b) => b.addEventListener('click', () => {
      f.pagina += Number(b.dataset.pag);
      pintar();
    }));
  };

  $$('[data-f]', el).forEach((input) => input.addEventListener(input.type === 'search' ? 'input' : 'change', () => {
    f[input.dataset.f] = input.value;
    f.pagina = 1;
    pintar();
  }));

  $('[data-exportar]', el).addEventListener('click', () => {
    if (!window.XLSX) return toast('No se pudo cargar la librería de Excel.', 'bad');
    const filas = filtrar().map((c) => ({
      'FECHA DE DESEMBOLSO': c.fecha_desembolso, 'NOMBRE CLIENTE': c.nombre_cliente, 'DNI CLIENTE': c.dni_cliente,
      'MONTO DESEMBOLSADO': Number(c.monto_desembolsado) || 0, 'TIPO DE CREDITO': c.tipo_credito, 'TIPO DE CLIENTE': c.tipo_cliente,
      'AGENCIA DESEMBOLSO': c.agencia_desembolso, 'REGION CUADRO': regionDe(c), 'COORDINADOR': c.coordinador,
      'CODIGO ASESOR': c.codigo_asesor, 'OPERACION': c.operacion, 'SUSTENTO': c.sustento, 'OBSERVACIONES': c.observaciones,
    }));
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, window.XLSX.utils.json_to_sheet(filas), 'Detalle');
    window.XLSX.writeFile(wb, `Detalle_creditos_${estado.periodo.slice(0, 7)}.xlsx`);
  });

  pintar();
}
