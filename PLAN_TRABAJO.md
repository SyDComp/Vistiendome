# Plan de trabajo — Reunión con clienta (agosto 2026)

Documento vivo. Se actualiza después de cada reunión.
Referencia de alcance original: [propuesta_vistiendome.md](propuesta_vistiendome.md) (junio 2026 — **desactualizada**, ver nota al final).

**Progreso:** Fase 1 completa (2026-08-10) — commits `1ca9c37` (fix de puerto dinámico, fuera de este plan), `6040641` (gitignore), `3ea313c` (este documento) y `e04b314` (los 5 items de Fase 1), más ajustes de pulido sobre WhatsApp/Maps/Waze. Fase 2 en curso: 2.0 (refactor de impresión) se descartó tras leer el código a fondo — ver sección 2.0 — y se corrigió una duplicación real de `generateEAN13`.

**Clasificación comercial** (a completar por Allan antes de enviar a la clienta):

| Etiqueta | Significa | Cómo se comunica |
|---|---|---|
| `[I]` Incluido | Ya estaba en lo comprometido | Se hace, no se menciona |
| `[A]` Ajuste sin costo | Nuevo pero mínimo | Se regala, **pero se le dice que se regaló** — trabajo gratis que nadie sabe que fue gratis no vale nada |
| `[N]` Desarrollo nuevo | Alcance nuevo real | Lleva plazo y valor. **No se empieza sin aprobación** |

**Decisión de Allan (2026-08-10):** todos los `[N]` de la Fase 3 se hacen **gratis**, con una condición explícita — **con esto se cierra el alcance de esta ronda.** Falta comunicárselo a Paola por escrito con esos mismos términos (gratis + cierre de alcance), no solo de palabra, para que la decisión quede protegida de cara al futuro.

---

## ⚠️ Preguntas abiertas — resolver con la clienta

| # | Pregunta | Bloquea | Estado |
|---|---|---|---|
| 1 | ~~"Cómo voy a ingresar? Que aparezca como el modal"~~ | 3.1 | ✅ **Resuelta.** No es el `WelcomeModal` — Allan aclaró que es un selector de modo tipo "menú de videojuego" (mayorista/particular/iglesia) al entrar. Se descartó: como el precio real lo decide la cantidad (6+ unidades), un selector que no otorga nada solo agrega fricción en la entrada. Se reemplaza por **precio dual visible en el producto** (ver 3.1) |
| 2 | **Videos: ¿embebido o enlace?** Ella misma dudó ("videos **o** un botón de enlace"). Y ¿va a nivel colección o producto? | 2.2 | Abierta. Allan confirmó el flujo: Paola sube a YouTube, se enlaza desde el sitio. Falta definir si embebido o solo link, y colección vs. producto |
| 3 | **Planilla modificable: ¿qué campos y quién puede editarla?** | 3.2 | Abierta |
| 4 | ~~Precio mayorista: ¿por variante o por producto?~~ | 3.1 | ✅ **Resuelta.** Es a nivel **variante** (confirmado) — coincide con cómo ya funciona el resto del sistema de precios (`compute_effective_price`) |
| 5 | ~~Mostrarle el comprobante que YA existe~~ | 2.4 | ❌ **Corrección, no resuelta.** Se verificó el código a fondo: `ShippingLabelPrinter` es una etiqueta de **envío** (destinatario, dirección, transporte), no lista los productos comprados. El comprobante de compra sin precios **no existe**, es trabajo nuevo real (ver 2.4) |

---

## Fase 1 — Rápidos ✅ COMPLETA (commit `e04b314`)

| # | Pedido de la clienta | Qué se hizo | Clas. |
|---|---|---|---|
| 1.1 | Precio $0 o $1 para regalos | **Se encontró un bug real al verificar** (no era cierto que "ya funcionaba"): `CartContext.addItem` trataba `price === 0` como "aún no cargó" y bloqueaba agregarlo al carrito; el mensaje de WhatsApp además omitía la línea de precio/total en $0 por el mismo error de truthy-check. Ambos corregidos | `[ ]` |
| 1.2 | Letra más grande / negrita en la barra rosada | `font_size` (normal/grande/muy grande) y `bold` agregados al config del banner, editables desde Settings | `[ ]` |
| 1.3 | Dirección obligatoria + decir "domicilio particular" | `direccion` ahora obligatoria en el checkout cuando el despacho es a domicilio (no aplica a retiro en tienda/sucursal); label actualizado a "Dirección de Domicilio Particular" | `[ ]` |
| 1.4 | Botón WhatsApp flotante permanente | Componente `WhatsAppFAB` nuevo, visible en todo el sitio público, se auto-oculta si no hay número configurado | `[ ]` |
| 1.5 | Ubicación con link a Google Maps / Waze | Campo `map_url` en Settings, botón "Cómo llegar →" en Footer y Contacto | `[ ]` |

