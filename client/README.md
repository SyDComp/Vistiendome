# Vistiendome — cliente

Sitio público (portada, catálogo, fichas, carrito, cotización) y panel de
administración, en una sola aplicación.

## Tecnología

React 19, Vite, React Router 7, CSS propio (sin framework) e íconos de
Lucide. Pruebas con Vitest.

## Estructura

| Carpeta | Contenido |
|---|---|
| `src/features/` | Módulos completos del sitio público: catálogo y ficha de producto |
| `src/components/interface/` | Pantallas, agrupadas por área (`admin/`, `vistas/`, `cart/`, `catalogo/`…) |
| `src/components/ui/`, `shared/`, `layout/` | Piezas reutilizables y estructura común |
| `src/context/` | Estado global: carrito, ajustes del sitio, notificaciones y conexión en tiempo real |
| `src/lib/api/` | Toda la comunicación con el servidor |
| `src/hooks/`, `src/utils/`, `src/constants/` | Lógica reutilizable sin interfaz |
| `src/styles/` | Estilos base y variables de diseño |

La ficha de producto se abre como ventana sobre la página de origen, sin
perderla de fondo: la ruta guarda la página anterior en
`location.state.backgroundLocation` (ver `src/App.jsx`). Los enlaces a fichas
deben conservar ese estado.

## Comandos

```bash
yarn install
yarn dev        # desarrollo, con recarga en caliente
yarn build      # compila a dist/
yarn preview    # sirve la compilación, contra el servidor local
yarn test       # pruebas
yarn lint
```

En desarrollo, `/api`, `/ws` y `/media` se reenvían al servidor en
`http://127.0.0.1:8000`, o al indicado en `VITE_API_BASE`.
