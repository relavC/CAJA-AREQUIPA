# NovaCaja — Web + CRM / Dashboard

Landing page estilo entidad financiera (menú, slider, accesos rápidos, productos, simulador, app, noticias, footer) con acceso al Dashboard.

## Cómo ejecutarlo en VS Code

1. Abre la carpeta `crm-web` en VS Code.
2. Instala la extensión **Live Server** (Ritwick Dey).
3. Clic derecho en `index.html` → **Open with Live Server**.

> El JavaScript usa módulos ES (`import/export`), por eso **debe abrirse con un servidor** (Live Server).
> Si abres el HTML con doble clic (`file://`), el navegador bloquea los módulos.

## Estructura

```
crm-web/
├── index.html                 # Página principal (landing)
├── pages/
│   └── dashboard.html         # Dashboard / CRM (siguiente fase)
└── assets/
    ├── css/
    │   ├── main.css           # Importa todos los parciales
    │   ├── base/              # variables (colores, fuentes), reset, utilidades
    │   ├── layout/            # header, footer
    │   ├── components/        # botones, slider, tarjetas, tabs, formularios
    │   └── pages/             # estilos por página (home, dashboard)
    └── js/
        ├── main.js            # Inicializa todos los módulos
        ├── utils/helpers.js   # Funciones reutilizables
        ├── data/products.js   # Datos de productos (luego → API)
        └── modules/           # header, slider, tabs, simulator, counters, reveal, ui
```

## Cómo escalar

- **Cambiar colores/marca:** edita `assets/css/base/variables.css`.
- **Nuevo componente:** crea `components/mi-componente.css` e impórtalo en `main.css`; crea `modules/mi-modulo.js` y agrégalo al arreglo de `main.js`.
- **Nueva página:** crea `pages/nueva.html` (con rutas `../assets/...`) y su CSS en `css/pages/`.
- **Productos:** edita `js/data/products.js`; luego reemplázalo por un `fetch()` a tu backend.
- **Backend futuro:** Node/Express, PHP, Python o .NET sin cambiar la estructura del front.
