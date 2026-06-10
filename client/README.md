# Vistiendome - Frontend (Cliente)

Plataforma frontend para el e-commerce "Vistiendome". Este proyecto está construido para ofrecer una experiencia de usuario fluida, elegante y orientada a la venta de colecciones de moda.

## 🚀 Tecnologías Principales
- **Framework:** React 19 + Vite
- **Enrutamiento:** React Router v7
- **Estilos:** CSS puro (organizado en `src/styles/`)
- **Gestión de Estado:** React Context API
- **Iconografía:** Lucide React

## 🧠 Estructura y Patrones Clave (Para Humanos y Agentes)

**Nota SDD:** Antes de modificar el código, por favor revisa las especificaciones en `../../agent/client/` para mantener la consistencia.

1. **Gestión de Estado Global (`src/context/`)**
   - El proyecto no utiliza Redux ni Zustand. Todo el estado global se maneja a través de Contextos de React.
   - `CartContext`: Manejo del carrito de compras.
   - `NotificationContext`: Sistema global de alertas (toasts).
   - `WebSocketContext`: Conexión en tiempo real con el backend.

2. **Enrutamiento Avanzado (Modal Routing)**
   - El componente principal `App.jsx` implementa una solución de *Modal Routing*.
   - Al navegar a detalles de productos, se utiliza `location.state?.backgroundLocation` para renderizar un modal superpuesto (`<Home isModalView={true} />`) sin perder la vista del catálogo o colección de fondo. **Cuidado al modificar enlaces o redirecciones para no romper este flujo.**

3. **Arquitectura de Componentes (`src/components/interface/`)**
   - `/vistas`: Componentes de cara al cliente (Inicio, Catálogo, Nosotros).
   - `/admin`: Panel de control (Dashboard, Setup inicial, Login).

## 🛠 Instalación y Uso Local

```bash
# Instalar dependencias (usamos yarn)
yarn install

# Iniciar servidor de desarrollo
yarn dev

# Construir para producción
yarn build
```
