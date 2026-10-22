/* =========================================================
   DASHBOARD — arranque, menú por rol y navegación
   Cada pantalla vive en assets/js/dashboard/views/
   Para agregar una pantalla nueva: crea la vista y súmala a RUTAS.
   ========================================================= */
import { $, $$ } from '../utils/helpers.js';
import { configurado } from '../services/supabase.js';
import { requerirSesion, cerrarSesion } from '../services/auth.js';
import * as api from '../services/api.js';
import { toast, esc, cargando, vacio } from './ui.js';
import { nombreMes } from '../core/calculos.js';

import * as vResumen from './views/resumen.js';
import * as vDetalle from './views/detalle.js';
import * as vCargar from './views/cargar.js';
import * as vMetas from './views/metas.js';
import * as vAgencias from './views/agencias.js';
import * as vFeriados from './views/feriados.js';
import * as vUsuarios from './views/usuarios.js';

const TODOS = ['admin', 'jefe', 'supervisor'];
const ADMIN = ['admin'];

const RUTAS = {
  resumen:  { titulo: 'Resumen',             icono: 'ri-dashboard-3-line',    roles: TODOS, grupo: 'General', vista: vResumen },
  detalle:  { titulo: 'Detalle de créditos', icono: 'ri-file-list-3-line',    roles: TODOS, grupo: 'General', vista: vDetalle },
  cargar:   { titulo: 'Cargar Excel',        icono: 'ri-upload-cloud-2-line', roles: ADMIN, grupo: 'Administración', vista: vCargar },
  metas:    { titulo: 'Metas del mes',       icono: 'ri-flag-2-line',         roles: ADMIN, grupo: 'Administración', vista: vMetas },
  agencias: { titulo: 'Agencias y regiones', icono: 'ri-map-pin-2-line',      roles: ADMIN, grupo: 'Administración', vista: vAgencias },
  feriados: { titulo: 'Feriados',            icono: 'ri-calendar-event-line', roles: ADMIN, grupo: 'Administración', vista: vFeriados },
  usuarios: { titulo: 'Usuarios',            icono: 'ri-team-line',           roles: ADMIN, grupo: 'Administración', vista: vUsuarios },
};

const ROL_TEXTO = { admin: 'Administrador', jefe: 'Jefe', supervisor: 'Supervisor' };

/* ---------- Estado compartido ---------- */
const estado = {
  perfil: null,
  periodo: null,   // 'AAAA-MM-01'
  params: {},      // parámetros del resumen (fecha de corte, filtros)
  cache: {},
};

/** Datos del mes con caché (créditos + configuración) */
const datos = {
  async mes(periodo = estado.periodo) {
    if (!estado.cache[periodo]) {
      estado.cache[periodo] = Promise.all([api.obtenerCreditos(periodo), api.obtenerConfig(periodo)])
        .then(([creditos, config]) => ({ creditos, config }));
    }
    try {
      return await estado.cache[periodo];
    } catch (e) {
      delete estado.cache[periodo];
      throw e;
    }
  },
  invalidar(periodo) {
    if (periodo) delete estado.cache[periodo];
    else estado.cache = {};
  },
};

/* ---------- Elementos ---------- */
const el = {
  app: $('[data-app]'),
  loading: $('[data-loading]'),
  menu: $('[data-menu]'),
  vista: $('[data-view]'),
  titulo: $('[data-view-title]'),
  subtitulo: $('[data-view-subtitle]'),
  periodo: $('[data-periodo]'),
  sidebar: $('[data-sidebar]'),
  overlay: $('[data-sidebar-overlay]'),
};

const rutasPermitidas = () =>
  Object.entries(RUTAS).filter(([, r]) => r.roles.includes(estado.perfil.rol));

function construirMenu() {
  let grupo = '';
  el.menu.innerHTML = rutasPermitidas().map(([id, r]) => {
    const encabezado = r.grupo !== grupo ? `<div class="sidebar__group">${r.grupo}</div>` : '';
    grupo = r.grupo;
    return `${encabezado}<a href="#${id}" class="sidebar__link" data-ruta="${id}"><i class="${r.icono}"></i>${r.titulo}</a>`;
  }).join('') + `
    <div class="sidebar__group">Portal</div>
    <a href="../index.html" class="sidebar__link"><i class="ri-home-4-line"></i>Volver al portal</a>`;
}

