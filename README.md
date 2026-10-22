# SEJ Partners — Portal interno + Dashboard de créditos

Portal interno (landing) para supervisores y jefatura, con login y dashboard conectado a **Supabase**.

## Primeros pasos

1. Sigue **GUIA-SUPABASE.md** (crear proyecto, tablas, usuario admin, función de usuarios).
2. Coloca tu URL y anon key en `assets/js/config.js`.
3. En VS Code: clic derecho en `index.html` → **Open with Live Server** (los módulos JS necesitan un servidor).

## Estructura

```
crm-web/
├── index.html                    # Portal (landing)
├── pages/
│   ├── login.html                # Inicio de sesión
│   └── dashboard.html            # Dashboard (menú según rol)
├── supabase/
│   ├── schema.sql                # Tablas, seguridad por rol (RLS), carga del Excel, datos iniciales
│   └── functions/admin-usuarios/ # Edge Function: crear/editar/eliminar usuarios
├── GUIA-SUPABASE.md
└── assets/
    ├── img/                      # Logos
    ├── css/                      # base/, layout/, components/, pages/ (main.css los importa)
    └── js/
        ├── config.js             # URL y llave de Supabase
        ├── main.js               # Módulos del portal
        ├── services/             # supabase.js, auth.js, api.js (todas las consultas)
        ├── core/                 # excel.js (lee hoja SEJ / descarga reporte), calculos.js (Resumen 1 y 2)
        ├── dashboard/            # app.js (rutas y menú), ui.js, views/ (una pantalla por archivo)
        ├── pages/login.js
        ├── modules/              # header, slider, tabs, simulador... (portal)
        ├── data/products.js      # Productos Caja Arequipa
        └── utils/helpers.js
```

## Pantallas del dashboard

| Pantalla | Roles | Qué hace |
|---|---|---|
| Resumen | Todos | Admin/Jefe: avance por región (Resumen 2), por supervisor y por región/agencia (Resumen 1). Supervisor: su avance vs meta. Descarga Excel. |
| Detalle de créditos | Todos | Tabla con búsqueda y filtros; exporta a Excel. |
| Cargar Excel | Admin | Lee la hoja SEJ y reemplaza la data del mes. |
| Metas del mes | Admin | Cuota por región y meta por supervisor. |
| Agencias y regiones | Admin | Agencia → región del cuadro y orden de regiones. |
| Feriados | Admin | Días que no cuentan como útiles. |
| Usuarios | Admin | Crear usuarios, rol, código asesor, contraseña. |

## Agregar una pantalla nueva (ej. gráficos)

1. Crea `assets/js/dashboard/views/graficos.js` con `export async function render(ctx) { ... }`.
2. Impórtala en `assets/js/dashboard/app.js` y agrégala a `RUTAS` con los roles que pueden verla.
3. Usa `await ctx.datos.mes()` para obtener `{ creditos, config }` del mes elegido.
