/* =========================================================
   AUTENTICACIÓN LOCAL (temporal, sin base de datos)
   Usuario: admin  ·  Contraseña: admin
   Cuando se conecte Supabase, volver a usar services/auth.js.
   ========================================================= */
const CLAVE = 'sej_sesion';
const USUARIO = 'admin';
const PASSWORD = 'admin';

const PERFIL = { usuario: 'admin', nombre: 'Administrador', rol: 'admin' };

const leer = () => {
  try { return JSON.parse(sessionStorage.getItem(CLAVE)); } catch { return null; }
};

export function iniciarSesion(usuario, password) {
  if (String(usuario).trim().toLowerCase() !== USUARIO || password !== PASSWORD) {
    throw new Error('Usuario o contraseña incorrectos.');
  }
  try { sessionStorage.setItem(CLAVE, JSON.stringify(PERFIL)); } catch { /* sin storage */ }
  return PERFIL;
}

export function cerrarSesion() {
  try { sessionStorage.removeItem(CLAVE); } catch { /* sin storage */ }
}

export const obtenerPerfil = () => leer();

/** Protege una página: si no hay sesión, manda al login */
export function requerirSesion(rutaLogin = 'login.html') {
  const perfil = leer();
  if (!perfil) window.location.replace(rutaLogin);
  return perfil;
}
