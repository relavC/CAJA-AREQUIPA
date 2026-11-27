/* =========================================================
   DASHBOARD (modo demo, sin base de datos)
   Acceso: admin / admin. Muestra datos REFERENCIALES.
   La versión conectada a Supabase quedó en app.supabase.js
   para retomarla cuando se implemente la base de datos.
   ========================================================= */
import { $, $$ } from '../utils/helpers.js';
import { requerirSesion, cerrarSesion } from '../services/auth-local.js';
import { esc, soles, num, pct, kpi, barra, tagEstado } from './ui.js';

/* ---------- Datos referenciales ---------- */
const REGIONES = [
  { region: 'Sur',     meta: 1_200_000, desembolsado: 984_000, creditos: 212 },
  { region: 'Centro',  meta:   900_000, desembolsado: 576_000, creditos: 141 },
  { region: 'Norte',   meta:   800_000, desembolsado: 728_000, creditos: 158 },
  { region: 'Oriente', meta:   600_000, desembolsado: 282_000, creditos:  74 },
  { region: 'Lima',    meta: 1_000_000, desembolsado: 730_000, creditos: 169 },
];

const PRODUCTOS = [
  { nombre: 'Crédito de negocio',  monto: 1_798_000 },
  { nombre: 'Crédito de consumo',  monto:   990_000 },
  { nombre: 'Crédito de vivienda', monto:   512_000 },
];

const MESES = [
  ['Ene', 2_150_000], ['Feb', 2_380_000], ['Mar', 2_290_000], ['Abr', 2_710_000],
  ['May', 2_840_000], ['Jun', 3_020_000], ['Jul', 3_300_000],
];

const AVANCE_TIEMPO = 0.8; // % de días útiles transcurridos (referencial)

/* ---------- Vistas ---------- */
function vistaResumen(el) {
  const meta = REGIONES.reduce((a, r) => a + r.meta, 0);
  const desem = REGIONES.reduce((a, r) => a + r.desembolsado, 0);
  const creditos = REGIONES.reduce((a, r) => a + r.creditos, 0);
  const avance = desem / meta;
  const maxMes = Math.max(...MESES.map(([, v]) => v));
  const totalProd = PRODUCTOS.reduce((a, p) => a + p.monto, 0);

  el.innerHTML = `
    <div class="alert alert--info"><i class="ri-information-line"></i>
      <div>Estos datos son <b>referenciales</b>. Cuando se conecte la base de datos se mostrará la información real.</div>
    </div>

    <section class="kpis">
      ${kpi({ icono: 'ri-money-dollar-circle-line', label: 'Desembolsado', valor: soles(desem), hint: 'Mes actual', oscuro: true })}
      ${kpi({ icono: 'ri-flag-2-line', label: 'Meta del mes', valor: soles(meta), hint: `Faltan ${soles(meta - desem)}` })}
      ${kpi({ icono: 'ri-percent-line', label: 'Avance', valor: pct(avance), extra: barra(avance, false) })}
      ${kpi({ icono: 'ri-file-list-3-line', label: 'Créditos', valor: num(creditos), hint: `Ticket prom. ${soles(desem / creditos)}` })}
    </section>

    <div class="grid-2">
      <section class="panel">
        <div class="panel__head"><h2><i class="ri-bar-chart-2-line"></i> Desembolsos por mes</h2></div>
        <div class="panel__body">
          <div class="chart-cols">
            ${MESES.map(([m, v]) => `
              <div class="chart-cols__col" title="${m}: ${soles(v)}">
                <span class="chart-cols__val">${(v / 1e6).toFixed(1)}M</span>
                <span class="chart-cols__bar" style="height:${(v / maxMes) * 78}%"></span>
                <span class="chart-cols__lbl">${m}</span>
              </div>`).join('')}
          </div>
        </div>
      </section>

      <section class="panel">
        <div class="panel__head"><h2><i class="ri-pie-chart-2-line"></i> Cartera por producto</h2></div>
        <div class="panel__body">
          <div class="stack-list">
            ${PRODUCTOS.map((p) => `
              <div>
                <div class="stack-list__row"><span>${esc(p.nombre)}</span><b>${soles(p.monto)} · ${pct(p.monto / totalProd)}</b></div>
                ${barra(p.monto / totalProd, false)}
              </div>`).join('')}
          </div>
        </div>
      </section>
    </div>

    <section class="panel">
      <div class="panel__head"><h2><i class="ri-map-pin-2-line"></i> Avance por región</h2></div>
      <div class="panel__body panel__body--flush table-wrap">
        <table class="table">
          <thead><tr><th>Región</th><th class="num">Meta</th><th class="num">Desembolsado</th><th class="num">Créditos</th><th>Avance</th><th class="center">vs tiempo</th></tr></thead>
          <tbody>
            ${REGIONES.map((r) => {
              const a = r.desembolsado / r.meta;
              return `<tr>
                <td><b>${esc(r.region)}</b></td>
                <td class="num">${soles(r.meta)}</td>
                <td class="num">${soles(r.desembolsado)}</td>
                <td class="num">${num(r.creditos)}</td>
                <td><div class="cell-progress"><b>${pct(a)}</b>${barra(a)}</div></td>
                <td class="center">${tagEstado(a / AVANCE_TIEMPO)}</td>
              </tr>`;
            }).join('')}
          </tbody>
          <tfoot><tr><td>Total</td><td class="num">${soles(meta)}</td><td class="num">${soles(desem)}</td><td class="num">${num(creditos)}</td><td>${pct(avance)}</td><td class="center">${tagEstado(avance / AVANCE_TIEMPO)}</td></tr></tfoot>
        </table>
      </div>
    </section>`;
}

