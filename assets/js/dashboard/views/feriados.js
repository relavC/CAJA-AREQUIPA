/* =========================================================
   VISTA (ADMIN): FERIADOS (no cuentan como días útiles)
   ========================================================= */
import { $, $$ } from '../../utils/helpers.js';
import { esc, fecha, conBoton, toast, vacio } from '../ui.js';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const diaSemana = (iso) => DIAS[new Date(`${iso}T12:00:00`).getDay()];

export async function render(ctx) {
  const { el, api, datos } = ctx;
  const feriados = await api.obtenerFeriados();
  if (!ctx.vigente()) return;

  el.innerHTML = `
    <section class="panel">
      <div class="panel__head"><div><h2><i class="ri-calendar-event-line"></i> Feriados</h2>
        <p>Los días útiles se cuentan de lunes a sábado sin estos feriados (igual que NETWORKDAYS.INTL del script).</p></div></div>
      <div class="panel__body">
        <form class="form-grid" data-form>
          <label class="control"><span>Fecha</span><input type="date" name="fecha" required /></label>
          <label class="control"><span>Descripción</span><input name="descripcion" placeholder="Ej. Todos los Santos" /></label>
          <button class="btn btn--primary btn--sm"><i class="ri-add-line"></i> Agregar feriado</button>
        </form>
      </div>
      ${feriados.length ? `<div class="table-wrap"><table class="table">
        <thead><tr><th>Fecha</th><th>Día</th><th>Descripción</th><th></th></tr></thead>
        <tbody>${[...feriados].reverse().map((f) => `
          <tr><td><b>${fecha(f.fecha)}</b></td><td style="text-transform:capitalize">${diaSemana(f.fecha)}</td><td>${esc(f.descripcion || '')}</td>
            <td><div class="actions"><button class="icon-btn icon-btn--danger" data-quitar="${f.fecha}" title="Quitar"><i class="ri-delete-bin-line"></i></button></div></td></tr>`).join('')}
        </tbody></table></div>` : vacio('ri-calendar-line', 'No hay feriados registrados')}
    </section>`;

  $('[data-form]', el).addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    conBoton(f.querySelector('button'), () => api.guardarFeriado(f.fecha.value, f.descripcion.value.trim() || null)
      .then(() => { datos.invalidar(); toast('Feriado agregado.'); ctx.refrescar(); })
      .catch((err) => toast(err.message, 'bad')));
  });

  $$('[data-quitar]', el).forEach((b) => b.addEventListener('click', () => {
    if (!confirm(`¿Quitar el feriado del ${fecha(b.dataset.quitar)}?`)) return;
    api.eliminarFeriado(b.dataset.quitar)
      .then(() => { datos.invalidar(); toast('Feriado quitado.'); ctx.refrescar(); })
      .catch((err) => toast(err.message, 'bad'));
  }));
}
