# Propuesta de Proyecto: Plataforma Vistiendome

Esta propuesta documenta el estado actual del sistema (MVP) y establece la hoja de ruta para las siguientes fases de desarrollo. La plataforma busca ofrecer una experiencia de compra premium y artesanal, con un backend robusto capaz de gestionar inventarios complejos.

## Resumen "Humano" (Para usuarios no técnicos)

Vistiendome no es solo una tienda online, es una experiencia digital diseñada para conectar prendas de autor con personas que valoran la exclusividad y el diseño consciente. Actualmente, el sistema permite navegar por una vitrina virtual elegante donde los productos se presentan con gran detalle.

**Lo que ya tenemos:**
*   **Vitrina Digital Premium:** Un catálogo donde puedes filtrar prendas por categoría (vestidos, accesorios, etc.) y características técnicas.
*   **Detalle de Autor:** Cada prenda se puede ver en una ventana especial (modal) sin perder de vista dónde estabas, permitiendo ver variaciones de color y talla de forma instantánea.
*   **Carrito de Compras:** Un sistema inteligente que recuerda qué prendas has seleccionado mientras sigues explorando.
*   **Administración Centralizada:** Una base sólida para que el equipo de Vistiendome pueda cargar nuevos productos y controlar cuántas unidades quedan en bodega en tiempo real.

**Hacia dónde vamos:**
Nuestra meta es cerrar el ciclo de compra integrando pagos seguros, permitiendo que cada cliente tenga su propio perfil para rastrear sus pedidos y creando una herramienta de administración aún más potente para escalar el negocio.

---

## Análisis del Sistema Actual (MVP)

El sistema ha sido construido siguiendo principios de modernidad y escalabilidad. Se divide en dos grandes bloques: una interfaz de usuario (Frontend) de alto impacto visual y un cerebro (Backend) que gestiona la lógica de negocio.

### Estado Actual del Frontend
*   **Tecnología:** Desarrollado con **React 19** y **Vite**, asegurando una carga ultra rápida.
*   **Diseño:** Implementa un sistema de diseño "Premium" con micro-animaciones, jerarquía visual clara y una navegación intuitiva basada en modales para los productos.
*   **Funcionalidades:** 
    *   Filtros multi-facetados (filtrado por múltiples criterios simultáneamente).
    *   Gestión de variantes de producto (SKUs) dinámica.
    *   Contextos globales para el carrito y notificaciones en tiempo real vía WebSockets.

### Estado Actual del Backend
*   **Tecnología:** Motor **FastAPI** (Python 3.12+), conocido por su altísimo rendimiento.
*   **Base de Datos:** Uso de **SQLModel** para una estructura de datos limpia, organizada en categorías jerárquicas y gestión de inventario detallada por movimientos (ingresos, ventas, ajustes).
*   **Seguridad:** Infraestructura de **IAM** (Identity and Access Management) preparada para roles y autenticación segura con tokens JWT.

---

## Resumen Técnico

La arquitectura es un **Decoupled Monolith** (Frontend y Backend separados). El Backend expone una API RESTful documentada automáticamente (OpenAPI) y un canal de comunicación bidireional mediante WebSockets para actualizaciones en vivo. El Frontend consume estos servicios y gestiona el estado de forma eficiente mediante React Context API y Routing avanzado (React Router 7).

*   **Infraestructura:** Preparado para contenerización con Docker.
*   **Datos:** Esquema normalizado para soportar productos con múltiples variantes (color, talla, material) y seguimiento de stock preciso.
*   **Estética:** Vanilla CSS con enfoque en tokens de diseño para mantener consistencia visual premium.

---

## Descripción Técnica del Sistema

### Arquitectura de Datos (Modelado)
El corazón del sistema reside en su modelo de catálogo en `server/app/models/catalog.py`:
1.  **Product & Category:** Soporta categorías recursivas (árboles de categorías). Los productos poseen campos JSON para especificaciones dinámicas que no requieren cambios en la base de datos para añadir nuevos atributos.
2.  **SKU Implementation:** Cada producto tiene múltiples SKUs. El stock se calcula como la suma de los `StockMovement`, lo que garantiza una auditoría completa de por qué cambió el inventario.
3.  **Sistema de Atributos:** Uso de la tabla `Characteristic` para definir qué campos son filtrables por categoría, permitiendo que el catálogo sea extremadamente adaptable.

### Flujo de Navegación "Intersticial"
El sistema utiliza una técnica avanzada de routing donde, al hacer clic en un producto desde el catálogo, se abre un **Modal de Detalle** manteniendo la URL sincronizada. Esto permite al usuario volver atrás fácilmente o compartir el link directo de una variante específica (ej: `/producto/vestido-luna/VL-M-AZUL`).

### Comunicación Real-Time
A diferencia de tiendas convencionales, Vistiendome cuenta con un `ConnectionManager` de WebSockets. Esto permite:
*   Notificar al usuario si el stock de un producto se agota mientras lo está viendo.
*   Actualizaciones automáticas en el panel de administración cuando entra una nueva interacción.

---

## Próximos Pasos (Hoja de Ruta) futuro lejano

### Fase 1: Transaccionalidad (Prioridad Alta)
*   **Checkout Workflow:** Formulario de despacho con validación de zonas.
*   **Pasarelas de Pago:** Integración con API de pagos (Webpay, MercadoPago o Stripe).
*   **Gestión de Órdenes:** Modelos para `Order` y `OrderItem` para registrar ventas confirmadas.

### Fase 2: Experiencia de Cliente
*   **Portal de Usuario:** Registro/Login de clientes, historial de compras y gestión de direcciones.
*   **Wishlist:** "Favoritos" para fomentar el retorno de usuarios.

### Fase 3: Operación y Analítica
*   **Dashboard de Admin Extendido:** Gráficos de ventas, reportes de stock bajo y gestión de pedidos pendientes.
*   **Migración a Producción:** Despliegue en entornos cloud (AWS/GCP) y transición a PostgreSQL.
