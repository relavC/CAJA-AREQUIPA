# Guía: conectar el dashboard a Supabase

Tiempo aproximado: 20–30 minutos. Solo se hace una vez.

---

## 1. Crear el proyecto

1. Entra a <https://supabase.com> y crea una cuenta (puedes usar tu Google).
2. **New project**:
   - Nombre: `sej-dashboard`
   - Database password: inventa una y **guárdala**.
   - Region: **South America (São Paulo)** (la más cercana a Perú).
3. Espera 1–2 minutos a que termine de crearse.

## 2. Crear las tablas y la seguridad

1. Menú izquierdo → **SQL Editor** → **New query**.
2. Abre el archivo `supabase/schema.sql`, copia **todo** y pégalo.
3. Presiona **Run**. Debe decir *Success*.

Esto crea las tablas (créditos, metas, agencias, regiones, feriados, usuarios), las reglas de seguridad por rol y carga las agencias, regiones, cuotas de octubre y el feriado de tu script.

## 3. Cerrar el registro público

Solo tú (admin) creas usuarios:

1. **Authentication** → **Sign In / Providers** (o *Providers → Email*).
2. Desactiva **Allow new users to sign up** → **Save**.

## 4. Crear tu usuario administrador

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Email: `admin@sejpartners.pe` · Password: la que quieras · marca **Auto Confirm User** → **Create user**.
3. Vuelve al **SQL Editor**, pega y ejecuta (cambia el nombre si quieres):

```sql
insert into public.perfiles (id, usuario, nombre, rol)
select id, 'admin', 'Luis Valer', 'admin'
from auth.users where email = 'admin@sejpartners.pe';
```

Ya podrás ingresar con usuario **admin** y tu contraseña.

> Los usuarios entran con un nombre corto (ej. `rsonco`). Por dentro Supabase lo guarda como `rsonco@sejpartners.pe`; no se envía ningún correo. El dominio se cambia en `assets/js/config.js` (`DOMINIO_USUARIOS`).

## 5. Publicar la función para crear usuarios

Crear usuarios con contraseña necesita una llave secreta que **no** puede estar en la página. Por eso va en una *Edge Function* dentro de Supabase:

1. **Edge Functions** → **Deploy a new function** → **Via Editor**.
2. Nombre: `admin-usuarios` (exactamente así).
3. Borra el código de ejemplo, pega todo el contenido de `supabase/functions/admin-usuarios/index.ts` y presiona **Deploy function**.

## 6. Conectar la página

1. **Project Settings** → **API** (o **API Keys**).
2. Copia la **Project URL** y la **anon public key** (o *publishable key*).
3. Pégalas en `assets/js/config.js`:

```js
export const SUPABASE_URL = 'https://abcdxyz.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

> ⚠️ Nunca pongas la **service_role / secret key** en la página.

## 7. Probar

1. En VS Code: clic derecho en `index.html` → **Open with Live Server**.
2. **Ingresar al Dashboard** → usuario `admin` + tu contraseña.
3. Menú **Cargar Excel** → sube tu `AVANCE.xlsx` → **Cargar a la base de datos**.
4. **Usuarios** → crea al jefe y a los supervisores (al supervisor asígnale su **CÓDIGO ASESOR** del Excel, ej. `SJ_RSONCO`).
5. **Metas del mes** → revisa las cuotas por región y pon la meta de cada supervisor.

## 8. Uso diario

- Entra como admin → **Cargar Excel** → sube el archivo del día. Se **reemplaza** la data del mes (no se duplica).
- Si el Excel trae valores en **META MONTO / META NUMERO**, se guardan solos como meta del supervisor. Si no, ponlas en **Metas del mes**.
- Si aparece una agencia nueva sin región, asígnala en **Agencias y regiones**.

## 9. Publicar en internet (gratis)

1. Entra a <https://app.netlify.com/drop>.
2. Arrastra la carpeta `crm-web` completa.
3. Netlify te da un link (ej. `https://sej-portal.netlify.app`) para compartir con el equipo.
4. Para actualizar, vuelve a arrastrar la carpeta en tu sitio de Netlify (*Deploys*).

---

### ¿Quién ve qué?

| Rol | Ve | Puede |
|---|---|---|
| **Administrador** | Todo | Cargar Excel, metas, agencias, feriados, usuarios |
| **Jefe** | Todos los créditos y el avance de cada supervisor | Consultar y descargar reportes |
| **Supervisor** | Solo los créditos con su CÓDIGO ASESOR | Consultar y descargar su reporte |

La restricción la aplica la base de datos (reglas RLS), no la página: aunque alguien manipule el navegador, un supervisor no puede leer créditos de otro.

### Problemas comunes

- **"Usuario o contraseña incorrectos"**: revisa que el usuario exista en Authentication → Users y que tenga fila en `perfiles`.
- **"Tu usuario no tiene un perfil asignado"**: falta el paso 4.3 (insert en perfiles) o el usuario está desactivado.
- **Error al crear usuarios**: verifica que la Edge Function se llame exactamente `admin-usuarios`.
- **El proyecto se "pausó"**: en el plan gratis Supabase pausa proyectos sin uso por 7 días; entra al panel y presiona *Restore*.
