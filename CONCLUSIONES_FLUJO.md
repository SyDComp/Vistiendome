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

Sí, con una salvedad.

Lo que está bien: separar venta de producción; que la orden de corte sea una
entidad con estados y no un listado que se imprime; que "repetir" deje
historial en vez de sobrescribir; que el libro de movimientos sea la fuente del
stock en vez de una columna que se pisa.

La salvedad es **la prenda hecha a pedido**. Hoy, si una clienta compra algo que
no está en stock: la venta descuenta (`SALE −1`) y la orden de corte, para las
líneas que vienen de un pedido, **no suma nada** — sólo marca la pieza como
cortada, porque esa prenda se va derecho a la clienta y nunca fue inventario.

Es defendible: nunca hubo stock, así que no hay nada que sumar. Pero el saldo
de esa variante queda en −1 y se lee como "debo una prenda", cuando en realidad
la deuda ya se pagó al cortarla. No lo toqué porque **es una decisión de
negocio, no de programación**, y hay dos respuestas razonables:

- **(a)** Dejarlo así: el negativo es la señal de "esto se hizo a pedido".
- **(b)** Que finalizar la orden sume también las líneas de pedido, y el saldo
  vuelva a cero: el libro refleja "se cortó una y se fue una".

Hoy no se nota —hay 0 variantes con saldo negativo, porque todavía no hay
ninguna venta con variante asociada—, pero se va a notar con el primer pedido
real. Conviene decidirlo antes de que pase, no después.
