/* =========================================================
   DOCUMENTO DEL CLIENTE: DNI, RUC o Carnet de extranjería
   Reglas de cada tipo y ayuda para conectar el desplegable
   con la caja de texto en cualquier formulario.
   ========================================================= */
export const TIPOS_DOC = {
  DNI: {
    nombre: 'DNI',
    largo: 8,
    patron: '\\d{8}',
    soloNumeros: true,
    placeholder: '8 dígitos',
    error: 'El DNI del cliente debe tener 8 números.',
  },
  RUC: {
    nombre: 'RUC',
    largo: 11,
    patron: '\\d{11}',
    soloNumeros: true,
    placeholder: '11 dígitos',
    error: 'El RUC del cliente debe tener 11 números.',
  },
  CE: {
    nombre: 'Carnet de extranjería',
    largo: 12,
    patron: '[A-Z0-9]{9,12}',
    soloNumeros: false,
    placeholder: '9 a 12 caracteres (letras y números)',
    error: 'El carnet de extranjería debe tener entre 9 y 12 caracteres (letras y números).',
  },
};

export const opcionesTipoDoc = (seleccionado = 'DNI') =>
  Object.entries(TIPOS_DOC)
    .map(([k, t]) => `<option value="${k}"${k === seleccionado ? ' selected' : ''}>${t.nombre}</option>`)
    .join('');

/** Ajusta la caja de texto según el tipo elegido (patrón, largo, teclado) */
export function aplicarTipoDoc(select, input) {
  const t = TIPOS_DOC[select.value] || TIPOS_DOC.DNI;
  input.pattern = t.patron;
  input.maxLength = t.largo;
  input.inputMode = t.soloNumeros ? 'numeric' : 'text';
  input.placeholder = t.placeholder;
  input.value = limpiarDoc(input.value, select.value);
}

/** Quita caracteres no permitidos para el tipo de documento */
export function limpiarDoc(valor, tipo) {
  const t = TIPOS_DOC[tipo] || TIPOS_DOC.DNI;
  const v = String(valor ?? '').toUpperCase();
  return (t.soloNumeros ? v.replace(/\D/g, '') : v.replace(/[^A-Z0-9]/g, '')).slice(0, t.largo);
}

/** Conecta desplegable + caja: valida al escribir y al cambiar de tipo */
export function conectarDocumento(select, input) {
  aplicarTipoDoc(select, input);
  select.addEventListener('change', () => aplicarTipoDoc(select, input));
  input.addEventListener('input', () => {
    const v = limpiarDoc(input.value, select.value);
    if (v !== input.value) input.value = v;
  });
}

export const errorDoc = (tipo) => (TIPOS_DOC[tipo] || TIPOS_DOC.DNI).error;
