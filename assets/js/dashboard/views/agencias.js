/* =========================================================
   VISTA (ADMIN): AGENCIAS Y REGIONES DEL CUADRO
   Reemplaza los diccionarios AGENCIA_REGION y CUOTAS del script.
   ========================================================= */
import { $, $$ } from '../../utils/helpers.js';
import { esc, conBoton, toast } from '../ui.js';

export async function render(ctx) {
  const { el, api, datos } = ctx;
  const [regiones, agencias, { creditos }] = await Promise.all([api.obtenerRegiones(), api.obtenerAgencias(), datos.mes()]);
  if (!ctx.vigente()) return;

  const mapeadas = new Set(agencias.map((a) => a.agencia));
  const pendientes = [...new Set(creditos.map((c) => c.agencia_desembolso).filter((a) => a && !mapeadas.has(a)))].sort();
  const opcionesRegion = (actual) => regiones.map((r) =>
    `<option value="${esc(r.nombre)}" ${r.nombre === actual ? 'selected' : ''}>${esc(r.nombre)}</option>`).join('');

  el.innerHTML = `
    ${pendientes.length ? `<div class="alert alert--warn"><i class="ri-error-warning-line"></i><div>
      <b>Agencias del mes sin región:</b> ${pendientes.map((a) => `<button class="tag tag--warn" data-prellenar="${esc(a)}" style="border:0;cursor:pointer">${esc(a)} +</button>`).join(' ')}
      <br><small>Haz clic en una para asignarla.</small></div></div>` : ''}
    <div class="grid-2">
      <section class="panel">
        <div class="panel__head"><div><h2><i class="ri-map-pin-2-line"></i> Agencia → Región</h2><p>${agencias.length} agencias asignadas</p></div></div>
        <div class="panel__body">
          <form class="form-grid" data-form-agencia>
            <label class="control"><span>Agencia de desembolso</span><input name="agencia" required list="agencias-pendientes" placeholder="Ej. MIRAFLORES" /></label>
            <datalist id="agencias-pendientes">${pendientes.map((a) => `<option value="${esc(a)}">`).join('')}</datalist>
            <label class="control"><span>Región</span><select name="region" required>${opcionesRegion()}</select></label>
            <button class="btn btn--primary btn--sm"><i class="ri-add-line"></i> Asignar</button>
          </form>
        </div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Agencia</th><th>Región</th><th></th></tr></thead>
          <tbody>${agencias.map((a) => `
            <tr><td><b>${esc(a.agencia)}</b></td>
              <td><select data-cambiar-region="${esc(a.agencia)}">${opcionesRegion(a.region)}</select></td>
              <td><div class="actions"><button class="icon-btn icon-btn--danger" data-quitar-agencia="${esc(a.agencia)}" title="Quitar"><i class="ri-delete-bin-line"></i></button></div></td></tr>`).join('')}
          </tbody>
        </table></div>
      </section>

      <section class="panel">
        <div class="panel__head"><div><h2><i class="ri-map-2-line"></i> Regiones del cuadro</h2><p>El orden define cómo aparecen en el resumen</p></div></div>
        <div class="panel__body">
          <form class="form-grid" data-form-region>
            <label class="control"><span>Nueva región</span><input name="nombre" required placeholder="Ej. PIURA" /></label>
            <label class="control"><span>Orden</span><input name="orden" type="number" value="${regiones.length + 1}" /></label>
            <button class="btn btn--primary btn--sm"><i class="ri-add-line"></i> Agregar</button>
          </form>
        </div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Región</th><th>Orden</th><th></th></tr></thead>
          <tbody>${regiones.map((r) => `
            <tr><td><b>${esc(r.nombre)}</b></td>
              <td><input type="number" data-orden="${esc(r.nombre)}" value="${r.orden}" style="max-width:110px" /></td>
              <td><div class="actions"><button class="icon-btn icon-btn--danger" data-quitar-region="${esc(r.nombre)}" title="Eliminar"><i class="ri-delete-bin-line"></i></button></div></td></tr>`).join('')}
          </tbody>
        </table></div>
      </section>
    </div>`;

  const hecho = (msg) => { datos.invalidar(); toast(msg); ctx.refrescar(); };
  const fallo = (err) => toast(err.message, 'bad');

  $$('[data-prellenar]', el).forEach((b) => b.addEventListener('click', () => {
    const input = $('[data-form-agencia] [name="agencia"]', el);
    input.value = b.dataset.prellenar;
    input.focus();
  }));

  $('[data-form-agencia]', el).addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    conBoton(f.querySelector('button'), () =>
      api.guardarAgencia(f.agencia.value, f.region.value).then(() => hecho('Agencia asignada.')).catch(fallo));
  });

  $$('[data-cambiar-region]', el).forEach((s) => s.addEventListener('change', () =>
    api.guardarAgencia(s.dataset.cambiarRegion, s.value).then(() => { datos.invalidar(); toast('Región actualizada.'); }).catch(fallo)));

  $$('[data-quitar-agencia]', el).forEach((b) => b.addEventListener('click', () => {
    if (!confirm(`¿Quitar la agencia ${b.dataset.quitarAgencia}?`)) return;
    api.eliminarAgencia(b.dataset.quitarAgencia).then(() => hecho('Agencia quitada.')).catch(fallo);
  }));

  $('[data-form-region]', el).addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    conBoton(f.querySelector('button'), () =>
      api.guardarRegion({ nombre: f.nombre.value.trim().toUpperCase(), orden: Number(f.orden.value) || 0 })
        .then(() => hecho('Región agregada.')).catch(fallo));
  });

  $$('[data-orden]', el).forEach((i) => i.addEventListener('change', () =>
    api.guardarRegion({ nombre: i.dataset.orden, orden: Number(i.value) || 0 }).then(() => { datos.invalidar(); toast('Orden actualizado.'); }).catch(fallo)));

  $$('[data-quitar-region]', el).forEach((b) => b.addEventListener('click', () => {
    if (!confirm(`¿Eliminar la región ${b.dataset.quitarRegion}? También se quitarán sus agencias y cuotas.`)) return;
    api.eliminarRegion(b.dataset.quitarRegion).then(() => hecho('Región eliminada.')).catch(fallo);
  }));
}
