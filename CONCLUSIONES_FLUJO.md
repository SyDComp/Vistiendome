# Conclusiones del flujo — qué tenemos, qué sobra, qué falta

> Escrito el 2026-08-30, después de recorrer la plataforma. **Todos los números
> de acá salen de consultar la base real**, no de leer el código y suponer.

---

## 1. El recorrido completo, tal como está hoy

```
Clienta en la web
   │  agrega al carrito, envía el pedido
   ▼
COTIZACIÓN  (origen CATALOGO)          ← también se crea a mano: origen MANUAL
   │  estados: NUEVA → EN_PROCESO → CERRADA_EXITO / CERRADA_PERDIDA
   │
   ├─ al pasar a CERRADA_EXITO ──────► libro de stock: SALE −N   (reversible)
   │
   └─ sus ítems, si el pedido está confirmado, aparecen como
      "piezas pendientes de corte"
             ▼
      ORDEN DE CORTE  (entidad propia, correlativo, la arma Paola)
         estados: PENDIENTE → EN_PROCESO → FINALIZADA / CANCELADA
         dos tipos de línea:
           · línea de pedido  → al finalizar marca el ítem como `cortado`
           · línea de stock   → al finalizar suma al inventario: RECEIPT +N
         "repetir" clona la orden como una nueva, dejando historial
```

**El diseño está bien.** Separa lo que de verdad es distinto: vender (CRM) y
producir (taller). Paola manda en la producción, el sistema no le adivina
cuándo terminó de cortar; y a la vez le arma la lista para que no la escriba
de nuevo.

---

## 2. El hallazgo importante: el flujo nunca se ejecutó entero

Esto es lo que hay que saber antes que cualquier otra cosa.

| Medición sobre la base real | Resultado |
|---|---|
| Ítems de cotización | 17 |
| …de esos, **con variante asociada** (`sku_id`) | **0** |
| Cotizaciones en CERRADA_EXITO | 2 |
| Movimientos de venta (`SALE`) que generaron | **0** |
| Movimientos en el libro de stock | 324 |
| …de esos, de tipo `ADJUSTMENT` | **324 (el 100%)** |

Los 17 ítems son **anteriores** al arreglo del `sku_id` (el carrito mandaba a
CRM sin la variante). Sin variante, un ítem no puede descontar stock ni entrar
a una orden de corte: no se sabe *qué* se vendió, sólo *cuánto*.

Consecuencias, en orden de importancia:

1. **Las dos cotizaciones cerradas con éxito no descontaron nada.** No es que
   el enganche falle: no tiene a qué agarrarse.
2. **El libro de stock lo escribe hoy un solo lugar**: el formulario de
   producto. Los otros cuatro escritores (venta, orden de corte, bodega, carga
   inicial) están conectados y probados uno por uno, pero **nunca corrieron
   sobre datos reales**.
3. **La pantalla de órdenes de corte se ve vacía y parece rota**, y en realidad
   está correcta: no hay una sola pieza pendiente que tenga variante. Ya se le
   puso un texto que lo explica (H8), pero la causa de fondo es ésta.

**Lo que falta para cerrar esto no es código: es un pedido de prueba de punta a
punta.** Una compra en la web → confirmarla → armar la orden de corte →
finalizarla, y ver los tres movimientos aparecer. Es el único punto del sistema
que sigue siendo teoría, y se prueba en diez minutos.

---

## 3. Redundancias reales

### 3.1 Hay dos formas de cambiar el stock, y una miente

- **Bodega** registra un movimiento: "ingresaron 5". Queda en el libro, con
  fecha y nota. Es un hecho.
- **El formulario de producto** tiene un campo "stock" donde se escribe el
  número final. Al guardar, el sistema calcula la diferencia contra el saldo y
  mete un `ADJUSTMENT` para cuadrar.

El segundo es cómodo pero borra el porqué: en el libro queda *"ajuste manual
desde edición masiva"* y nada más. **Los 324 movimientos de hoy son de ése.**