function setPeriodo(periodo) {
  estado.periodo = periodo;
  estado.params = {};
  el.periodo.value = periodo.slice(0, 7);
  el.subtitulo.textContent = `${nombreMes(periodo)} ${periodo.slice(0, 4)}`;
}

let turno = 0; // evita que una vista lenta pise a otra más reciente

async function mostrarVista() {
  const permitidas = Object.fromEntries(rutasPermitidas());
  let id = location.hash.replace('#', '') || 'resumen';
  if (!permitidas[id]) id = 'resumen';
  const ruta = permitidas[id];

  $$('[data-ruta]', el.menu).forEach((a) => a.classList.toggle('is-active', a.dataset.ruta === id));
  el.titulo.textContent = ruta.titulo;
  document.title = `${ruta.titulo} | SEJ Partners`;
  cerrarSidebar();

  const miTurno = ++turno;
  el.vista.innerHTML = `<section class="panel">${cargando()}</section>`;
  try {
    await ruta.vista.render({
      el: el.vista, estado, datos, api, toast, setPeriodo,
      vigente: () => miTurno === turno,
      refrescar: () => mostrarVista(),
    });
  } catch (err) {
    console.error(err);
    if (miTurno !== turno) return;
    el.vista.innerHTML = `<section class="panel">${vacio('ri-error-warning-line', 'No se pudo cargar la información', esc(err.message),
      '<button class="btn btn--primary btn--sm" data-reintentar><i class="ri-refresh-line"></i> Reintentar</button>')}</section>`;
    $('[data-reintentar]', el.vista)?.addEventListener('click', () => { datos.invalidar(); mostrarVista(); });
  }
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

/* ---------- Pantalla si falta configurar Supabase ---------- */
function mostrarConfiguracionPendiente() {
  document.body.innerHTML = `
    <main class="setup">
      <section class="panel">
        <div class="panel__head"><h2><i class="ri-settings-3-line"></i> Falta conectar la base de datos</h2></div>
        <div class="panel__body" style="display:grid;gap:1rem">
          <p>Abre <code>assets/js/config.js</code> y coloca la <b>Project URL</b> y la <b>anon key</b> de tu proyecto de Supabase.</p>
          <p>Los pasos completos están en <code>GUIA-SUPABASE.md</code>.</p>
          <a href="../index.html" class="btn btn--primary btn--sm" style="justify-self:start"><i class="ri-arrow-left-line"></i> Volver al portal</a>
        </div>
      </section>
    </main>`;
}

/* ---------- Arranque ---------- */
async function iniciar() {
  if (!configurado) return mostrarConfiguracionPendiente();

  const perfil = await requerirSesion('login.html');
  if (!perfil) return;
  estado.perfil = perfil;

  // Usuario en el sidebar
  $('[data-user-name]').textContent = perfil.nombre;
  $('[data-user-role]').textContent = ROL_TEXTO[perfil.rol] + (perfil.codigo_asesor ? ` · ${perfil.codigo_asesor}` : '');
  $('[data-user-initials]').textContent = perfil.nombre.split(/\s+/).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  $('[data-logout]').addEventListener('click', async () => {
    await cerrarSesion();
    window.location.replace('login.html');
  });

  // Mes inicial: el último con data (o el actual)
  let periodo = null;
  try { periodo = await api.ultimoPeriodo(); } catch { /* sin data aún */ }
  if (!periodo) {
    const d = new Date();
    periodo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }
  setPeriodo(periodo);

  el.periodo.addEventListener('change', () => {
    if (!el.periodo.value) return;
    setPeriodo(`${el.periodo.value}-01`);
    mostrarVista();
  });

  construirMenu();
  window.addEventListener('hashchange', mostrarVista);

  el.loading.classList.add('is-hidden');
  el.app.hidden = false;
  mostrarVista();
}

iniciar().catch((err) => {
  console.error(err);
  el.loading.innerHTML = `<p style="color:#b42318;font-weight:600">Error al iniciar: ${esc(err.message)}</p>
    <a class="btn btn--primary btn--sm" href="login.html">Ir al login</a>`;
});
