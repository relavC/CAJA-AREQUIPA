/* =========================================================
   VISTA: Registros de prospecciones (CRUD)
   Tabla con búsqueda y filtros; acciones a la derecha:
   editar y eliminar. Botón para crear un registro nuevo.
   ========================================================= */
import { $, $$ } from '../../utils/helpers.js';
import { esc, toast, vacio } from '../ui.js';
import { SUPERVISORES, AGENCIAS } from '../../data/prospecciones.js';
import * as store from '../../services/prospecciones.js';

const POR_PAGINA = 15;

const opciones = (lista, sel = '') =>
  lista.map((v) => `<option value="${esc(v)}"${v === sel ? ' selected' : ''}>${esc(v)}</option>`).join('');

export function render(el) {
  const f = { texto: '', supervisor: '', agencia: '', pagina: 1 };

  el.innerHTML = `
    <section class="panel">
      <div class="panel__head">
        <div>
          <h2><i class="ri-file-list-3-line"></i> Registros de prospecciones</h2>
          <p>Por ahora se guardan en este navegador, hasta conectar la base de datos.</p>
        </div>
        <div class="head-actions">
          <button class="btn btn--ghost btn--sm" data-csv><i class="ri-download-2-line"></i> Descargar CSV</button>
          <button class="btn btn--primary btn--sm" data-nuevo><i class="ri-add-line"></i> Nuevo registro</button>
        </div>
      </div>
      <div class="panel__body">
        <div class="toolbar">
          <label class="control grow"><span>Buscar</span>
            <input type="search" data-f="texto" placeholder="DNI, analista, comentario..." /></label>
          <label class="control"><span>Supervisor</span>
            <select data-f="supervisor"><option value="">Todos</option>${opciones(SUPERVISORES)}</select></label>
          <label class="control"><span>Agencia</span>
            <select data-f="agencia"><option value="">Todas</option>${opciones(AGENCIAS)}</select></label>
        </div>
      </div>
      <div class="panel__body panel__body--flush" data-tabla></div>
    </section>

    <dialog class="modal" data-modal-form>
      <form class="modal__box" method="dialog" novalidate data-form>
        <header class="modal__head">
          <h3 data-form-titulo>Editar registro</h3>
          <button type="button" class="icon-btn" data-cerrar aria-label="Cerrar"><i class="ri-close-line"></i></button>
        </header>
        <div class="modal__body">
          <p class="modal__meta" data-form-meta></p>
          <div class="form-grid form-grid--2">
            <label class="control"><span>Supervisor de venta (SDV) *</span>
              <select name="supervisor" required><option value="">Selecciona</option>${opciones(SUPERVISORES)}</select></label>
            <label class="control"><span>DNI_Asesor *</span>
              <input name="dni_asesor" required inputmode="numeric" pattern="\\d{8}" maxlength="8" autocomplete="off" placeholder="8 dígitos" /></label>
            <label class="control"><span>Agencia *</span>
              <select name="agencia" required><option value="">Selecciona</option>${opciones(AGENCIAS)}</select></label>
            <label class="control"><span>Analista asignado *</span>
              <input name="analista" required maxlength="120" /></label>
          </div>
          <label class="control"><span>Comentario *</span>
            <textarea name="comentario" rows="4" required maxlength="1000"></textarea></label>
          <p class="alert alert--bad" data-form-error hidden></p>
        </div>
        <footer class="modal__foot">
          <button type="button" class="btn btn--ghost btn--sm" data-cerrar>Cancelar</button>
          <button type="submit" class="btn btn--primary btn--sm"><i class="ri-save-3-line"></i> Guardar</button>
        </footer>
      </form>
    </dialog>

    <dialog class="modal modal--sm" data-modal-borrar>
      <div class="modal__box">
        <header class="modal__head">
          <h3><i class="ri-delete-bin-line"></i> Eliminar registro</h3>
          <button type="button" class="icon-btn" data-cerrar aria-label="Cerrar"><i class="ri-close-line"></i></button>
        </header>
        <div class="modal__body" data-borrar-texto></div>
        <footer class="modal__foot">
          <button type="button" class="btn btn--ghost btn--sm" data-cerrar>Cancelar</button>
          <button type="button" class="btn btn--danger btn--sm" data-confirmar-borrar><i class="ri-delete-bin-line"></i> Eliminar</button>
        </footer>
      </div>
    </dialog>`;

  const tabla = $('[data-tabla]', el);
  const dlgForm = $('[data-modal-form]', el);
  const dlgBorrar = $('[data-modal-borrar]', el);
  const form = $('[data-form]', el);
  const formError = $('[data-form-error]', el);
  let editandoId = null;
  let borrandoId = null;

  /* ---------- Tabla ---------- */
  function filtrar() {
    const t = f.texto.toLowerCase();
    return store.listar().filter((r) =>
      (!f.supervisor || r.supervisor === f.supervisor) &&
      (!f.agencia || r.agencia === f.agencia) &&
      (!t || [r.fecha_hora, r.supervisor, r.dni_asesor, r.agencia, r.analista, r.comentario]
        .some((v) => String(v).toLowerCase().includes(t))));
  }

  function pintar() {
    const todos = store.listar().length;
    const lista = filtrar();
    if (!lista.length) {
      tabla.innerHTML = todos
        ? vacio('ri-search-line', 'Sin resultados', 'Ningún registro coincide con los filtros.')
        : vacio('ri-inbox-line', 'Aún no hay registros', 'Los registros del formulario de Herramientas aparecerán aquí.');
      return;
    }
    const paginas = Math.ceil(lista.length / POR_PAGINA);
    f.pagina = Math.min(f.pagina, paginas);
    const desde = (f.pagina - 1) * POR_PAGINA;
    const pagina = lista.slice(desde, desde + POR_PAGINA);

    tabla.innerHTML = `
      <div class="table-wrap">
        <table class="table table--registros">
          <thead><tr>
            <th>Fecha y hora</th><th>Supervisor</th><th>DNI_Asesor</th><th>Agencia</th>
            <th>Analista</th><th>Comentario</th><th class="actions-col">Acciones</th>
          </tr></thead>
          <tbody>
            ${pagina.map((r) => `
              <tr>
                <td class="nowrap">${esc(r.fecha_hora)}${r.editado_en ? `<small class="muted-line" title="Editado el ${esc(r.editado_en)}"><i class="ri-edit-line"></i> editado</small>` : ''}</td>
                <td>${esc(r.supervisor)}</td>
                <td class="nowrap">${esc(r.dni_asesor)}</td>
                <td>${esc(r.agencia)}</td>
                <td>${esc(r.analista)}</td>
                <td class="cell-comment">${esc(r.comentario)}</td>
                <td class="actions-col">
                  <div class="actions">
                    <button class="btn btn--ghost btn--xs" data-editar="${esc(r.id)}"><i class="ri-pencil-line"></i> Editar</button>
                    <button class="btn btn--danger btn--xs" data-borrar="${esc(r.id)}"><i class="ri-delete-bin-line"></i> Eliminar</button>
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="pager">
        <span>${desde + 1}–${desde + pagina.length} de ${lista.length} registros${lista.length !== todos ? ` (filtrados de ${todos})` : ''}</span>
        <div>
          <button class="btn btn--ghost btn--sm" data-pag="-1" ${f.pagina === 1 ? 'disabled' : ''}><i class="ri-arrow-left-s-line"></i></button>
          <button class="btn btn--ghost btn--sm" data-pag="1" ${f.pagina === paginas ? 'disabled' : ''}><i class="ri-arrow-right-s-line"></i></button>
        </div>
      </div>`;
  }

  /* ---------- Filtros ---------- */
  $$('[data-f]', el).forEach((c) => c.addEventListener('input', () => {
    f[c.dataset.f] = c.value;
    f.pagina = 1;
    pintar();
  }));

  tabla.addEventListener('click', (e) => {
    const pag = e.target.closest('[data-pag]');
    if (pag) { f.pagina += Number(pag.dataset.pag); pintar(); return; }
    const ed = e.target.closest('[data-editar]');
    if (ed) return abrirForm(ed.dataset.editar);
    const br = e.target.closest('[data-borrar]');
    if (br) return abrirBorrar(br.dataset.borrar);
  });

  /* ---------- Crear / editar ---------- */
  function abrirForm(id = null) {
    editandoId = id;
    form.reset();
    formError.hidden = true;
    $$('.is-invalid', form).forEach((x) => x.classList.remove('is-invalid'));
    const r = id ? store.obtener(id) : null;
    if (id && !r) { toast('El registro ya no existe.', 'bad'); pintar(); return; }
    $('[data-form-titulo]', el).textContent = r ? 'Editar registro' : 'Nuevo registro';
    $('[data-form-meta]', el).innerHTML = r
      ? `<i class="ri-time-line"></i> Registrado el <b>${esc(r.fecha_hora)}</b>${r.editado_en ? ` · editado el ${esc(r.editado_en)}` : ''}`
      : '<i class="ri-time-line"></i> La fecha y hora se guardarán al momento de guardar.';
    if (r) ['supervisor', 'dni_asesor', 'agencia', 'analista', 'comentario'].forEach((k) => { form[k].value = r[k] ?? ''; });
    dlgForm.showModal();
    form.supervisor.focus();
  }

  form.dni_asesor.addEventListener('input', () => {
    const v = form.dni_asesor.value.replace(/\D/g, '').slice(0, 8);
    if (v !== form.dni_asesor.value) form.dni_asesor.value = v;
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    $$('.is-invalid', form).forEach((x) => x.classList.remove('is-invalid'));
    ['analista', 'comentario'].forEach((n) => { form[n].value = form[n].value.trim(); });
    const malo = [...form.elements].find((x) => x.name && !x.checkValidity());
    if (malo) {
      malo.classList.add('is-invalid');
      malo.focus();
      formError.textContent = malo.name === 'dni_asesor' ? 'El DNI_Asesor debe tener 8 números.' : 'Completa todos los campos obligatorios.';
      formError.hidden = false;
      return;
    }
    try {
      const datos = Object.fromEntries(new FormData(form));
      if (editandoId) store.actualizar(editandoId, datos);
      else store.crear(datos);
      dlgForm.close();
      toast(editandoId ? 'Registro actualizado.' : 'Registro creado.');
      pintar();
    } catch (err) {
      formError.textContent = err.message;
      formError.hidden = false;
    }
  });

  /* ---------- Eliminar ---------- */
  function abrirBorrar(id) {
    const r = store.obtener(id);
    if (!r) { toast('El registro ya no existe.', 'bad'); pintar(); return; }
    borrandoId = id;
    $('[data-borrar-texto]', el).innerHTML = `
      <p>¿Seguro que deseas eliminar este registro? Esta acción no se puede deshacer.</p>
      <ul class="modal__resumen">
        <li><span>Fecha</span><b>${esc(r.fecha_hora)}</b></li>
        <li><span>Supervisor</span><b>${esc(r.supervisor)}</b></li>
        <li><span>DNI_Asesor</span><b>${esc(r.dni_asesor)}</b></li>
        <li><span>Agencia</span><b>${esc(r.agencia)}</b></li>
      </ul>`;
    dlgBorrar.showModal();
  }

  $('[data-confirmar-borrar]', el).addEventListener('click', () => {
    try {
      store.eliminar(borrandoId);
      dlgBorrar.close();
      toast('Registro eliminado.');
      pintar();
    } catch (err) {
      toast(err.message, 'bad');
    }
  });

  /* ---------- Cerrar modales ---------- */
  $$('[data-cerrar]', el).forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
  [dlgForm, dlgBorrar].forEach((d) => d.addEventListener('click', (e) => { if (e.target === d) d.close(); }));

  /* ---------- Botones superiores ---------- */
  $('[data-nuevo]', el).addEventListener('click', () => abrirForm());
  $('[data-csv]', el).addEventListener('click', () => {
    const lista = filtrar();
    if (!lista.length) return toast('No hay registros para descargar.', 'bad');
    store.descargarCSV(lista);
  });

  pintar();
}
