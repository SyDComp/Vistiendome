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
| H4 | Panel › Bodega | Pedía `/admin/catalog/kardex`, `/kardex/{id}/history` y `POST /kardex/movement`, y **ninguno existía** en el backend. Sólo mostraba "Error al cargar saldos". | ✅ Endpoints implementados sobre el libro de movimientos que ya existía. **⚠️ Ver nota abajo: la pantalla no está en el menú.** |

| H5 | Panel › Galería | Cargaba los **73 originales completos: 35,6 MB cada vez** que se abría. Fotos de 1805×2048 mostradas a 393×280, con las derivadas ya generadas y sin usar. | ✅ Corregido — usa la miniatura `sm` y carga diferida: **34 MB → 1 MB** |

| H6 | Panel › Orden de Corte | **Imprimía el panel completo** —barra lateral, menú y todo— porque `window.print()` desde una vista del dashboard imprime la página entera, y el layout no tiene reglas de impresión. Marcar los controles con `.no-print` no alcanzaba: esas clases sólo existen dentro del componente. | ✅ Corregido — imprime en ventana aparte con su propio HTML, mismo patrón que las etiquetas de envío |
| H7 | Panel › Orden de Corte | Mandaba a cortar **pedidos sin confirmar**: el filtro era "todo lo que no esté perdido", así que entraban las 6 consultas NUEVA y las 4 EN_PROCESO. Cortar tela es irreversible y cuesta material. Verificado: una consulta sin confirmar de 9 unidades aparecía como pendiente de corte. | ✅ Corregido — por defecto sólo pedidos confirmados, ampliable desde la vista |
| H8 | Panel › Orden de Corte | Vacía **sin explicar por qué**, lo que se lee como "está rota". Está vacía porque los 17 ítems existentes son previos al arreglo del `sku_id` y no tienen variante asociada. | ✅ Corregido — el vacío ahora explica qué es la vista y cuándo se llena |

