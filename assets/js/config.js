/* =========================================================
   CONFIGURACIÓN DE SUPABASE
   Reemplaza estos 2 valores con los de tu proyecto:
   Supabase → Project Settings → API
   - Project URL        -> SUPABASE_URL
   - anon / public key  -> SUPABASE_ANON_KEY
   (La "anon key" es pública por diseño; la seguridad la dan
    las reglas RLS de la base de datos. NUNCA pongas aquí la
    "service_role key".)
   ========================================================= */
export const SUPABASE_URL = 'https://TU-PROYECTO.supabase.co';
export const SUPABASE_ANON_KEY = 'TU-ANON-KEY';

/* Los usuarios ingresan con un nombre corto (ej. "rsonco").
   Internamente Supabase necesita un correo, así que se arma
   como usuario@DOMINIO_USUARIOS. No se envían correos. */
export const DOMINIO_USUARIOS = 'sejpartners.pe';
