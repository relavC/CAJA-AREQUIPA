/* =========================================================
   API: todas las consultas a la base de datos en un solo lugar
   (La seguridad por rol la aplica Supabase con las reglas RLS)
   ========================================================= */
import { supabase } from './supabase.js';
import { aEmail } from './auth.js';

const ok = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

/* ---------- Créditos ---------- */

/** Todos los créditos visibles del mes (pagina de 1000 en 1000) */
export async function obtenerCreditos(periodo) {
  const filas = [];
  const paso = 1000;
  for (let desde = 0; ; desde += paso) {
    const lote = ok(await supabase.from('creditos').select('*')
      .eq('periodo', periodo).order('id').range(desde, desde + paso - 1));
    filas.push(...lote);
    if (lote.length < paso) break;
  }
  return filas;
}

export async function ultimoPeriodo() {
  return ok(await supabase.rpc('ultimo_periodo'));
}

/** Reemplaza la data del mes con la del Excel (todo o nada) */
export async function cargarCreditos(periodo, archivo, filas) {
  return ok(await supabase.rpc('cargar_creditos', { p_periodo: periodo, p_archivo: archivo, p_filas: filas }));
}

export async function ultimasCargas(limite = 10) {
  return ok(await supabase.from('cargas').select('*').order('creado_en', { ascending: false }).limit(limite));
}

/* ---------- Configuración ---------- */

export async function obtenerRegiones() {
  return ok(await supabase.from('regiones').select('*').order('orden').order('nombre'));
}
export async function guardarRegion(region) {
  return ok(await supabase.from('regiones').upsert(region));
}
export async function eliminarRegion(nombre) {
  return ok(await supabase.from('regiones').delete().eq('nombre', nombre));
}

export async function obtenerAgencias() {
  return ok(await supabase.from('agencia_region').select('*').order('region').order('agencia'));
}
export async function guardarAgencia(agencia, region) {
  return ok(await supabase.from('agencia_region').upsert({ agencia: agencia.trim().toUpperCase(), region }));
}
export async function eliminarAgencia(agencia) {
  return ok(await supabase.from('agencia_region').delete().eq('agencia', agencia));
}

export async function obtenerFeriados() {
  return ok(await supabase.from('feriados').select('*').order('fecha'));
}
export async function guardarFeriado(fecha, descripcion) {
  return ok(await supabase.from('feriados').upsert({ fecha, descripcion }));
}
export async function eliminarFeriado(fecha) {
  return ok(await supabase.from('feriados').delete().eq('fecha', fecha));
}

export async function obtenerCuotas(periodo) {
  return ok(await supabase.from('cuotas').select('*').eq('periodo', periodo));
}
export async function guardarCuotas(periodo, lista) {
  const filas = lista.map(({ region, cuota }) => ({ periodo, region, cuota: Number(cuota) || 0 }));
  return ok(await supabase.from('cuotas').upsert(filas));
}

export async function obtenerMetas(periodo) {
  return ok(await supabase.from('metas_supervisor').select('*').eq('periodo', periodo));
}
export async function guardarMetas(periodo, lista) {
  const filas = lista.map((m) => ({
    periodo,
    codigo_asesor: m.codigo_asesor.trim().toUpperCase(),
    meta_monto: Number(m.meta_monto) || 0,
    meta_numero: Math.round(Number(m.meta_numero) || 0),
  }));
  if (!filas.length) return [];
  return ok(await supabase.from('metas_supervisor').upsert(filas));
}

/** Todo lo necesario para los cálculos de un mes */
export async function obtenerConfig(periodo) {
  const [regiones, agencias, feriados, cuotas, metas] = await Promise.all([
    obtenerRegiones(), obtenerAgencias(), obtenerFeriados(), obtenerCuotas(periodo), obtenerMetas(periodo),
  ]);
  return {
    regiones: regiones.map((r) => r.nombre),
    agenciaRegion: Object.fromEntries(agencias.map((a) => [a.agencia, a.region])),
    feriados: feriados.map((f) => f.fecha),
    cuotas: Object.fromEntries(cuotas.map((c) => [c.region, Number(c.cuota)])),
    metas: Object.fromEntries(metas.map((m) => [m.codigo_asesor.toUpperCase(), m])),
  };
}

/* ---------- Usuarios ---------- */

export async function listarUsuarios() {
  return ok(await supabase.from('perfiles').select('*').order('rol').order('nombre'));
}

export async function actualizarPerfil(id, cambios) {
  return ok(await supabase.from('perfiles').update(cambios).eq('id', id));
}

/** Llama a la Edge Function admin-usuarios */
async function funcionUsuarios(body) {
  const { data, error } = await supabase.functions.invoke('admin-usuarios', { body });
  if (error) {
    let mensaje = error.message;
    try {
      const detalle = await error.context.json();
      if (detalle?.error) mensaje = detalle.error;
    } catch { /* sin detalle */ }
    throw new Error(mensaje);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export const crearUsuario = ({ usuario, password, nombre, rol, codigo_asesor }) =>
  funcionUsuarios({
    accion: 'crear',
    email: aEmail(usuario),
    usuario: usuario.trim().toLowerCase(),
    password, nombre, rol,
    codigo_asesor: codigo_asesor ? codigo_asesor.trim().toUpperCase() : null,
  });

export const cambiarPassword = (id, password) => funcionUsuarios({ accion: 'password', id, password });
export const eliminarUsuario = (id) => funcionUsuarios({ accion: 'eliminar', id });