---

## Fase 2 — Medianos (extienden algo que ya existe)

| # | Pedido de la clienta | Traducción técnica | Estado hoy | Clas. |
|---|---|---|---|---|
| 2.1 | **Etiqueta de producto profesional** — código de barras + Vistiendome + talla + nombre + descripción + precio | Extensión contenida dentro de `BarcodePrinter.jsx` | ✅ **Hecho.** Segunda línea "$precio · Vistiendomé" bajo el código de barras (impresión + ambas vistas previas). Verificado en vivo con datos reales. **Pendiente aclarar:** "descripción" no se agregó — el texto largo de un producto no cabe en una etiqueta de 4.5×2cm. Si te referías a otra cosa (¿tela? ¿código interno?), decime y lo ajusto | `[ ]` |
| 2.2 | Videos de YouTube en colecciones | Campo `video_url` en colección + embed | No existe nada. Patrón simple, igual al de imágenes | `[ ]` |
| 2.3 | **Buscador sobre todas las características del sistema** | Tokenizar la búsqueda y matchear cada token contra nombre, categoría y **los valores de cualquier `Characteristic` definida** | `InstantSearch.jsx:51` es `.includes()` simple: el orden de las palabras importa y no tolera errores de tipeo. **El modelo ya lo permite:** `Characteristic` (`catalog.py:47`) es genérico (`name`, `value_structure`, `domain`, `is_filterable`) y `SKU.config` es un dict libre. Data-driven: al definir una característica nueva (Tela, Escote), el buscador la incorpora sin tocar código | `[ ]` |
| 2.4 | Comprobante de compra sin precios | Nuevo layout de impresión sobre el núcleo de 2.0 | **Corrección tras revisar a fondo:** `ShippingLabelPrinter.jsx` y `PrintLabel.jsx` son etiquetas de **envío** (destinatario, dirección, transporte) — ninguno lista los productos comprados. El comprobante **no existe**, es trabajo nuevo real. Es la misma pieza técnica que 3.2 (lista de ítems de una cotización), solo cambia el layout: uno sin precios para la clienta, otro con detalle de confección para el taller | `[ ]` |

### 2.0 Refactor del núcleo de impresión — **DESCARTADO tras leer los tres archivos a fondo**

La premisa original ("los tres reimplementan lo mismo") era incorrecta. Verificado línea por línea:

| Archivo | Líneas | Ruta | Cómo imprime |
|---|---|---|---|
| `BarcodePrinter.jsx` | 868 | `/admin/dashboard/inventory/barcodes` | Genera un HTML completo como string (`buildPrintHTML`) desde datos. Modelo propio: Papel × Tamaño de etiqueta → grilla calculada matemáticamente |
| `ShippingLabelPrinter.jsx` | 1042 | `/admin/dashboard/crm/shipping-labels` | Clona el HTML **ya renderizado** por React (`printContainerRef.current.innerHTML`) hacia la ventana nueva. Modelo propio: 6 presets de formato fijos, sin grilla calculada |
| `PrintLabel.jsx` | 470 | `/admin/print/cotizacion/:id` | Ni siquiera usa ventana emergente — es una ruta React normal que se imprime con `Ctrl+P` (`@media print`) |

Tres estrategias de impresión genuinamente distintas y tres modelos de datos distintos. Forzarlos a compartir un "núcleo" habría sido una abstracción inventada, no una real — exactamente lo que el estándar de arquitectura del proyecto pide evitar. **No se construye.**

**Lo que sí era duplicación real (corregido):** `generateEAN13` (genera código de barras determinista desde el SKU) estaba copiada en 3 archivos (`BarcodePrinter.jsx`, `DetailDrawer.jsx`, `VariantPicker.jsx`) cuando ya existía una versión compartida en `features/productDetail/utils/skuUtils.js` que `ProductDetailView.jsx` sí usaba. Los tres ahora importan la versión compartida.

