/* =========================================================
   LOGIN — autenticación real con Supabase
   ========================================================= */
import { $ } from '../utils/helpers.js';
import { iniciarSesion, obtenerPerfil } from '../services/auth.js';
import { configurado } from '../services/supabase.js';

const form = $('[data-login-form]');
const errorBox = $('[data-login-error]');
const toggle = $('[data-toggle-pass]');
const passInput = $('#loginPass');
const submitBtn = form?.querySelector('button[type="submit"]');

const showError = (msg) => {
  errorBox.textContent = msg;
  errorBox.hidden = !msg;
};

// Si ya tiene sesión, entra directo
if (configurado) {
  obtenerPerfil().then((perfil) => {
    if (perfil) window.location.replace('dashboard.html');
  });
} else {
  showError('Falta configurar Supabase en assets/js/config.js (ver GUIA-SUPABASE.md).');
}

// Mostrar / ocultar contraseña
toggle?.addEventListener('click', () => {
  const visible = passInput.type === 'text';
  passInput.type = visible ? 'password' : 'text';
  toggle.innerHTML = `<i class="ri-eye${visible ? '' : '-off'}-line"></i>`;
  toggle.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
});

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const user = form.user.value.trim();
  const password = form.password.value;

  if (!user || !password) {
    showError('Ingresa tu usuario y contraseña.');
    return;
  }
  showError('');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="ri-loader-4-line"></i> Ingresando...';

  try {
    await iniciarSesion(user, password);
    window.location.href = 'dashboard.html';
  } catch (err) {
    showError(err.message);
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="ri-login-box-line"></i> Ingresar';
  }
});
