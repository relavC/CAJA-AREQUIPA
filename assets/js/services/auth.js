/* =========================================================
   AUTENTICACIÓN: login, logout y perfil del usuario
   ========================================================= */
import { supabase, configurado } from './supabase.js';
import { DOMINIO_USUARIOS } from '../config.js';

/** "rsonco" -> "rsonco@sejpartners.pe" (si ya es correo, lo deja igual) */
export const aEmail = (usuario) => {
  const u = String(usuario).trim().toLowerCase();
  return u.includes('@') ? u : `${u}@${DOMINIO_USUARIOS}`;
};

export async function iniciarSesion(usuario, password) {
  if (!configurado) throw new Error('Falta configurar Supabase en assets/js/config.js');
  const { error } = await supabase.auth.signInWithPassword({ email: aEmail(usuario), password });
  if (error) throw new Error('Usuario o contraseña incorrectos.');

  const perfil = await obtenerPerfil();
  if (!perfil) {
    await supabase.auth.signOut();
    throw new Error('Tu usuario no tiene un perfil asignado o está desactivado. Contacta al administrador.');
  }
  return perfil;
}

export async function cerrarSesion() {
  await supabase.auth.signOut();
}

/** Perfil del usuario conectado ({ id, usuario, nombre, rol, codigo_asesor }) o null */
export async function obtenerPerfil() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data, error } = await supabase
    .from('perfiles')
    .select('id, usuario, nombre, rol, codigo_asesor, activo')
    .eq('id', session.user.id)
    .maybeSingle();
  if (error || !data || !data.activo) return null;
  return data;
}

/** Protege una página: si no hay sesión válida, manda al login */
export async function requerirSesion(rutaLogin = 'login.html') {
  if (!configurado) return null;
  const perfil = await obtenerPerfil();
  if (!perfil) {
    window.location.replace(rutaLogin);
    return null;
  }
  return perfil;
}
