/* =========================================================
   LOGIN — acceso temporal (admin / admin) sin base de datos
   ========================================================= */
import { $ } from '../utils/helpers.js';
import { iniciarSesion, obtenerPerfil } from '../services/auth-local.js';

const form = $('[data-login-form]');
const errorBox = $('[data-login-error]');
const toggle = $('[data-toggle-pass]');
const passInput = $('#loginPass');

const showError = (msg) => {
  errorBox.textContent = msg;
  errorBox.hidden = !msg;
};

// Si ya tiene sesión, entra directo
if (obtenerPerfil()) window.location.replace('dashboard.html');

// Mostrar / ocultar contraseña
toggle?.addEventListener('click', () => {
  const visible = passInput.type === 'text';
  passInput.type = visible ? 'password' : 'text';
  toggle.innerHTML = `<i class="ri-eye${visible ? '' : '-off'}-line"></i>`;
  toggle.setAttribute('aria-label', visible ? 'Mostrar contraseña' : 'Ocultar contraseña');
});

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = form.user.value.trim();
  const password = form.password.value;

  if (!user || !password) {
    showError('Ingresa tu usuario y contraseña.');
    return;
  }
  try {
    iniciarSesion(user, password);
    window.location.href = 'dashboard.html';
  } catch (err) {
    showError(err.message);
  }
});
