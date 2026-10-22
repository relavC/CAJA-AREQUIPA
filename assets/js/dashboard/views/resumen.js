/* =========================================================
   VISTA: RESUMEN
   - Admin / Jefe: avance por región (Resumen 2), por supervisor
     y por región/agencia (Resumen 1). Descarga el reporte en Excel.
   - Supervisor: su avance frente a su meta y sus desembolsos.
   ========================================================= */
import { $, $$ } from '../../utils/helpers.js';
import { resumen1, resumen2, porSupervisor, calcularDias, finDeMes, nombreMes } from '../../core/calculos.js';
import { descargarReporte } from '../../core/excel.js';
import { esc, soles, soles2, num, pct, fecha, hoyISO, kpi, barra, progreso, tagEstado, vacio, toast } from '../ui.js';

/** Fecha de corte sugerida: último desembolso del mes (o hoy, dentro del mes) */
function corteSugerido(creditos, inicio, fin) {
  const fechas = creditos.map((c) => c.fecha_desembolso).filter((f) => f && f >= inicio && f <= fin).sort();
  if (fechas.length) return fechas[fechas.length - 1];
  const hoy = hoyISO();
  return hoy < inicio ? inicio : hoy > fin ? fin : hoy;
}

function barraParametros(p, puedeDescargar) {
  return `
  <section class="panel">
    <div class="panel__body">
      <div class="toolbar">
        <label class="control"><span>Inicio de mes</span><input type="date" value="${p.inicio}" disabled /></label>
        <label class="control"><span>Fin de mes</span><input type="date" value="${p.fin}" disabled /></label>
        <label class="control"><span>Fecha de corte</span><input type="date" data-p="corte" value="${p.corte}" min="${p.inicio}" max="${p.fin}" /></label>
        <label class="control"><span>Excluir "NO PROCEDE"</span>
          <select data-p="excluirNoProcede">
            <option value="SI" ${p.excluirNoProcede ? 'selected' : ''}>SI</option>
            <option value="NO" ${!p.excluirNoProcede ? 'selected' : ''}>NO</option>
          </select></label>
        <label class="control"><span>Sustento</span>
          <select data-p="sustento">
            ${['TODOS', 'SI', 'NO'].map((s) => `<option ${p.sustento === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select></label>
        <span class="grow"></span>
        ${puedeDescargar ? '<button class="btn btn--primary btn--sm" data-descargar><i class="ri-file-excel-2-line"></i> Descargar reporte Excel</button>' : ''}
      </div>
    </div>
  </section>`;
}

/* ---------- Tablas ---------- */
function tablaRegiones(r2, mes) {
  const filas = r2.filas.map((f) => `
    <tr>
      <td><b>${esc(f.region)}</b></td>
      <td class="num">${soles(f.monto)}</td>
      <td class="num">${soles(f.cuota)}</td>
      <td>${progreso(f.vsCuota)}</td>
      <td class="center">${tagEstado(f.vsTiempo, f.cuota > 0)}</td>
      <td class="center">${num(f.si)}</td>
      <td class="center">${num(f.no)}</td>
    </tr>`).join('');
  const t = r2.total;
  return `
  <section class="panel">
    <div class="panel__head">
      <div><h2><i class="ri-map-2-line"></i> Avance por región</h2><p>CMA vs cuota de ${mes} · equivalente a "Resumen 2"</p></div>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Región</th><th class="num">CMA</th><th class="num">Cuota ${mes}</th><th>Avance vs cuota</th><th class="center">Avance vs tiempo</th><th class="center">Sustento SI</th><th class="center">Sustento NO</th></tr></thead>
        <tbody>${filas}</tbody>
        <tfoot><tr>
          <td>TOTAL</td><td class="num">${soles(t.monto)}</td><td class="num">${soles(t.cuota)}</td>
          <td>${progreso(t.vsCuota)}</td><td class="center">${tagEstado(t.vsTiempo, t.cuota > 0)}</td>
          <td class="center">${num(t.si)}</td><td class="center">${num(t.no)}</td>
        </tr></tfoot>
      </table>
    </div>
  </section>`;
}

function tablaSupervisores(lista) {
  if (!lista.length) return '';
  const hayMetas = lista.some((s) => s.metaMonto > 0);
  const filas = lista.map((s, i) => `
    <tr>
      <td class="center">${i + 1}</td>
      <td><b>${esc(s.nombre)}</b><br><small style="color:var(--color-text-muted)">${esc(s.codigo)}</small></td>
      <td class="center">${num(s.numero)}</td>
      <td class="num">${soles(s.monto)}</td>
      <td class="num">${soles(s.ticket)}</td>
      ${hayMetas ? `
        <td class="num">${s.metaMonto ? soles(s.metaMonto) : '—'}</td>
        <td>${s.metaMonto ? progreso(s.vsMeta) : '<span class="tag tag--muted">Sin meta</span>'}</td>
        <td class="center">${tagEstado(s.vsTiempo, s.metaMonto > 0)}</td>` : ''}
    </tr>`).join('');
  return `
  <section class="panel">
    <div class="panel__head">
      <div><h2><i class="ri-team-line"></i> Avance por supervisor</h2><p>Mismos filtros del avance por región${hayMetas ? '' : ' · registra metas en "Metas del mes" para ver el avance'}</p></div>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th class="center">#</th><th>Supervisor</th><th class="center">N°</th><th class="num">Monto</th><th class="num">Ticket prom.</th>
          ${hayMetas ? '<th class="num">Meta</th><th>Avance vs meta</th><th class="center">vs tiempo</th>' : ''}</tr></thead>
        <tbody>${filas}</tbody>
      </table>
    </div>
  </section>`;
}

function tablaRegionAgencia(r1, titulo = 'Desembolsos por región y agencia', subtitulo = 'Toda la data cargada del mes · equivalente a "Resumen 1"') {
  const filas = r1.regiones.map((r, i) => `
    <tr class="row-group" data-grupo="${i}">
      <td><i class="ri-arrow-right-s-line"></i> ${esc(r.region)}</td>
      <td class="num">${soles2(r.monto)}</td><td class="center">${num(r.cuenta)}</td>
    </tr>
    ${r.agencias.map((a) => `
      <tr class="row-child" data-hijo="${i}" hidden>
        <td>${esc(a.agencia)}</td><td class="num">${soles2(a.monto)}</td><td class="center">${num(a.cuenta)}</td>
      </tr>`).join('')}`).join('');
  return `
  <section class="panel">
    <div class="panel__head">
      <div><h2><i class="ri-building-2-line"></i> ${titulo}</h2><p>${subtitulo}</p></div>
      <button class="btn btn--ghost btn--sm" data-expandir><i class="ri-expand-up-down-line"></i> Expandir todo</button>
    </div>
    <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Región / Agencia</th><th class="num">Monto desembolsado</th><th class="center">N° clientes</th></tr></thead>
        <tbody>${filas}</tbody>
        <tfoot><tr><td>Total general</td><td class="num">${soles2(r1.total.monto)}</td><td class="center">${num(r1.total.cuenta)}</td></tr></tfoot>
      </table>
    </div>
  </section>`;
}

function enlazarExpandir(el) {
  $$('.row-group', el).forEach((tr) => tr.addEventListener('click', () => {
    const abierto = tr.classList.toggle('is-open');
    $$(`[data-hijo="${tr.dataset.grupo}"]`, el).forEach((h) => (h.hidden = !abierto));
  }));
  $('[data-expandir]', el)?.addEventListener('click', () => {
    const grupos = $$('.row-group', el);
    const abrir = grupos.some((g) => !g.classList.contains('is-open'));
    grupos.forEach((g) => g.classList.toggle('is-open', abrir));
    $$('.row-child', el).forEach((h) => (h.hidden = !abrir));
  });
}

/* ---------- Render ---------- */
export async function render(ctx) {
  const { el, estado, datos } = ctx;
  const { creditos, config } = await datos.mes();
  if (!ctx.vigente()) return;

  const periodo = estado.periodo;
  const mes = nombreMes(periodo);
  const p = estado.params;
  p.inicio = periodo;
  p.fin = finDeMes(periodo);
  if (!p.corte || p.corte < p.inicio || p.corte > p.fin) p.corte = corteSugerido(creditos, p.inicio, p.fin);
  p.excluirNoProcede ??= true;
  p.sustento ??= 'TODOS';

  const rol = estado.perfil.rol;
  const esSupervisor = rol === 'supervisor';

  if (!creditos.length) {
    el.innerHTML = `<section class="panel">${vacio('ri-inbox-line', `Aún no hay créditos para ${mes} ${periodo.slice(0, 4)}`,
      rol === 'admin' ? 'Sube el Excel del día para ver el avance.' : 'Cuando el administrador cargue la data, aquí verás el avance.',
      rol === 'admin' ? '<a href="#cargar" class="btn btn--primary btn--sm"><i class="ri-upload-cloud-2-line"></i> Cargar Excel</a>' : '')}</section>`;
    return;
  }

  const pintar = () => {
    const dias = calcularDias(p, config.feriados);
    const r2 = resumen2(creditos, { ...config, params: p });
    const r1 = resumen1(creditos, config.agenciaRegion);
    const sups = porSupervisor(creditos, { params: p, metas: config.metas, dias });

    let html = barraParametros(p, true);

    if (esSupervisor) {
      const codigo = (estado.perfil.codigo_asesor || '').toUpperCase();
      const yo = sups.find((s) => s.codigo === codigo) || { monto: 0, numero: 0, metaMonto: 0, metaNumero: 0, vsMeta: 0, vsTiempo: 0, ticket: 0 };
      const ultimos = [...creditos].sort((a, b) => (b.fecha_desembolso || '').localeCompare(a.fecha_desembolso || '')).slice(0, 8);

      html += `
      <section class="kpis">
        ${kpi({ icono: 'ri-money-dollar-circle-line', label: 'Mis desembolsos', valor: soles(yo.monto), hint: `Al ${fecha(p.corte)}`, oscuro: true })}
        ${kpi({ icono: 'ri-file-list-3-line', label: 'N° de créditos', valor: num(yo.numero), hint: `Ticket promedio ${soles(yo.ticket)}` })}
        ${kpi({ icono: 'ri-flag-2-line', label: 'Mi meta del mes', valor: yo.metaMonto ? soles(yo.metaMonto) : 'Sin meta', hint: yo.metaNumero ? `${num(yo.metaNumero)} créditos` : '' })}
        ${kpi({ icono: 'ri-percent-line', label: 'Avance vs meta', valor: yo.metaMonto ? pct(yo.vsMeta) : '—', extra: yo.metaMonto ? barra(yo.vsMeta, false) : '' })}
        ${kpi({ icono: 'ri-time-line', label: 'Avance del tiempo', valor: pct(dias.avance), hint: `${dias.transcurridos} de ${dias.utiles} días útiles` })}
        ${kpi({ icono: 'ri-speed-up-line', label: 'Avance vs tiempo', valor: tagEstado(yo.vsTiempo, yo.metaMonto > 0) })}
      </section>
      <div class="grid-2">
        ${tablaRegionAgencia(r1, 'Mis desembolsos por región y agencia', 'Toda tu data cargada del mes')}
        <section class="panel">
          <div class="panel__head"><div><h2><i class="ri-history-line"></i> Últimos desembolsos</h2><p>Los más recientes de tu cartera</p></div>
            <a href="#detalle" class="btn btn--ghost btn--sm">Ver todos</a></div>
          <div class="table-wrap"><table class="table">
            <thead><tr><th>Fecha</th><th>Cliente</th><th class="num">Monto</th></tr></thead>
            <tbody>${ultimos.map((c) => `<tr><td>${fecha(c.fecha_desembolso)}</td><td>${esc(c.nombre_cliente)}</td><td class="num">${soles(c.monto_desembolsado)}</td></tr>`).join('')}</tbody>
          </table></div>
        </section>
      </div>`;
    } else {
      const t = r2.total;
      const nCreditos = sups.reduce((s, x) => s + x.numero, 0);
      const sinRegion = Object.entries(r2.sinRegion);

      html += `
      <section class="kpis">
        ${kpi({ icono: 'ri-money-dollar-circle-line', label: 'Desembolsado (CMA)', valor: soles(t.monto), hint: `${num(nCreditos)} créditos al ${fecha(p.corte)}`, oscuro: true })}
        ${kpi({ icono: 'ri-flag-2-line', label: `Cuota ${mes}`, valor: soles(t.cuota), hint: `Faltan ${soles(Math.max(t.cuota - t.monto, 0))}` })}
        ${kpi({ icono: 'ri-percent-line', label: 'Avance vs cuota', valor: pct(t.vsCuota), extra: barra(t.vsCuota, false) })}
        ${kpi({ icono: 'ri-time-line', label: 'Avance del tiempo', valor: pct(dias.avance), hint: `${dias.transcurridos} de ${dias.utiles} días útiles` })}
        ${kpi({ icono: 'ri-speed-up-line', label: 'Avance vs tiempo', valor: tagEstado(t.vsTiempo, t.cuota > 0) })}
        ${kpi({ icono: 'ri-file-shield-2-line', label: 'Sustento', valor: `${num(t.si)} <small style="font-size:.9rem;font-weight:600">SI</small> · ${num(t.no)} <small style="font-size:.9rem;font-weight:600">NO</small>` })}
      </section>
      ${sinRegion.length ? `
        <div class="alert alert--warn"><i class="ri-error-warning-line"></i><div>
          <b>Agencias sin región en el cuadro</b> (no suman en el avance por región):
          <ul>${sinRegion.map(([a, m]) => `<li>${esc(a)} — ${soles(m)}</li>`).join('')}</ul>
          ${rol === 'admin' ? '<a href="#agencias" style="font-weight:700;color:inherit;text-decoration:underline">Asignarlas en Agencias y regiones</a>' : ''}
        </div></div>` : ''}
      ${tablaRegiones(r2, mes)}
      ${tablaSupervisores(sups)}
      ${tablaRegionAgencia(r1)}`;
    }

    el.innerHTML = html;
    enlazarExpandir(el);

    // Cambios en parámetros
    $$('[data-p]', el).forEach((input) => input.addEventListener('change', () => {
      const k = input.dataset.p;
      if (k === 'corte') { if (input.value) p.corte = input.value; }
      else if (k === 'excluirNoProcede') p.excluirNoProcede = input.value === 'SI';
      else p[k] = input.value;
      pintar();
    }));

    $('[data-descargar]', el)?.addEventListener('click', () => {
      if (!window.XLSX) return toast('No se pudo cargar la librería de Excel. Revisa tu conexión.', 'bad');
      descargarReporte(window.XLSX, { creditos, r1, r2, params: p, nombreMes: mes });
      toast('Reporte descargado');
    });
  };

  pintar();
}