const RUTAS = {
  resumen: { titulo: 'Resumen', icono: 'ri-dashboard-3-line', render: vistaResumen },
};

/* ---------- Elementos ---------- */
const el = {
  app: $('[data-app]'),
  loading: $('[data-loading]'),
  menu: $('[data-menu]'),
  vista: $('[data-view]'),
  titulo: $('[data-view-title]'),
  subtitulo: $('[data-view-subtitle]'),
  sidebar: $('[data-sidebar]'),
  overlay: $('[data-sidebar-overlay]'),
};

function construirMenu() {
  el.menu.innerHTML = '<div class="sidebar__group">General</div>' +
    Object.entries(RUTAS).map(([id, r]) =>
      `<a href="#${id}" class="sidebar__link" data-ruta="${id}"><i class="${r.icono}"></i>${r.titulo}</a>`).join('') + `
    <div class="sidebar__group">Portal</div>
    <a href="../index.html" class="sidebar__link"><i class="ri-home-4-line"></i>Inicio</a>
    <a href="herramientas.html" class="sidebar__link"><i class="ri-tools-line"></i>Herramientas</a>`;
}

function mostrarVista() {
  let id = location.hash.replace('#', '') || 'resumen';
  if (!RUTAS[id]) id = 'resumen';
  const ruta = RUTAS[id];
  $$('[data-ruta]', el.menu).forEach((a) => a.classList.toggle('is-active', a.dataset.ruta === id));
  el.titulo.textContent = ruta.titulo;
  document.title = `${ruta.titulo} | SEJ Partners`;
  cerrarSidebar();
  ruta.render(el.vista);
}

/* ---------- Sidebar móvil ---------- */
function cerrarSidebar() {
  el.sidebar.classList.remove('is-open');
  el.overlay.classList.remove('is-visible');
}
$('[data-sidebar-toggle]').addEventListener('click', () => {
  el.sidebar.classList.add('is-open');
  el.overlay.classList.add('is-visible');
});
el.overlay.addEventListener('click', cerrarSidebar);

/* ---------- Arranque ---------- */
const perfil = requerirSesion('login.html');
if (perfil) {
  $('[data-user-name]').textContent = perfil.nombre;
  $('[data-user-role]').textContent = 'Administrador';
  $('[data-user-initials]').textContent = 'AD';
  $('[data-logout]').addEventListener('click', () => {
    cerrarSesion();
    window.location.replace('login.html');
  });

  const hoy = new Date();
  el.subtitulo.textContent = hoy.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });

  construirMenu();
  window.addEventListener('hashchange', mostrarVista);
  el.loading.classList.add('is-hidden');
  el.app.hidden = false;
  mostrarVista();
}
