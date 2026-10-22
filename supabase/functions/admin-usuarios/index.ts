// =====================================================================
//  EDGE FUNCTION: admin-usuarios
//  Permite al ADMINISTRADOR crear usuarios, cambiar contraseñas y
//  eliminarlos desde el dashboard. Usa la llave secreta (service role)
//  que Supabase ya inyecta en el servidor; nunca llega al navegador.
//
//  Cómo publicarla: Supabase → Edge Functions → Deploy a new function
//  → Via Editor → nombre: admin-usuarios → pega este código → Deploy.
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const responder = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1. ¿Quién llama?
    const cliente = createClient(url, anon, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });
    const { data: { user } } = await cliente.auth.getUser();
    if (!user) return responder({ error: 'Sesión no válida' }, 401);

    // 2. ¿Es administrador activo?
    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { data: perfil } = await admin.from('perfiles').select('rol, activo').eq('id', user.id).single();
    if (!perfil || perfil.rol !== 'admin' || !perfil.activo) {
      return responder({ error: 'Solo el administrador puede gestionar usuarios' }, 403);
    }

    const body = await req.json();

    // 3. Acciones
    if (body.accion === 'crear') {
      const { email, password, usuario, nombre, rol, codigo_asesor } = body;
      if (!email || !password || !usuario || !nombre || !rol) return responder({ error: 'Faltan datos' }, 400);
      if (String(password).length < 6) return responder({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400);

      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (error) return responder({ error: error.message }, 400);

      const { error: e2 } = await admin.from('perfiles').insert({
        id: data.user.id, usuario, nombre, rol,
        codigo_asesor: rol === 'supervisor' ? (codigo_asesor || null) : null,
      });
      if (e2) {
        await admin.auth.admin.deleteUser(data.user.id); // no deja usuarios a medias
        return responder({ error: e2.message }, 400);
      }
      return responder({ ok: true, id: data.user.id });
    }

    if (body.accion === 'password') {
      if (!body.id || String(body.password ?? '').length < 6) {
        return responder({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400);
      }
      const { error } = await admin.auth.admin.updateUserById(body.id, { password: body.password });
      if (error) return responder({ error: error.message }, 400);
      return responder({ ok: true });
    }

    if (body.accion === 'eliminar') {
      if (body.id === user.id) return responder({ error: 'No puedes eliminar tu propio usuario' }, 400);
      const { error } = await admin.auth.admin.deleteUser(body.id);
      if (error) return responder({ error: error.message }, 400);
      return responder({ ok: true });
    }

    return responder({ error: 'Acción no válida' }, 400);
  } catch (e) {
    return responder({ error: (e as Error).message }, 500);
  }
});