**Consecuencia:** 2.1 no tiene prerequisito — se implementa directo dentro de `BarcodePrinter.jsx`.

---

## Fase 3 — Grandes (cotizar aparte, NO empezar sin aprobación escrita)

### 3.1 Precio mayorista — **alcance definido, se achicó mucho**

**Regla de negocio confirmada:** 6 o más unidades de **la misma prenda y la misma variante** → precio mayorista. Iglesia **es** mayorista, misma regla. Solo existen **dos precios**: particular y mayorista.

**Consecuencia clave:** el precio lo determina **la cantidad**, no quién dice ser el cliente. Por lo tanto el modal "¿mayorista / particular / iglesia?" no es un sistema de segmentación sino un **modo de visualización** del catálogo — sirve para que un mayorista navegue viendo sus precios, pero no le *otorga* nada. Eso elimina por completo la pregunta de "¿qué impide que un particular haga clic en mayorista?": el clic no da nada, las 6 unidades sí. Sin cuentas verificadas, sin aprobaciones, sin pasarela.

Trabajo concreto:
1. Segundo precio por variante: `price_mayorista` junto a `price` en `SKU` (`catalog.py:179`) + migración.
2. Regla en el carrito: 6+ de un mismo SKU → aplica el precio mayorista en esa línea.
3. **Selección por rango de características en `BatchVariantEditor`** — hoy la selección es manual; falta poder decir "todas las XL" o "todas las de manga larga" y aplicarles precio de una. Aquí vive el "manejo robusto por rango".
4. El modal como toggle de visualización.

**Resuelto:** el precio mayorista se define **a nivel variante** (`SKU.price_mayorista`), consistente con cómo ya funciona `SKU.price` y con el patrón de `compute_effective_price` (override de SKU sobre el de producto). Sin default a nivel producto por ahora — se puede agregar después si cargar variante por variante resulta tedioso.

### 3.2 Confección a pedido, orden de corte y planilla

**Los "lotes" del cuaderno no se replican.** El "N° pedido 56" que agrupa varias clientas es una consecuencia del papel (hay que agrupar para que quepa), no una necesidad del negocio. En digital eso desaparece.

**Traducción moderna:** la *orden de corte* no es una entidad que agrupa — es una **vista filtrable** sobre los ítems pendientes de confección ("todo lo que hay que cortar", filtrable por fecha, producto o tela), que se imprime. La *planilla de pedido* es la ficha individual de una clienta. Ambas salen de la misma consulta, sin crear agrupaciones a mano.

**Manga y largo son variantes normales.** Decisión tomada: manga, largo y cualquier otra característica se modelan como características del sistema que generan SKU, cada variante con su precio, imagen y código de barras. Es como el sistema fue diseñado.

> Descartado: la propuesta previa de un flag "opción a pedido" que no generara SKU. El argumento en contra era la explosión combinatoria (6 tallas × 10 colores × 4 mangas × 3 largos = 720 SKUs), pero **ese problema ya está resuelto** por la Mesa de Trabajo (`WorkspaceModule.jsx` → `BatchVariantEditor.jsx`, 513 líneas), que permite selección múltiple y aplicación masiva de precio e imágenes. Lo que falta no es un modelo distinto, es **selección por rango de características** (ver 3.1 punto 3).

**Lo que sí falta:** `CotizacionItem` (`crm.py:56`) solo guarda `sku_id`, `cantidad`, `precio_unitario_estimado`, `nombre_custom`. Como la variante completa queda identificada por el `sku_id`, la información de manga/largo se recupera desde `SKU.config` — pero hay que verificar que las vistas de cotización y las hojas impresas la muestren.

**No existe modelo `Order`/`Venta`.** Todo pasa por `Cotizacion` con estado `CERRADA_EXITO`. La propuesta de junio lo listaba como pendiente de Fase 1 y sigue pendiente.

**Recomendación:** no construir un punto de venta. `Cotizacion` ya es de facto el pedido — tiene persona, ítems, despacho, transporte y estado. Extenderlo con las vistas imprimibles es una fracción del costo de un POS.

