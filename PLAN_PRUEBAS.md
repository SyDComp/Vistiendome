# Plan de pruebas — plataforma completa

> **Objetivo:** recorrer toda la plataforma, encontrar los errores y dejarlos
> corregidos. No "parece que anda": cada punto se prueba contra la API o el
> navegador real y se anota el resultado.
>
> **Regla:** un punto sólo se marca ✅ cuando se ejecutó y se vio funcionar.
> Si algo se rompe, se anota como hallazgo con su evidencia — no se disimula.

---

## Cómo se lee este documento

| Estado | Significa |
|---|---|
| ⬜ | Sin probar |
| ✅ | Probado y funciona |
| ❌ | Probado y **falla** — con el detalle abajo |
| ⚠️ | Funciona pero con una salvedad |

---

## Hallazgos abiertos

| # | Dónde | Qué pasa | Estado |
|---|---|---|---|
| H1 | Panel › Características | Guardar TALLA (o cualquiera del sistema con valores tipo `XS`, `XL`) daba **403: "La opción de sistema 'XS' es inmutable"**. El formulario pasaba cada valor por `formatOpt`, que baja a minúsculas y capitaliza sólo la primera letra: `XS` → `Xs`. El servidor creía que la habían borrado. **Paola no podía editar TALLA.** | ✅ Corregido — las opciones del sistema ya no se re-normalizan |
| H2 | Ficha de producto | El SKU terminó primero en un recuadro grande bajo "Especificaciones" y después al pie. Ninguna de las dos era lo pedido: iba arriba, discreto, como estaba. | ✅ Corregido — devuelto a la píldora del encabezado |

---

## 1 · Panel de administración

### 1.1 Características (el que más duele)
- ⬜ Listar: se ven las columnas Nombre, Opciones, Filtro y **Visual**
- ⬜ Abrir TALLA y **guardar sin cambios** → debe guardar (era H1)
- ⬜ Agregar una opción nueva a TALLA y guardar → se agrega, las 13 del sistema quedan
- ⬜ Renombrar una característica del sistema → debe **rechazar**
- ⬜ Borrar una característica del sistema → botón no disponible
- ⬜ Quitar "cambia cómo se ve" a COLOR → debe **rechazar** con mensaje claro
- ⬜ Marcar "cambia cómo se ve" en una característica propia → debe **permitir**
- ⬜ Crear una característica nueva desde cero, con opciones
- ⬜ Borrar una característica propia

### 1.2 Productos
- ⬜ Listar, buscar, filtrar por categoría
- ⬜ Crear un producto con variantes
- ⬜ Editar precio y stock de una variante
- ⬜ Subir una foto y confirmar que **se generan sus derivadas**
- ⬜ Borrar una foto y confirmar que **se borran sus derivadas**
- ⬜ Eliminar un producto

### 1.3 Variantes y Mesa de Trabajo
- ⬜ Listar variantes, paginación
- ⬜ Edición masiva de precio
- ⬜ Asignar imágenes a varias variantes
- ⬜ Detectar variantes en $0

### 1.4 Categorías, Colecciones, Especificaciones
- ⬜ Crear/editar/borrar categoría; jerarquía padre-hijo
- ⬜ Crear colección y asignarle variantes
- ⬜ Especificaciones asociadas a categoría

### 1.5 CRM
- ⬜ Listar cotizaciones sin error (ojo: rompía con ítems de SKU real)
- ⬜ Ver detalle de una cotización
- ⬜ Cambiar estado y confirmar el **descuento de stock** al cerrar
- ⬜ Reabrir y confirmar que el stock **se revierte**
- ⬜ Orden de corte: filtros por producto y característica
- ⬜ Marcar cortado y confirmar que sale de pendientes
- ⬜ Imprimir planilla (taller, con precios)
- ⬜ Imprimir comprobante (clienta, sin precios)
- ⬜ Etiquetas de envío
- ⬜ Crear cotización manual
- ⬜ Clientes: crear y editar

### 1.6 CMS y Ajustes
- ⬜ Editar bloques de portada; ver el cambio en el sitio
- ⬜ Estudio de escenas: agregar capa de imagen
- ⬜ Modal de bienvenida y barra de anuncio
- ⬜ Tramos de precio (mayorista/iglesia): crear, guardar, borrar
- ⬜ Promociones: crear las tres formas, con y sin vigencia
- ⬜ Métodos de envío, redes, contacto

### 1.7 Códigos de barras y multimedia
- ⬜ Generar e imprimir códigos de barras
- ⬜ Galería: subir, renombrar, borrar

### 1.8 Analítica y perfil
- ⬜ Panel de estadísticas carga sin error
- ⬜ Cambiar contraseña / perfil

---

## 2 · Sitio público

### 2.1 Portada
- ⬜ Carga sin errores de consola
- ⬜ Bloques del CMS se ven bien
- ⬜ Imágenes: **derivadas, no originales**
- ⬜ Barra de anuncio y modal de bienvenida

### 2.2 Catálogo y Explorador
- ⬜ Catálogo lista productos; Explorador lista looks
- ⬜ Filtro por talla devuelve **todos** los que la tienen
- ⬜ Filtro por color/estampado
- ⬜ Varios filtros a la vez
- ⬜ Limpiar filtros
- ⬜ Al abrir el detalle, la talla filtrada llega **preseleccionada**

### 2.3 Ficha de producto
- ⬜ SKU **arriba, discreto**, con su código de barras
- ⬜ Cambiar talla/color actualiza precio, foto y SKU
- ⬜ Combinaciones inexistentes no quedan seleccionables
- ⬜ Aviso "desde N unidades" cuando corresponde
- ⬜ Video, especificaciones, compartir

### 2.4 Carrito y cotización
- ⬜ Agregar, cambiar cantidad, eliminar
- ⬜ Precio por cantidad (mayorista/iglesia) se aplica y se ve
- ⬜ Promoción se aplica y se ve el descuento
- ⬜ Regalo aparece cuando corresponde
- ⬜ Checkout: validaciones, región/comuna
- ⬜ El mensaje de WhatsApp sale completo y correcto
- ⬜ **La cotización llega al CRM con su `sku_id`**

### 2.5 Buscador
- ⬜ Buscar por nombre, por característica, sin acentos, orden invertido
- ⬜ Búsqueda instantánea del encabezado

### 2.6 Resto del sitio
- ⬜ Colecciones, Nosotros, Contacto, Atención al cliente
- ⬜ Formulario de contacto
- ⬜ WhatsApp flotante, mapas

### 2.7 Móvil
- ⬜ Portada, catálogo, ficha y carrito a 375px
- ⬜ Controles táctiles cómodos
- ⬜ El checkout no hace zoom al escribir

---

## 3 · Al cierre

- ⬜ Sin errores en consola en ninguna pantalla
- ⬜ Sin 4xx/5xx inesperados en la pestaña de red
- ⬜ Datos de prueba eliminados
- ⬜ Hallazgos corregidos y verificados

---

Documento vivo: se actualiza a medida que se prueba.
