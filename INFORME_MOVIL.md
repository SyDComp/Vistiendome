# Informe — Flujo de compra en móvil (end-to-end)

**Fecha:** 2026-08-17 · **Ancho medido:** 375×812 (iPhone estándar) · **Datos:** base real restaurada (4 productos, 1.049 variantes)

Recorrido completo: portada → catálogo → ficha de producto → selector de variantes → carrito → checkout.
**No se modificó código.** Todo lo de abajo está medido, no estimado.

---

## Lo que está bien (importante decirlo)

- **Cero desborde horizontal** en todas las vistas medidas. El responsive base está sano.
- **El flujo completo funciona**: se puede elegir variante, agregar al carrito y llegar al checkout.
- La ficha de producto en móvil se ve bien: galería, precio con oferta, barra de acción fija abajo.
- Links de Maps/Waze correctos con las coordenadas GPS verificadas.
- Sin errores de consola, salvo el de WebSocket que es artefacto de modo desarrollo.

---

## 🔴 Alto

### 1. El modal de bienvenida tapa el selector de variantes

| | |
|---|---|
| **Medido** | `welcome-modal-overlay` z-index **4000** vs `variant-drawer-overlay` z-index **2000**. `elementFromPoint` en el centro de la pantalla devuelve `welcome-modal__text` |
| **Impacto** | La clienta toca "elegir talla", el selector abre **detrás** del modal y no puede seleccionar |
| **Por qué importa** | Pasa en la ficha de producto — justo donde caen las clientas que entran por los links que Paola comparte por WhatsApp, su canal principal |

### 2. iOS hace zoom automático en el checkout

| | |
|---|---|
| **Medido** | Los **9 campos** del formulario tienen `font-size` menor a 16px (14px en `.input-group input`) |
| **Impacto** | Safari en iPhone hace zoom automático al tocar cualquier campo. La página salta y muchas usuarias no saben volver atrás |
| **Por qué importa** | Ocurre en el checkout: el punto exacto donde se pierde una venta por fricción |

---

## 🟡 Medio

### 3. El catálogo descarga 278 KB por carga

- `/api/v1/products/` pesa **278 KB** y tarda **0,9 s** — con apenas **4 productos**.
- El peso escala con **variantes** (1.049), no con productos. El catálogo ya tiene **58 categorías** esperando más productos.
- Proyección: 50 productos con densidad similar ≈ **3,5 MB** por carga, sobre datos móviles.

### 4. El caché no deduplica llamadas simultáneas

`getProducts()` guarda en caché **después** de que la respuesta llega ([products.api.js](client/src/lib/api/endpoints/products.api.js)). Si dos componentes piden a la vez, ambos fallan el caché y ambos descargan. En desarrollo se observó la llamada duplicada (556 KB en una carga).

### 5. Controles táctiles pequeños

**30 elementos** bajo el mínimo recomendado de 44×44px. El más grave: el **menú hamburguesa a 16×24px** — es la navegación principal en móvil.

---

## 🟢 Bajo

### 6. El SKU ocupa espacio prime sin aportar

En la ficha, el bloque SKU ocupa **dos líneas completas** justo encima del precio, mostrando `NOE • VES NOE • AZU MAR • REDON • BAJ ROD • TEL SOF • XS • 34` — un código interno que a la clienta no le dice nada, en el lugar donde debería estar la información que vende.

---

## Alcance de este informe

**Medido:** portada, catálogo, ficha de producto, selector de variantes, carrito, checkout — a 375px, con datos reales.

**NO medido (queda pendiente):** dispositivo físico real, redes lentas (3G), tablet, las vistas de colecciones/contacto/nosotros, y **todo el panel de administración** — que es donde Paola trabaja a diario y merece su propio recorrido.
