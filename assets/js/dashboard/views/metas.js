/* =========================================================
   VISTA (ADMIN): METAS DEL MES
   - Cuota por región (la del cuadro de avance)
   - Meta por supervisor (para su propio avance)
   ========================================================= */
import { $, $$ } from '../../utils/helpers.js';
import { nombreMes } from '../../core/calculos.js';
import { esc, soles, conBoton, toast } from '../ui.js';

const mesAnterior = (periodo) => {
  const d = new Date(Date.UTC(+periodo.slice(0, 4), +periodo.slice(5, 7) - 2, 1));
  return d.toISOString().slice(0, 10);
};

export async function render(ctx) {
  const { el, estado, api, datos } = ctx;
  const periodo = estado.periodo;
  const mes = `${nombreMes(periodo)} ${periodo.slice(0, 4)}`;

  const [regiones, cuotas, metas, usuarios, { creditos }] = await Promise.all([
    api.obtenerRegiones(), api.obtenerCuotas(periodo), api.obtenerMetas(periodo), api.listarUsuarios(), datos.mes(),
  ]);
  if (!ctx.vigente()) return;

  const cuotaDe = Object.fromEntries(cuotas.map((c) => [c.region, Number(c.cuota)]));

  // Supervisores: los que aparecen en la data + los que tienen meta + los usuarios supervisores
  const sup = {};
  creditos.forEach((c) => {
    if (!c.codigo_asesor) return;
    const k = c.codigo_asesor.toUpperCase();
    sup[k] ??= { codigo: k, nombre: c.coordinador || k };
  });
  usuarios.filter((u) => u.rol === 'supervisor' && u.codigo_asesor).forEach((u) => {
    const k = u.codigo_asesor.toUpperCase();
    sup[k] = { codigo: k, nombre: u.nombre };
  });
  metas.forEach((m) => {
    const k = m.codigo_asesor.toUpperCase();
    sup[k] ??= { codigo: k, nombre: k };
    Object.assign(sup[k], { meta_monto: Number(m.meta_monto), meta_numero: Number(m.meta_numero) });
  });
  const listaSup = Object.values(sup).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const filaSup = (s) => `
    <tr data-codigo="${esc(s.codigo)}">
      <td><b>${esc(s.nombre)}</b><br><small style="color:var(--color-text-muted)">${esc(s.codigo)}</small></td>
      <td><input type="number" min="0" step="1000" data-meta-monto value="${s.meta_monto ?? ''}" placeholder="0" /></td>
      <td><input type="number" min="0" step="1" data-meta-numero value="${s.meta_numero ?? ''}" placeholder="0" /></td>
    </tr>`;

  el.innerHTML = `
    <div class="alert alert--info"><i class="ri-information-line"></i><div>Estás editando las metas de <b>${mes}</b>. Cambia el mes arriba a la derecha para editar otro.</div></div>
    <div class="grid-2">
      <section class="panel">
        <div class="panel__head">
          <div><h2><i class="ri-map-2-line"></i> Cuota por región</h2><p>Total: <b data-total-cuota>${soles(Object.values(cuotaDe).reduce((a, b) => a + b, 0))}</b></p></div>
          <button class="btn btn--ghost btn--sm" data-copiar><i class="ri-file-copy-line"></i> Copiar mes anterior</button>
        </div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Región</th><th>Cuota ${nombreMes(periodo)} (S/)</th></tr></thead>
          <tbody>${regiones.map((r) => `
            <tr><td><b>${esc(r.nombre)}</b></td>
              <td><input type="number" min="0" step="1000" data-cuota="${esc(r.nombre)}" value="${cuotaDe[r.nombre] ?? ''}" placeholder="0" /></td></tr>`).join('')}
          </tbody>
        </table></div>
        <div class="panel__body" style="display:flex;justify-content:flex-end">
          <button class="btn btn--primary btn--sm" data-guardar-cuotas><i class="ri-save-3-line"></i> Guardar cuotas</button>
        </div>
      </section>

      <section class="panel">
        <div class="panel__head">
          <div><h2><i class="ri-user-star-line"></i> Meta por supervisor</h2><p>Por CÓDIGO ASESOR del Excel</p></div>
        </div>
        <div class="table-wrap"><table class="table">
          <thead><tr><th>Supervisor</th><th>Meta monto (S/)</th><th>Meta N° créditos</th></tr></thead>
          <tbody data-tabla-sup>${listaSup.map(filaSup).join('') || '<tr><td colspan="3" style="color:var(--color-text-muted)">Carga el Excel o crea usuarios supervisores para ver la lista.</td></tr>'}</tbody>
        </table></div>
        <div class="panel__body" style="display:grid;gap:1rem">
          <div class="toolbar">
            <label class="control grow"><span>Agregar código</span><input type="text" data-nuevo-codigo placeholder="Ej. SJ_RSONCO" /></label>
            <button class="btn btn--ghost btn--sm" data-agregar><i class="ri-add-line"></i> Agregar</button>
            <button class="btn btn--primary btn--sm" data-guardar-metas><i class="ri-save-3-line"></i> Guardar metas</button>
          </div>
        </div>
      </section>
    </div>`;

  const recalcularTotal = () => {
    const total = $$('[data-cuota]', el).reduce((s, i) => s + (Number(i.value) || 0), 0);
    $('[data-total-cuota]', el).textContent = soles(total);
  };
  $$('[data-cuota]', el).forEach((i) => i.addEventListener('input', recalcularTotal));

  $('[data-copiar]', el).addEventListener('click', async () => {
    const anterior = await api.obtenerCuotas(mesAnterior(periodo));
    if (!anterior.length) return toast('El mes anterior no tiene cuotas registradas.', 'info');
    anterior.forEach((c) => {
      const input = $(`[data-cuota="${CSS.escape(c.region)}"]`, el);
      if (input) input.value = Number(c.cuota);
    });
    recalcularTotal();
    toast('Cuotas copiadas. Revisa y presiona "Guardar cuotas".', 'info');
  });

  $('[data-guardar-cuotas]', el).addEventListener('click', (e) => conBoton(e.currentTarget, async () => {
    const lista = $$('[data-cuota]', el).map((i) => ({ region: i.dataset.cuota, cuota: i.value }));
    try {
      await api.guardarCuotas(periodo, lista);
      datos.invalidar(periodo);
      toast('Cuotas guardadas.');
    } catch (err) { toast(err.message, 'bad'); }
  }));

  $('[data-agregar]', el).addEventListener('click', () => {
    const input = $('[data-nuevo-codigo]', el);
    const codigo = input.value.trim().toUpperCase();
    if (!codigo) return;
    if ($(`[data-codigo="${CSS.escape(codigo)}"]`, el)) return toast('Ese código ya está en la lista.', 'info');
    const tbody = $('[data-tabla-sup]', el);
    if (!tbody.querySelector('[data-codigo]')) tbody.innerHTML = '';
    tbody.insertAdjacentHTML('beforeend', filaSup({ codigo, nombre: codigo }));
    input.value = '';
  });

  $('[data-guardar-metas]', el).addEventListener('click', (e) => conBoton(e.currentTarget, async () => {
    const lista = $$('[data-codigo]', el).map((tr) => ({
      codigo_asesor: tr.dataset.codigo,
      meta_monto: $('[data-meta-monto]', tr).value,
      meta_numero: $('[data-meta-numero]', tr).value,
    })).filter((m) => m.meta_monto !== '' || m.meta_numero !== '');
    try {
      await api.guardarMetas(periodo, lista);
      datos.invalidar(periodo);
      toast(`Metas guardadas (${lista.length}).`);
    } catch (err) { toast(err.message, 'bad'); }
  }));
}
