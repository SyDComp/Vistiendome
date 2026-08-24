# Plan de pruebas — plataforma completa

> **Objetivo:** recorrer toda la plataforma, encontrar los errores y dejarlos
> corregidos. No "parece que anda": cada punto se prueba contra la API o el
> navegador real y se anota el resultado.
>
> **Regla:** un punto sólo se marca ✅ cuando se ejecutó y se vio funcionar.
> Si falla, se anota como hallazgo con su evidencia — no se disimula ni se
> justifica.

**Este índice no se escribió de memoria:** sale de las rutas reales de
`DashboardLayout.jsx` y `App.jsx`. Si aparece una pantalla que no está acá, es
un error del plan y hay que agregarla.

| Estado | Significa |
|---|---|
| ⬜ | Sin probar |
| ✅ | Probado y funciona |
| ❌ | Probado y **falla** |
| ⚠️ | Funciona con salvedad |

---

## Hallazgos

| # | Dónde | Qué pasa | Estado |
|---|---|---|---|
| H1 | Panel › Características | Guardar TALLA daba **403 "La opción de sistema 'XS' es inmutable"**. El formulario pasaba todas las opciones por `formatOpt`, que baja a minúsculas y capitaliza sólo la primera letra: `XS` → `Xs`, `XL` → `Xl`. El servidor las comparaba por valor exacto y creía que las habían borrado. `S` y `M` sobrevivían por tener una sola letra, lo que hacía el fallo más confuso. **Paola no podía editar TALLA.** | ✅ Corregido — las opciones del sistema ya no se re-normalizan |
| H2 | Ficha de producto | El SKU terminó en un recuadro grande bajo "Especificaciones" y después al pie. Nunca se pidió moverlo: se pidió que dejara de ser grande. | ✅ Corregido — de vuelta en la píldora del encabezado |
| H3 | Panel › Características | La regla de "visual" se implementó como *del sistema + visual = bloqueado*. Con eso, marcar **TALLA** como visual la dejaba **atrapada para siempre**. La regla real es: la clienta decide libremente, y las **únicas** excepciones son Color y Estampado. | ✅ Corregido — se identifica por `system_id`, no por `is_system` |
| H4 | Panel › Bodega | **La pantalla completa estaba muerta.** Pedía `/admin/catalog/kardex`, `/kardex/{id}/history` y `POST /kardex/movement`, y **ninguno de los tres existía** en el backend (cero coincidencias de "kardex" en el Python). Sólo mostraba "Error al cargar saldos". No se podía ver stock, ni historial, ni registrar ingresos o mermas. | ✅ Corregido — los tres implementados sobre el libro de movimientos que ya existía |

---

## 1 · Panel de administración

> Una entrada por ruta real de `DashboardLayout.jsx`.

### 1.1 `/inventory/products` — Productos
- ⬜ Listar, paginar, buscar
- ⬜ Filtrar por categoría y por estado de stock
- ⬜ Crear producto con sus variantes
- ⬜ Editar: nombre, descripción, precio, specs, video
- ⬜ Oferta temporal (producto y variante)
- ⬜ Subir foto → **se generan las derivadas**
- ⬜ Borrar foto → **se borran sus derivadas**
- ⬜ Eliminar producto

### 1.2 `/inventory/variants` — Variantes
- ⬜ Listar y paginar (1.049 SKUs)
- ⬜ Buscar y filtrar
- ⬜ Editar una variante
- ⬜ Ver stock por variante
- ⬜ Detectar variantes en $0

### 1.3 `/inventory/collections` — Colecciones
- ⬜ Crear, editar, activar/desactivar
- ⬜ Asignar y quitar variantes
- ⬜ Portada de colección
- ⬜ Ver reflejada en el sitio público

### 1.4 `/inventory/bodega` — Bodega
- ✅ Cargar la vista — 1.049 variantes, sin error de consola (era H4)
- ✅ Saldos: 323 variantes con stock, calculados desde el libro
- ✅ Historial por variante, con tipo, cantidad y nota
- ✅ Registrar ingreso y ajuste — 200 → 205 → 200, verificado en la base
- ✅ Validaciones: cantidad 0 → 400, tipo inválido → 400, variante inexistente → 404
- ⬜ Probar el flujo desde la interfaz (abrir historial, registrar ajuste)

### 1.5 `/inventory/categories` — Categorías
- ⬜ Crear, editar, borrar
- ⬜ Jerarquía padre-hijo
- ⬜ `is_filterable` y su efecto en los filtros públicos

### 1.6 `/inventory/characteristics` — Características ⚠️ zona sensible
- ⬜ Listar con columnas Nombre, Opciones, Filtro y **Visual**
- ⬜ **Abrir TALLA y guardar sin cambios** (H1)
- ⬜ Agregar opción a TALLA → se agrega y las 13 del sistema quedan
- ⬜ **Marcar TALLA como visual y volver a desmarcarla** (H3)
- ⬜ Quitar visual a COLOR → **rechaza**
- ⬜ Quitar visual a ESTAMPADO → **rechaza**
- ⬜ Marcar/desmarcar visual en una característica propia
- ⬜ Renombrar una del sistema → rechaza
- ⬜ Borrar una del sistema → no disponible
- ⬜ Crear una nueva con sus opciones
- ⬜ Editar y borrar una propia
- ⬜ Color: opciones con código hex
- ⬜ Estampado: opciones con imagen

### 1.7 `/inventory/filters` — Filtros
- ⬜ Cargar la vista
- ⬜ Configurar qué se muestra y verlo en el catálogo

### 1.8 `/inventory/specifications` — Especificaciones
- ⬜ Crear, editar, borrar
- ⬜ Asociar a categorías y a características
- ⬜ Ver reflejado en la ficha de producto

