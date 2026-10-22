/* =========================================================
   VISTA (ADMIN): USUARIOS
   Crear usuarios con contraseña, asignar rol y código de asesor,
   activar/desactivar, cambiar contraseña y eliminar.
   ========================================================= */
import { $, $$ } from '../../utils/helpers.js';
import { esc, conBoton, toast } from '../ui.js';

const ROLES = { admin: 'Administrador', jefe: 'Jefe', supervisor: 'Supervisor' };

export async function render(ctx) {
  const { el, estado, api, datos } = ctx;
  const [usuarios, { creditos }] = await Promise.all([api.listarUsuarios(), datos.mes()]);
  if (!ctx.vigente()) return;

  // Códigos de asesor que aparecen en la data (para sugerirlos)
  const codigos = {};
  creditos.forEach((c) => { if (c.codigo_asesor) codigos[c.codigo_asesor] = c.coordinador || ''; });
  const asignados = new Set(usuarios.map((u) => (u.codigo_asesor || '').toUpperCase()));
  const libres = Object.entries(codigos).filter(([k]) => !asignados.has(k)).sort((a, b) => a[1].localeCompare(b[1]));

  const opcionesRol = (actual) => Object.entries(ROLES)
    .map(([k, v]) => `<option value="${k}" ${k === actual ? 'selected' : ''}>${v}</option>`).join('');

  el.innerHTML = `
    <section class="panel">
      <div class="panel__head"><div><h2><i class="ri-user-add-line"></i> Nuevo usuario</h2>
        <p>El supervisor solo verá los créditos de su <b>CÓDIGO ASESOR</b>. El jefe y el administrador ven todo.</p></div></div>
      <div class="panel__body">
        <form class="form-grid" data-form autocomplete="off">
          <label class="control"><span>Nombre completo</span><input name="nombre" required placeholder="Ej. Roxana Sonco" /></label>
          <label class="control"><span>Usuario</span><input name="usuario" required pattern="[A-Za-z0-9._\\-]+" placeholder="Ej. rsonco" title="Solo letras, números, punto, guion" /></label>
          <label class="control"><span>Contraseña</span><input name="password" type="text" required minlength="6" placeholder="Mínimo 6 caracteres" /></label>
          <label class="control"><span>Rol</span><select name="rol">${opcionesRol('supervisor')}</select></label>
          <label class="control" data-campo-codigo><span>Código asesor</span>
            <input name="codigo_asesor" list="codigos-libres" placeholder="Ej. SJ_RSONCO" /></label>
          <datalist id="codigos-libres">${libres.map(([k, n]) => `<option value="${esc(k)}">${esc(n)}</option>`).join('')}</datalist>
          <button class="btn btn--primary btn--sm"><i class="ri-user-add-line"></i> Crear usuario</button>
        </form>
      </div>
    </section>

    <section class="panel">
      <div class="panel__head"><div><h2><i class="ri-team-line"></i> Usuarios</h2><p>${usuarios.length} registrados</p></div></div>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Código asesor</th><th class="center">Activo</th><th></th></tr></thead>
        <tbody>${usuarios.map((u) => {
          const yo = u.id === estado.perfil.id;
          return `
          <tr data-id="${u.id}">
            <td><b>${esc(u.nombre)}</b>${yo ? ' <span class="tag tag--info">Tú</span>' : ''}</td>
            <td>${esc(u.usuario)}</td>
            <td><select data-campo="rol" ${yo ? 'disabled' : ''}>${opcionesRol(u.rol)}</select></td>
            <td><input data-campo="codigo_asesor" value="${esc(u.codigo_asesor || '')}" list="codigos-libres" ${u.rol !== 'supervisor' ? 'disabled' : ''} placeholder="—" /></td>
            <td class="center"><input type="checkbox" data-campo="activo" ${u.activo ? 'checked' : ''} ${yo ? 'disabled' : ''} style="width:auto;min-width:0" /></td>
            <td><div class="actions">
              <button class="icon-btn" data-password title="Cambiar contraseña"><i class="ri-key-2-line"></i></button>
              ${yo ? '' : '<button class="icon-btn icon-btn--danger" data-eliminar title="Eliminar"><i class="ri-delete-bin-line"></i></button>'}
            </div></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </section>`;

  const form = $('[data-form]', el);
  const campoCodigo = $('[data-campo-codigo]', el);
  const toggleCodigo = () => {
    const esSup = form.rol.value === 'supervisor';
    campoCodigo.style.display = esSup ? '' : 'none';
    form.codigo_asesor.required = esSup;
  };
  form.rol.addEventListener('change', toggleCodigo);
  toggleCodigo();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    conBoton(form.querySelector('button'), async () => {
      try {
        await api.crearUsuario({
          nombre: form.nombre.value.trim(),
          usuario: form.usuario.value.trim(),
          password: form.password.value,
          rol: form.rol.value,
          codigo_asesor: form.rol.value === 'supervisor' ? form.codigo_asesor.value : null,
        });
        toast(`Usuario "${form.usuario.value.trim().toLowerCase()}" creado.`);
        ctx.refrescar();
      } catch (err) { toast(err.message, 'bad'); }
    });
  });

  $$('tr[data-id]', el).forEach((tr) => {
    const id = tr.dataset.id;
    const nombre = $('b', tr).textContent;

    $$('[data-campo]', tr).forEach((input) => input.addEventListener('change', async () => {
      const campo = input.dataset.campo;
      const valor = campo === 'activo' ? input.checked
        : campo === 'codigo_asesor' ? (input.value.trim().toUpperCase() || null) : input.value;
      const cambios = { [campo]: valor };
      if (campo === 'rol' && valor !== 'supervisor') cambios.codigo_asesor = null;
      try {
        await api.actualizarPerfil(id, cambios);
        toast('Usuario actualizado.');
        if (campo === 'rol') ctx.refrescar();
      } catch (err) { toast(err.message, 'bad'); }
    }));

    $('[data-password]', tr).addEventListener('click', async () => {
      const nueva = prompt(`Nueva contraseña para ${nombre} (mínimo 6 caracteres):`);
      if (!nueva) return;
      try {
        await api.cambiarPassword(id, nueva);
        toast('Contraseña actualizada.');
      } catch (err) { toast(err.message, 'bad'); }
    });

    $('[data-eliminar]', tr)?.addEventListener('click', async () => {
      if (!confirm(`¿Eliminar al usuario ${nombre}? Esta acción no se puede deshacer.`)) return;
      try {
        await api.eliminarUsuario(id);
        toast('Usuario eliminado.');
        ctx.refrescar();
      } catch (err) { toast(err.message, 'bad'); }
    });
  });
}