No propongo sacarlo — es la forma en que Paola cargó todo y funciona. Pero
conviene decidir cuál manda: si el libro es la verdad, el campo del formulario
debería servir sólo para la carga inicial, y después el stock se mueve por
Bodega. Hoy conviven sin que nadie lo haya decidido.

### 3.2 Bodega existe y no se puede abrir

La ruta funciona, los endpoints están (se implementaron en H4) y la pantalla
carga las 1.049 variantes. **No tiene entrada en el menú**: sólo se llega
escribiendo la URL. O se conecta, o se saca — tenerla a medias es lo peor de
los dos mundos, porque el trabajo ya está hecho y nadie lo usa.

### 3.3 Dos tipos de movimiento declarados que nadie crea

`RESERVATION` y `RETURN` existen en el modelo y el endpoint de Bodega los
acepta, pero ningún flujo los genera. `RESERVATION` en particular sugiere una
idea que no está implementada (reservar al iniciar el checkout). No molestan,
pero prometen algo que el sistema no hace.

### 3.4 `PrintLabel.jsx` — 471 líneas que nadie llama

Duplica lo que hace `ShippingLabelPrinter`. Tiene ruta (`/admin/print/...`) pero
ningún botón lleva ahí. Es el tipo de archivo que dentro de seis meses alguien
edita creyendo que está arreglando algo.

---

## 4. Lo que estaba mal por diseño y ya no

Vale la pena dejarlo escrito, porque son cosas que "funcionaban":

- **Imprimir imprimía el panel entero** — barra lateral incluida. Funcionaba, en
  el sentido de que salía papel.
- **Se mandaba a cortar tela de pedidos sin confirmar.** El filtro era "todo lo
  que no esté perdido", así que entraban las consultas NUEVA. Cortar es
  irreversible y cuesta material.
- **Las fotos.** Cuatro pantallas bajaban los originales: la galería 35 MB, la
  ficha de producto 17,6 MB. Se veían bien; por eso nadie lo notó.

El patrón se repite: **que algo funcione no dice nada sobre si está bien.**

---

## 5. Lo que falta, en orden

1. **Un pedido de prueba completo** (sección 2). Es lo único que falta para que
   el flujo deje de ser teoría. Diez minutos.
2. **Decidir Bodega**: al menú o afuera.
3. **Decidir quién manda en el stock**: el libro o el campo del formulario.
4. **Borrar `PrintLabel.jsx`** si se confirma que no lo usa nadie.
5. **Respaldo de medios en sincronía con el de la base** (Fase 0b del plan de
   imágenes). Hoy las fotos y la base se respaldan por separado; si se
   restaura una sin la otra, quedan registros apuntando a archivos que no están.
6. **Scroll infinito** — pospuesto a propósito, va al final.

---

## 6. Sobre si el flujo es el mejor

Sí, con una salvedad — y la salvedad resultó no ser la que yo creía.

Lo que está bien: separar venta de producción; que la orden de corte sea una
entidad con estados y no un listado que se imprime; que "repetir" deje historial
en vez de sobrescribir; que el libro de movimientos sea la fuente del stock en
vez de una columna que se pisa.

### 6.1 La prenda hecha a pedido — el análisis completo

**Primero, la secuencia real** (verificada en el código, no supuesta):

1. Paola marca la cotización **CERRADA_EXITO**. Para ella eso significa
   "confirmado, a cortar" — es el estado con el que `piezas_pendientes` filtra
   por defecto.
2. En ese mismo instante se dispara la venta: `SALE −1`. **Saldo: −1.**
3. Recién entonces la pieza aparece como pendiente de corte.
4. Se corta, se finaliza la orden → `cortado = true`, y **ningún movimiento**:
   esa prenda va directo a la clienta, nunca fue inventario. Saldo: −1, para
   siempre.

El negativo no es el final del proceso. **Es el principio, y dura toda la
producción.**

**Lo que yo propuse primero, y por qué estaba mal.** La idea era: que finalizar
la orden sume también las líneas de pedido, y el saldo vuelva a cero. Tres
razones para no hacerlo:

