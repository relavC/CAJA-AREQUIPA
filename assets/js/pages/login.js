/* =========================================================
   LOGIN
   ⚠️ TEMPORAL: por ahora solo valida que los campos no estén vacíos
   y redirige al dashboard. En el siguiente paso aquí se conecta
   la autenticación real (usuarios, contraseñas y roles en la BD).
   ========================================================= */
import { $ } from '../utils/helpers.js';

const form = $('[data-login-form]');
const errorBox = $('[data-login-error]');
const toggle = $('[data-toggle-pass]');
const passInput = $('#loginPass');

const showError = (msg) => {
  errorBox.textContent = msg;
  errorBox.hidden = !msg;
};

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

  // TODO (paso 2): reemplazar por la llamada real de autenticación, ej.:
  // const { error } = await auth.signIn(user, password);
  // if (error) return showError('Usuario o contraseña incorrectos.');
  window.location.href = 'dashboard.html';
});