**Stock — RESUELTO, no bloquea nada.** Verificado en código:
- El único movimiento que se crea es `RECEIPT` (`catalog_admin.py:1081`). **No existe ningún `MovementType.SALE` en el backend** y `crm.py` no toca `StockMovement`. El stock solo sube, nunca baja.
- El front **no valida stock**: sin "agotado", sin botón deshabilitado, ni en detalle de producto, ni en carrito, ni en `cartUtils`.

Conclusión: el stock hoy es decorativo. **No hace falta el flag "se confecciona a pedido"** — la regla de las 6 unidades se implementa sin tocar stock.

**DECISIÓN TOMADA: opción B — hacer el stock real.** Fundamento: si a futuro se implementa el punto de venta (3.3), tener el libro de movimientos funcionando desde antes es la base sobre la que se apoya.

Estado verificado del modelo (mejor de lo esperado):
- La API pública **ya calcula** el stock sumando movimientos (`products.py:279`), igual que el admin. El libro **ya es la autoridad en todos lados**.
- **Nadie escribe `SKU.stock`** — cero asignaciones en el backend. Los `s_data.stock` de `catalog_admin.py:1265` vienen del payload de entrada y generan un `ADJUSTMENT` por diferencia, que es comportamiento correcto de libro contable.
- Corrección a una nota previa: **no hay dos fuentes de verdad peleando.** La columna `SKU.stock: int` está muerta (se persiste en 0, nadie la lee como verdad). No es una desincronización activa, es una trampa para el próximo que escriba `sku.stock` de buena fe y reciba 0.

**Trabajo a realizar:**

| # | Tarea | Detalle |
|---|---|---|
| a | Eliminar la columna `SKU.stock` | Migración. El libro es la autoridad; dejarla es una mina antipersonal |
| b | Gancho de venta | Al pasar una `Cotizacion` a `CERRADA_EXITO`, crear un `StockMovement` tipo `SALE` (cantidad negativa) por cada `CotizacionItem` con `sku_id` |
| c | **Idempotencia** | Agregar `cotizacion_id` opcional a `StockMovement`. Permite verificar si ya se descontó, revertir al reabrir, y da trazabilidad ("¿por qué bajó el stock? por el pedido X"). **Aquí es donde este tipo de feature se rompe siempre** — cerrar, reabrir y volver a cerrar no puede descontar dos veces |

**Fuera de alcance:** `MovementType.RESERVATION` ("checkout iniciado"). Si todo se cierra por WhatsApp, reservar al iniciar checkout agrega complejidad sin beneficio.

> ⚠️ **Tarea operativa para la clienta, NO es código.** El stock hoy solo ha subido, nunca bajado: **ninguna venta histórica está reflejada.** Antes de encender el descuento, Paola debe hacer una pasada de ajuste con las cantidades reales. Si no, el libro arranca cuadrado sobre una línea base falsa.

> 🔑 **Encender el libro ≠ encender el bloqueo.** Son dos decisiones separadas. El stock se registra y se ve, pero **la tienda sigue sin bloquear la compra por stock 0**, tal como está hoy. Razones: venden a pedido, la línea base será imperfecta los primeros meses, y bloquear ventas con datos malos es el peor resultado posible. El stock puede irse a negativo — un negativo es información útil ("vendimos 3 más de los cargados"), no un error.

---

### 3.3 Punto de venta — PROYECTO APARTE, no cotizar aquí

Se saca del alcance de esta fase por decisión conjunta. Justificación: no existe modelo `Order`/`Venta`, implicaría movimientos de inventario, manejo de caja y probablemente documentos tributarios (boleta/factura, integración SII). Es un proyecto con vida propia.

Se retoma cuando las fases 1 y 2 estén cerradas.

---

## Nota sobre el alcance

`propuesta_vistiendome.md` es de junio 2026, describe un MVP y una hoja de ruta vaga. El proyecto ya la superó por lejos: **CMS studio, analytics, CRM de cotizaciones, TopBanner, WelcomeModal y etiquetas de envío no están en ese documento.** El desborde de alcance venía ocurriendo desde antes de esta reunión.

Acción pendiente: reescribir la propuesta como "estado real del sistema (v2)" listando todo lo que hoy existe. Sirve para dos cosas — ordenar el proyecto, y mostrarle a la clienta la cantidad de valor ya entregado antes de hablar de lo nuevo.