- **Mete una mentira en el libro.** Un `RECEIPT` por una prenda que nunca entró
  a bodega registra un hecho que no ocurrió. En el historial de Bodega quedaría
  *"Ingreso: 1 — Orden de corte N°12"* de algo que salió directo a la clienta.
  Un libro de movimientos vale por ser literal; con asientos de cuadratura deja
  de valer.
- **Tapa la sobreventa real.** Hoy el −1 distingue "vendí algo que no tenía y lo
  hice" de "vendí algo que no tenía y nunca lo hice". Las dos terminarían en 0.
- **Y no resuelve nada.** El ingreso se crearía al finalizar; la venta ocurrió al
  confirmar. El negativo existe igual durante toda la producción, que es
  exactamente cuando hay que verlo.

**El supuesto que sostenía todo, y estaba sin verificar:** que un saldo negativo
es un estado de error. Se fue a mirar: **no lo es.** Nada lo trata como error,
nada bloquea una venta, y **la tienda pública no lee el stock en ninguna
pantalla** (no hay "Agotado" ni nada parecido; los únicos consumidores son
pantallas del panel).

Lo único que se rompía con un negativo eran **los filtros del panel**. Y ahí
estaba el defecto de verdad.

### 6.2 El defecto real, encontrado y corregido

El filtro de estado de stock preguntaba `agotado := total == 0`, `bajo_stock :=
total > 0 y <= umbral`, `disponible := total > umbral`. Una variante en negativo
**no coincidía con ninguno de los tres**: desaparecía de la única pantalla que
existe para decirle a Paola qué le falta hacer.

Medido, con una variante forzada a −2:

| | antes (`== 0`) | después (`<= 0`) |
|---|---|---|
| agotado | 726 | 727 |
| bajo stock | 1 | 1 |
| disponible | 321 | 321 |
| **total cubierto** | **1.048 de 1.049** | **1.049 de 1.049** |

Faltaba exactamente una: la que estaba en negativo. Corregido a `<= 0`.

### 6.3 Lo que queda abierto, y no lo decido yo

Con el defecto de los filtros corregido, el negativo ya no esconde nada. Queda
una pregunta de negocio, no de programación, y hay dos lecturas legítimas:

- **(a) El negativo es información útil.** "−3" significa "debo tres prendas".
  Es literal, no inventa movimientos, y ahora se ve en el panel. No se toca nada
  más.
- **(b) El negativo sobra**, porque la orden de corte ya dice qué se debe, con
  más detalle (de quién es el pedido, en qué estado va). En ese caso lo correcto
  **no** es sumar un ingreso falso, sino **no descontar de entrada**: si la
  prenda se hace a pedido, nunca salió de bodega, así que no hubo movimiento.

Hay una variante fina de (b) que es la más honesta contablemente: **descontar
sólo lo que existía**. Si el saldo es 3 y se venden 5, se registra `SALE −3`
(eso sí salió de bodega) y las otras 2 van a producción sin movimiento. El saldo
aterriza en 0, nunca hay negativos y nunca hay ingresos fantasma. Cuesta más
código y depende del orden de los eventos, así que sólo vale la pena si Paola
efectivamente distingue los dos casos.

**La evidencia que zanja esto es una sola pregunta a Paola:**

> Cuando vendes algo que todavía no está hecho, ¿te sirve que el sistema te diga
> *"debes 3"*, o con la orden de corte te basta?

Si le sirve → (a), y ya está listo. Si le basta la orden → (b).

### 6.4 Un problema aparte que salió de acá

**La venta está enganchada al evento equivocado.** `CERRADA_EXITO` significa
"el trato se cerró", y hoy dispara la salida de stock. Pero el stock sale de
bodega cuando la prenda **se despacha**, que puede ser semanas después. Mientras
tanto el sistema ya la descontó.

Hoy no hace daño (nada depende del saldo en tiempo real). Empieza a hacerlo el
día que haya un estado de despacho o que la tienda muestre disponibilidad. Si
alguna vez se agrega ese estado, **el gancho de venta se muda ahí**.