### 1.9 `/inventory/barcodes` — Códigos de barras
- ⬜ Seleccionar variantes
- ⬜ Formatos de papel y tamaño de etiqueta
- ⬜ Vista previa e impresión

### 1.10 `/workspace` — Mesa de Trabajo
- ⬜ Cargar el editor por lotes
- ⬜ Selección múltiple de variantes
- ⬜ Aplicar precio en masa
- ⬜ Asignar imágenes en masa

### 1.11 `/media` — Galería
- ⬜ Subir (una y varias)
- ⬜ Renombrar / alias
- ⬜ Borrar en lote
- ⬜ Buscar
- ⬜ Ver dónde se usa cada imagen

### 1.12 `/cms/homepage` — Portada
- ⬜ Crear, ordenar, activar/desactivar bloques
- ⬜ Estudio de escenas: capas de texto e imagen
- ⬜ Vista móvil vs escritorio
- ⬜ Ver el cambio en el sitio público

### 1.13 `/cms/help` — Atención al Cliente
- ⬜ Crear y ordenar secciones de ayuda
- ⬜ Editar contenido
- ⬜ Ver reflejado en `/ayuda`

### 1.14 `/cms/settings` — Ajustes
- ⬜ Redes sociales y contacto
- ⬜ Métodos de envío y colores
- ⬜ Modal de bienvenida
- ⬜ Barra de anuncio
- ⬜ **Tramos de precio** (mayorista/iglesia): crear, guardar, borrar
- ⬜ **Promociones**: lleva X paga Y, segunda unidad, regalo, con vigencia
- ⬜ Página Nosotros

### 1.15 `/analytics` — Estadísticas
- ⬜ Carga sin error
- ⬜ Los números coinciden con la actividad real

### 1.16 `/crm/clientes` — Clientes
- ⬜ Listar, buscar
- ⬜ Crear, editar
- ⬜ Dirección y comuna

### 1.17 `/crm/cotizaciones` — Cotizaciones
- ⬜ Listar sin error (rompía con ítems de SKU real)
- ⬜ Ver detalle con sus ítems
- ⬜ Cambiar estado
- ⬜ Cerrar → **descuenta stock**; reabrir → **lo revierte**
- ⬜ Crear cotización manual
- ⬜ Imprimir planilla (taller, con precios)
- ⬜ Imprimir comprobante (clienta, sin precios)

### 1.18 `/crm/orden-corte` — Orden de Corte
- ⬜ Listar pendientes
- ⬜ Filtrar por producto y por característica
- ⬜ Marcar cortado → sale de pendientes y persiste
- ⬜ Imprimir

### 1.19 `/crm/shipping-labels` — Etiquetas de Envío
- ⬜ Seleccionar cotizaciones
- ⬜ Formatos y copias
- ⬜ Imprimir

### 1.20 `/profile` — Mi Perfil
- ⬜ Editar datos
- ⬜ Cambiar contraseña
- ⬜ Cerrar sesión

### 1.21 Acceso
- ⬜ `/admin/login`: credenciales correctas e incorrectas
- ⬜ Sesión expirada redirige al login
- ⬜ `/admin/bootstrap`

---

## 2 · Sitio público

### 2.1 `/` — Portada
- ⬜ Carga sin errores de consola
- ⬜ Bloques del CMS
- ⬜ Imágenes: **derivadas, no originales**
- ⬜ Barra de anuncio y modal de bienvenida

### 2.2 `/catalogo` y `/explorador`
- ⬜ Catálogo lista productos; Explorador lista looks
- ⬜ Filtro por talla devuelve **todos** los que la tienen
- ⬜ Filtro por color/estampado
- ⬜ Varios filtros combinados; limpiar
- ⬜ Ordenamiento
- ⬜ Carrusel de las tarjetas
- ⬜ Al abrir el detalle, la talla filtrada llega **preseleccionada**

### 2.3 Ficha de producto (4 rutas)
- ⬜ `/producto/:slug`, `/catalogo/producto/...`, `/explorador/producto/...`, `/coleccion/:c/producto/...`
- ⬜ SKU **arriba, discreto**, con código de barras
- ⬜ Cambiar talla/color actualiza precio, foto, SKU y URL
- ⬜ Combinaciones inexistentes no seleccionables
- ⬜ Aviso "desde N unidades"
- ⬜ Video, especificaciones, compartir
- ⬜ Volver no rompe la navegación

### 2.4 Carrito y cotización
- ⬜ Agregar, cambiar cantidad, eliminar
- ⬜ Precio por cantidad se aplica y se ve
- ⬜ Promoción y regalo
- ⬜ Checkout: validaciones, región/comuna, retiro vs domicilio
- ⬜ Mensaje de WhatsApp completo
- ⬜ La cotización llega al CRM **con su `sku_id`**

### 2.5 `/search` y buscador instantáneo
- ⬜ Por nombre, por característica, sin acentos, orden invertido
- ⬜ Sin resultados

### 2.6 Resto
- ⬜ `/colecciones` y `/coleccion/:slug`
- ⬜ `/nosotros`, `/contacto`, `/ayuda`
- ⬜ Formulario de contacto
- ⬜ WhatsApp flotante, mapas

### 2.7 Móvil (375px)
- ⬜ Portada, catálogo, ficha, carrito
- ⬜ Menú y controles táctiles
- ⬜ El checkout no hace zoom al escribir

---

## 3 · Al cierre

- ⬜ Sin errores de consola en ninguna pantalla
- ⬜ Sin 4xx/5xx inesperados en la red
- ⬜ Datos de prueba eliminados
- ⬜ Hallazgos corregidos y verificados

---

Documento vivo: se actualiza a medida que se prueba.