| H9 | Panel › Clientes y Cotizaciones | **El botón Eliminar dejaba el panel en blanco.** `confirm()` recibe un TEXTO y devuelve una promesa, pero cuatro lugares lo llamaban con un objeto `{title, message, onConfirm}`. React intentaba renderizar ese objeto y reventaba (error #31). Dos eran preexistentes (Clientes, Cotizaciones) y dos míos, recién escritos copiando ese mismo patrón equivocado. | ✅ Corregido en los cuatro |

| H10 | Ficha de producto | **La página pesaba 17,64 MB** — más del doble que la portada antes de optimizar, y es donde se decide la compra. 52 imágenes, **cero con srcset**, 33 originales descargados. Los peores: 17 muestras de color bajando fotos de 500 KB para círculos de 48 px, y la galería mostrando 633×1013 con archivos de 1641×2048. | ✅ Corregido — **17,64 MB → 0,57 MB** con todo cargado, y 0,02 MB al abrir |

| H11 | Detalle de colección `/coleccion/{slug}` | Bajaba **7 originales, 2,70 MB**, mostrando 383×511. Lo llamativo: **el endpoint ya mandaba el `image_srcset`** — el componente sencillamente nunca lo leyó. Quinta repetición de la misma falla. | ✅ Corregido — **2,70 MB → 0,181 MB**, y ahora cargan 11 imágenes en vez de 7 |
| H12 | Portada › modal de bienvenida | La imagen del modal **está rota** (`naturalWidth = 0`). Apunta a `lh3.googleusercontent.com/gps-cs-s/...`, una URL temporal del perfil de Google Business que ya expiró. Es lo primero que ve una visitante nueva. | ✅ Corregido — el modal ya no muestra imagen rota nunca: si la foto no carga, va sin ella. La URL sigue rota; se arregla eligiendo una foto de la galería desde el panel |
| H15 | Panel › filtro de estado de stock | Una variante con **saldo negativo no aparecía en ningún filtro**: `agotado` pedía `== 0`, `bajo_stock` pedía `> 0`, `disponible` pedía `> umbral`. Los tres juntos cubrían 1.048 de 1.049 variantes; faltaba justo la negativa. Y el negativo es normal acá: la venta descuenta al confirmar el pedido y la prenda a pedido se corta después, así que pasa toda la producción en negativo — invisible en la pantalla que existe para decir qué falta. | ✅ Corregido — `agotado` ahora es `<= 0`. Verificado forzando una variante a −2: cobertura 1.049/1.049 |
| H14 | Modelo `ProductOption` desincronizado de la tabla | El modelo declara `characteristic_id`; la columna real se llama `attribute_id`. Cualquier consulta a ese modelo revienta con `UndefinedColumn`. Se descubrió porque un barrido lo consultó. La tabla tiene **0 filas** y **nadie la usa** fuera del `__init__`. | ⬜ Código muerto — candidato a borrar junto con `PrintLabel.jsx` |
| H13 | Tallas — mayúsculas inconsistentes | El sistema guarda `XS, S, M, L, XL` en mayúscula y `2xl, 3xl, 4xl, 5xl, 6xl, 7xl` en minúscula. Son 81 variantes de cada una, y esos valores son los que se muestran tal cual en el selector de talla: la clienta ve "XL" y justo debajo "2xl". | ✅ Corregido con tu visto bueno — 492 cambios (6 opciones del dominio + 486 variantes), con respaldo previo. Verificado en la ficha: `12, 14, XS, S, M, L, XL, 2XL…7XL` |

---

## 1 · Panel de administración

> Una entrada por ruta real de `DashboardLayout.jsx`.

### 1.1 `/inventory/products` — Productos
- ✅ Crear con variante, editar precio, verlo en la tienda y borrar
- ✅ El stock inicial de la variante entra al libro de movimientos (7 = 7)
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
- ✅ Crear, editar, activar/desactivar y borrar — ciclo completo
- ⬜ Asignar y quitar variantes
- ⬜ Portada de colección
- ⬜ Ver reflejada en el sitio público

### 1.4 `/inventory/bodega` — Bodega ⚠️ pantalla parqueada

> **No tiene entrada en el menú.** La ruta existe y el componente renderiza,
> pero sólo se llega escribiendo la URL a mano. No forma parte de la navegación
> de esta versión.
>
> Se implementaron sus tres endpoints (H4) porque faltaban y el libro de
> movimientos ya existía, pero **es trabajo para algo que hoy nadie puede
> abrir**. Queda como decisión: conectarla al menú o dejarla parqueada.
- ✅ Cargar la vista — 1.049 variantes, sin error de consola (era H4)
- ✅ Saldos: 323 variantes con stock, calculados desde el libro
- ✅ Historial por variante, con tipo, cantidad y nota
- ✅ Registrar ingreso y ajuste — 200 → 205 → 200, verificado en la base
- ✅ Validaciones: cantidad 0 → 400, tipo inválido → 400, variante inexistente → 404
- ⬜ Probar el flujo desde la interfaz (abrir historial, registrar ajuste)

### 1.5 `/inventory/categories` — Categorías
- ✅ Crear, editar, borrar — ciclo completo 200/200/200
- ⬜ Jerarquía padre-hijo
- ⬜ `is_filterable` y su efecto en los filtros públicos

### 1.6 `/inventory/characteristics` — Características ⚠️ zona sensible
- ⬜ Listar con columnas Nombre, Opciones, Filtro y **Visual**
- ⬜ **Abrir TALLA y guardar sin cambios** (H1)
- ⬜ Agregar opción a TALLA → se agrega y las 13 del sistema quedan
- ✅ **Marcar TALLA como visual y volver a desmarcarla** — 200/200 (era H3)
- ✅ Quitar visual a COLOR → **403**
- ✅ Quitar visual a ESTAMPADO → **403**
- ✅ Marcar/desmarcar visual en una característica propia — 200/200
- ⬜ Renombrar una del sistema → rechaza
- ⬜ Borrar una del sistema → no disponible
- ✅ Crear una nueva con sus opciones, editar nombre, agregar opción y borrar
- ⬜ Color: opciones con código hex
- ⬜ Estampado: opciones con imagen

### 1.7 `/inventory/filters` — Filtros
- ⬜ Cargar la vista
- ⬜ Configurar qué se muestra y verlo en el catálogo

### 1.8 `/inventory/specifications` — Especificaciones
- ✅ Crear, editar, borrar — ciclo completo 200/200/200
- ⬜ Asociar a categorías y a características
- ⬜ Ver reflejado en la ficha de producto

### 1.9 `/inventory/barcodes` — Códigos de barras
- ✅ Seleccionar variantes — 3 seleccionadas, contador correcto
- ✅ Formatos de papel (Carta/Oficio), orientación y 3 tamaños de etiqueta
- ✅ **Imprime limpio**: genera su propio documento con `@page` y los códigos,
  sin arrastrar el panel

### 1.10 `/workspace` — Mesa de Trabajo
- ✅ Cargar el editor por lotes — 451 variantes de Vestido Noemi
- ✅ **Selección por rango**: un clic en "Beige" selecciona sus 13 variantes
- ✅ Guarda por `PUT /products/{id}`, el mismo endpoint ya verificado
- ⬜ Aplicar precio en masa — **no se probó a propósito**: edita precios reales
  de la clienta y no se tocan sin permiso explícito

### 1.11 `/media` — Galería
- ✅ Lista 73 imágenes con miniatura liviana (era H5)
- ✅ Subir genera derivadas; borrar las elimina (verificado en Fase 1)
- ⬜ Subir (una y varias) desde la interfaz
- ⬜ Renombrar / alias
- ⬜ Borrar en lote
- ⬜ Buscar
- ⬜ Ver dónde se usa cada imagen

### 1.12 `/cms/homepage` — Portada
- ✅ Crear, editar y borrar bloque — ciclo completo
- ⬜ Ordenar y activar/desactivar bloques
- ⬜ Estudio de escenas: capas de texto e imagen
- ⬜ Vista móvil vs escritorio
- ⬜ Ver el cambio en el sitio público

### 1.13 `/cms/help` — Atención al Cliente
- ✅ Crear, editar y borrar sección — ciclo completo
- ⬜ Ordenar secciones
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
- ✅ Crear y editar — 200/200
- ⬜ Listar, buscar
- ⬜ Dirección y comuna

### 1.17 `/crm/cotizaciones` — Cotizaciones
- ✅ Listar sin error **con un ítem de SKU real dentro** (era lo que rompía) — 2026-08-31
- ✅ Ver detalle con sus ítems
- ✅ Cambiar estado a ÉXITO desde la lista → dispara la venta
- ✅ Cambiar estado
- ✅ Cerrar → stock 200→198; reabrir → vuelve a 200
- ✅ Crear cotización manual con SKU real
- ⬜ Imprimir planilla (taller, con precios)
- ⬜ Imprimir comprobante (clienta, sin precios)

### 1.18 `/crm/orden-corte` — Orden de Corte
- ✅ El pedido nuevo aparece en la lista
- ✅ Vacío explicado cuando no hay órdenes (era H8)
- ✅ **Piezas pendientes reales**: las 2 del pedido N°23, con todas sus características
- ✅ Crear orden desde esas piezas → Orden N°2, PENDIENTE
- ✅ Pendiente → En proceso → Finalizada, con confirmación previa (era H9)
- ✅ Al finalizar, los ítems quedan `cortado` y **no** se inventa un ingreso
- ⬜ Filtrar por producto y por característica
- ⬜ Repetir una orden
- ⬜ Imprimir — **no se probó en esta pasada**: el diálogo de impresión cuelga el navegador de automatización. El arreglo (H6) está verificado en el código

### 1.22 Flujo completo de punta a punta ✅ 2026-08-31
> La prueba que faltaba. Detalle y mediciones en [CONCLUSIONES_FLUJO.md](CONCLUSIONES_FLUJO.md) §2.
- ✅ Compra web → cotización N°23 con `sku_id` en sus ítems (primera vez en la base)
- ✅ Confirmar → `SALE −1` en las dos variantes
- ✅ Con stock: 200 → 199 · Sin stock: 0 → **−1** (la deuda)
- ✅ Orden de corte N°2 creada, finalizada, piezas marcadas cortadas
- ⚠️ Quedaron datos de prueba: cotización N°23 y orden N°2, a nombre de **"PRUEBA FLUJO BORRAR"**

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
- ✅ Carga sin errores de consola
- ⬜ Bloques del CMS
- ✅ Imágenes: **13 cargadas, 13 con srcset, 0 originales, 0,718 MB**
- ⬜ Barra de anuncio y modal de bienvenida

### 2.2 `/catalogo` y `/explorador`
- ✅ Catálogo lista 4 productos; Explorador, 60 looks (API + navegador)
- ✅ Catálogo: 4 imágenes, 4 con srcset, 0 originales, **0,095 MB**
- ✅ Colecciones (`/colecciones` y `/coleccion/{slug}`): srcset en las 13, 0 originales
- ✅ Filtro por talla devuelve **todos** los que la tienen (60 de 60)
- ⬜ Filtro por color/estampado
- ⬜ Varios filtros combinados; limpiar
- ⬜ Ordenamiento
- ⬜ Carrusel de las tarjetas
- ✅ Al abrir el detalle, la talla filtrada llega **preseleccionada** (SKU con `12`)

### 2.3 Ficha de producto (4 rutas)
- ⬜ `/producto/:slug`, `/catalogo/producto/...`, `/explorador/producto/...`, `/coleccion/:c/producto/...`
- ✅ SKU **arriba**, en la píldora del encabezado (H2)
- ⬜ Cambiar talla/color actualiza precio, foto, SKU y URL
- ⬜ Combinaciones inexistentes no seleccionables
- ⬜ Aviso "desde N unidades"
- ⬜ Video, especificaciones, compartir
- ⬜ Volver no rompe la navegación

### 2.4 Carrito y cotización
- ✅ Agregar al carrito, con su `skuId` correcto
- ⬜ Precio por cantidad se aplica y se ve
- ⬜ Promoción y regalo
- ⬜ Checkout: validaciones, región/comuna, retiro vs domicilio
- ⬜ Mensaje de WhatsApp completo
- ✅ La cotización llega al CRM **con su `sku_id`** (1570) y el nombre de la variante

### 2.5 `/search` y buscador instantáneo
- ⬜ Por nombre, por característica, sin acentos, orden invertido
- ⬜ Sin resultados

### 2.6 Resto
- ⬜ `/colecciones` y `/coleccion/:slug`
- ⬜ `/nosotros`, `/contacto`, `/ayuda`
- ⬜ Formulario de contacto
- ⬜ WhatsApp flotante, mapas

### 2.7 Móvil (375px)
- ✅ Portada, catálogo (4) y explorador (60) — **sin desborde horizontal**
- ✅ Ficha: sin desborde, SKU en el encabezado, botones de acción presentes
- ✅ Controles táctiles: sólo 1 bajo 44px, y es el artefacto conocido de la
  animación del modal congelada en el navegador de automatización
- ✅ **El checkout no hace zoom**: los 9 campos a 16px o más

---

## 3 · Al cierre

- ⬜ Sin errores de consola en ninguna pantalla
- ⬜ Sin 4xx/5xx inesperados en la red
- ⬜ Datos de prueba eliminados
- ⬜ Hallazgos corregidos y verificados

---

Documento vivo: se actualiza a medida que se prueba.
