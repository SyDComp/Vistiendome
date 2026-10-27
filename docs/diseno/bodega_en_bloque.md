# Bodega: filtrar por existencias y mover varias variantes de una vez

Estado: **aprobado** (2026-10-27).

## El problema

En Catálogo → Bodega hoy se puede buscar y filtrar por característica, pero no:

- ver cuáles no tienen stock, cuáles sí, o cuáles tienen N o menos;
- cambiar el stock de varias variantes de una vez (llegó mercadería de 30 variantes,
  o se hizo inventario y hay que corregir 50).

Hoy cada cambio es abrir una variante, "Registrar movimiento", confirmar, y repetir.

## Dónde va: Bodega, no Producción

Producción (la mesa de trabajo) edita lo que **define** una variante: precio, fotos,
características. A propósito no toca el stock: mandaba el stock con el que se había
cargado la pantalla y, al guardar un precio, borraba las ventas hechas mientras tanto
(10 → venta → 9 → se guarda el precio → volvía a 10). Se arregló sacando el stock de esa
pantalla.

La bodega es un **libro de movimientos que no se borra** (`core/movimientos.py`): el stock
es la suma de lo que entró y salió. Cualquier cambio de stock, uno o mil, entra como
movimientos nuevos. Por eso todo lo de este documento vive en Bodega.

## 1. Filtrar por existencias

Sobre la columna **Disponible** (en bodega menos lo apartado para pedidos confirmados), que
es lo que se puede vender:

| Filtro | Muestra |
|---|---|
| Todas | todas |
| Sin stock | disponible ≤ 0 (incluye las que tienen pedidos esperando) |
| Con stock | disponible > 0 |
| Hasta N | disponible ≤ N, con N escrito por la usuaria |

Más: **ordenar** por En bodega, Apartado o Disponible (clic en el encabezado).

Se resuelve en el navegador: `GET /admin/catalog/kardex` ya trae todas las variantes de
una vez (hoy 1.094), y el buscador y los filtros por característica ya funcionan así. No
cambia el servidor. Se combina con lo que ya hay: "talla 3XL, color negro, hasta 2".

## 2. Elegir varias

- Una casilla por fila y una en el encabezado: **"Elegir las N filtradas"**.
- Lo elegido se mantiene al cambiar el filtro. Una barra fija abajo dice
  **"12 elegidas · Registrar movimiento · Quitar selección"**.

## 3. Registrar un movimiento a todas las elegidas

Un panel con dos modos:

### a) Sumar o restar (lo de siempre, en bloque)

- **Ingreso** (suma) o **Merma / Salida** (resta), y **la misma cantidad** para cada una.
- **Motivo obligatorio**, igual que hoy.
- Una merma que dejaría alguna variante bajo cero **rechaza todo el lote** y lista cuáles
  y cuánto tienen. Nada queda a medias.

### b) Conteo (inventario)

Para cuando se cuenta lo que hay físicamente:

- El panel lista las elegidas con **"En bodega ahora"** y una casilla **"Contadas"**.
- Al confirmar, el servidor anota por cada una un **ajuste por la diferencia**
  (contadas − en bodega), con la nota "Conteo: había X, se contaron Y. <motivo>". Si no
  hay diferencia, no anota nada.
- **Se cuenta "en bodega", no "disponible"**: lo apartado también está físicamente en la
  bodega.
- **Protección contra ventas simultáneas:** el panel manda cuánto había cuando se abrió
  (`esperado`). Si mientras se contaba se vendió o entró algo, esa variante ya no tiene
  lo esperado y el lote completo se rechaza, mostrando cuáles cambiaron y su valor nuevo
  para revisar y confirmar de nuevo. Así un conteo nunca borra una venta.
- No se puede contar menos que cero.

### Cómo queda en el historial

Cada movimiento queda en el historial de su variante, como hoy. Los del mismo lote
comparten una referencia (`lote-<n>`), así se puede ver qué entró junto.

## Servidor

- `core/bodega/` (subpaquete nuevo con fachada): `sumar.py`
  (`sumar_a_todas(db, sku_ids, tipo, cantidad, motivo)`), `conteo.py`
  (`ajustar_a_conteo(db, filas, motivo)`), `validar.py` (lo que todo lote cumple),
  `rechazo.py` (`LoteInvalido`, `LoteRechazado`) y `referencia.py`. Validan todo antes de
  escribir y agregan los movimientos a la sesión; la ruta confirma una sola vez. No saben
  nada de HTTP.
- `api/v1/bodega_lote.py`: `POST /admin/catalog/kardex/lote/sumar` y
  `POST /admin/catalog/kardex/lote/conteo`, rutas delgadas con el mismo permiso que el
  resto de la bodega. 400 si el lote está mal pedido; 409 con la lista de variantes que lo
  impiden (bajo cero, o cambiaron durante el conteo). **No van en `catalog_admin.py`**,
  que ya tiene 1.900 líneas.
- Un solo aviso de "invalidar caché" por lote, no uno por variante.
- Tope de 2.000 variantes por lote.

## Pantalla

`LogisticsManager.jsx` crece solo en lo que lo une; las piezas nuevas van en
`inventory/kardex/lote/` (junto a lo demás de la bodega), un archivo cada una:

- `existencias.js` y `enBloque.js`: las reglas sin pantalla (filtro, orden, qué falta
  para confirmar), con sus pruebas en `__tests__/`.
- `FiltroExistencias.jsx`: los cuatro filtros y el número N.
- `useSeleccion.js`: qué está elegido y "elegir las filtradas".
- `BarraSeleccion.jsx`: la barra de abajo.
- `MovimientoEnBloque.jsx`: el panel y sus dos pestañas, `SumarEnBloque.jsx` y
  `ConteoEnBloque.jsx`.
- Estilos en `styles/modules/admin/bodega-lote.css`.

## Pruebas

- Sumar a 3 variantes: 3 movimientos, misma referencia, saldos correctos.
- Merma que deja una bajo cero: no se escribe ninguno, y el 409 nombra la variante.
- Conteo con diferencias: un ajuste por cada variante que cambió y ninguno donde no.
- Conteo con una venta en medio: rechazo completo, sin movimientos, y el 409 trae el
  valor nuevo.
- Conteo negativo y lote vacío: rechazados.

## Fuera de esto

- Stock mínimo por variante con aviso ("quedan 2"). Este diseño lo deja fácil (el filtro
  "Hasta N" es la mitad), pero es otra decisión.
- Cambios de precio o de fotos en bloque: ya existen en Producción.

## Decisiones del usuario (2026-10-27)

1. Los filtros miran **Disponible** (lo que se puede vender).
2. Una merma en bloque es **todo o nada**.
