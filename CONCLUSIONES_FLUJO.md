# Conclusiones del flujo — qué tenemos, qué sobra, qué falta

> Escrito el 2026-08-30, después de recorrer la plataforma. **Todos los números
> de acá salen de consultar la base real**, no de leer el código y suponer.

---

## 1. El recorrido completo, tal como está hoy

> Reescrito el 2026-08-31. Los estados del pedido tenían nombres sin un
> significado decidido — el glosario de la pantalla definía "EN PROCESO" como
> *"contactando al cliente **o armando pedido**"*, dos cosas en una línea.

```
Clienta en la web
   │  agrega al carrito, envía el pedido
   ▼
PEDIDO  ──  NUEVA ── EN CONVERSACIÓN ── CONFIRMADA ── DESPACHADA
                                            │             │
                                            │             └─► libro de stock: SALE −N
                                            │                 (reversible)
                                            └─► sus piezas aparecen como
                                                "pendientes de corte"
                                                      ▼
                                        ORDEN DE CORTE (la arma Paola)
                                        PENDIENTE → EN PROCESO → FINALIZADA
                                          · línea de pedido → marca `cortado`
                                          · línea de stock  → RECEIPT +N
```

**La regla con la que se eligieron los estados:** existe uno sólo si alguien
tiene que declararlo **y** algo depende de él.

| Estado | Lo declara | Qué depende de él |
|---|---|---|
| NUEVA | nadie (automático) | — |
| EN CONVERSACIÓN | Paola | nada, es informativo |
| **CONFIRMADA** | Paola | **habilita cortar**: las piezas entran a pendientes |
| **DESPACHADA** | se marca al **imprimir la etiqueta** | **descuenta el stock** |
| CANCELADA | Paola | libera lo pendiente |

**No existe un estado "en corte"**, a propósito: eso el sistema ya lo sabe
(`CotizacionItem.cortado`, que pone la orden de corte). Pedirle a Paola que
además lo declare abre la puerta a que las dos versiones no coincidan. Se
muestra derivado: *"por cortar"*, *"2 de 3 cortadas"*, *"lista para despachar"*.

**Lo que esto arregló:** el stock salía de bodega cuando la clienta *aceptaba*,
semanas antes de que la prenda existiera. Ahora sale cuando sale de verdad.

**Y el estado nuevo no cuesta un clic:** imprimir la etiqueta *es* el despacho.
Hay un interruptor junto al botón, encendido por omisión, que se puede apagar
para reimprimir una etiqueta sin volver a despachar.

### Cómo se ve la confección, sin declarar nada

La lista de pedidos tiene una columna **Confección** que sale de contar las
piezas cortadas — las marca la orden de corte al finalizar, nadie las declara:

| Se muestra | Cuándo |
|---|---|
| *Por cortar · sin orden todavía* | confirmada y sus piezas no están en ninguna orden |
| *Por cortar* | ya están en una orden, sin finalizar |
| *2 de 3 cortadas* | la orden se finalizó parcialmente, o hay piezas en varias |
| *Lista para despachar* | todas cortadas y todavía en el taller |
| *Cortada* | todas cortadas y ya despachada |
| — | el pedido no llegó a confirmarse, o no tiene piezas con variante |

Sólo cuenta las piezas **con variante real**: un ítem escrito a mano no se puede
cortar, y sumarlo daría un "2 de 3" que nunca llega a 3.

### La pantalla de etiquetas: qué se muestra, y por qué

Traía **todos** los pedidos sin filtrar: nuevos, en conversación y hasta los
cancelados. Eso era desprolijo hasta que imprimir pasó a marcar DESPACHADA —
desde ahí, imprimir la etiqueta de un pedido sin confirmar le habría descontado
el stock a una venta que nadie aceptó.

Tres vistas, y la de por omisión es un **conjunto de trabajo que se vacía**:

| Vista | Qué trae | Para qué |
|---|---|---|
| **Por despachar** (por omisión) | CONFIRMADA | lo que está listo o casi, en el taller |
| Ya despachadas | DESPACHADA | reimprimir una etiqueta |
| Todas | todo | buscar algo puntual |

**Por eso el listado no crece sin techo:** lo que está por despachar deja la
lista al despacharse. La que crece es "Todas", y para eso está el buscador.

Detalles que importan:

- **Se pide al servidor sólo lo de la vista activa** (`?estado=`). Traer todo y
  filtrar en el navegador anda con 14 pedidos y falla en el 101, porque el
  `limit` corta antes de que el filtro llegue a mirar.
- Los contadores de cada vista salen de **una consulta aparte**
  (`/crm/conteo-estados`), sin traer las filas.
- Un pedido que **no se puede despachar no tiene casilla** —no una casilla en
  gris: ninguna— y **dice por qué**: *"Sin confirmar — la clienta todavía no
  acepta"*, *"Cancelada — no se despacha"*. Una fila apagada sin explicación se
  lee como pantalla rota.
- "Todos" selecciona sólo lo despachable. Verificado en la vista Todas: de 14
  filas seleccionó 3.
- Cada fila despachable muestra su **confección** (*"Lista para despachar"*,
  *"2 de 3 cortadas"*): no conviene despachar algo que todavía no se cortó.
- Cambiar de vista **limpia la selección**: dejar seleccionado algo que ya no se
  ve es la forma más fácil de imprimir una etiqueta que nadie quiso.

### Las tres pantallas, conectadas

Antes eran tres islas. Ahora:

- Desde el **pedido** → *Orden de corte N° 2* abre esa orden.
- Desde la **orden** → *Pedido N° 23 · Cliente* abre esa ficha.
- Desde la **ficha del pedido** → planilla del taller, comprobante de la clienta
  y el sistema de etiquetas (esto ya estaba).

Los enlaces van por URL (`?orden=…`, `?pedido=…`) y el parámetro se limpia
después de abrir: recargar la página no vuelve a abrir algo encima de lo que se
esté mirando.

## 2. El flujo se ejecutó entero — 2026-08-31

> Esta sección decía "el flujo nunca se ejecutó entero". **Ya no.** Se corrió de
> punta a punta en el navegador, contra el build de producción, con Allan
> iniciando sesión en el panel.

**Lo que se hizo, y lo que se midió en cada paso:**

| Paso | Resultado |
|---|---|
| Compra desde la tienda, dos prendas | Cotización **N°23**, origen CATALOGO, estado NUEVA |
| Los ítems llegan con su variante | `sku_id` 1604 y 2108 — **primera vez en toda la base**; los 17 anteriores tienen NULL |
| Confirmar el pedido (→ CERRADA_EXITO) | 2 movimientos `SALE −1`, nota "Venta cotización #23" |
| Prenda **con** stock (1604) | 200 → **199** |
| Prenda **sin** stock (2108) | 0 → **−1** ← la deuda, en vivo |
| Las piezas aparecen para cortar | Las dos, con todas sus características |
| Crear orden de corte | Orden **N°2**, estado PENDIENTE |
| Pendiente → En proceso → Finalizada | Transiciones OK, con confirmación previa |
| Al finalizar | Ambos ítems `cortado = True`; **ningún ingreso fantasma**, correcto: son líneas de pedido |
| Saldos finales | 199 y −1, sin movimientos de más |

**Se compró a propósito una prenda con stock y otra sin stock**, para ver en la
misma operación el caso normal y la deuda.

El enganche `sku_id` que se arregló hace unas semanas queda confirmado en
condiciones reales: es lo que hacía que B2 (orden de corte) y B4 (stock)
estuvieran conectados pero sin poder ejecutarse nunca.

### Lo que sigue pendiente de esto

- Los **17 ítems viejos** siguen con `sku_id` NULL. No se pueden recuperar (no
  se sabe qué variante se vendió) y no van a entrar nunca a una orden de corte.
  Se limpian junto con el resto de las cotizaciones en el seed de entrega (D2).
- El libro de movimientos ya no es 100% `ADJUSTMENT`: tiene sus dos primeras
  ventas reales.

### Datos de prueba que quedaron

Cotización **N°23** y orden de corte **N°2**, a nombre de
**"PRUEBA FLUJO BORRAR"** (RUT 11.111.111-1). Se dejaron a propósito para poder
mirarlos. Al borrarlos hay que borrar también sus dos movimientos `SALE`, o el
saldo de 1604 queda en 199 y el de 2108 en −1 sin motivo.

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

### 6.3 DECIDIDO — el negativo se queda: es una deuda

**Allan, 2026-08-30:** *"es una deuda básicamente"*. Esa es la lectura, y con
eso la decisión está tomada: **el saldo negativo es información útil y se
mantiene tal como está.** "−3" significa "debo tres prendas". Es literal, no
inventa movimientos que no ocurrieron, y desde el arreglo de los filtros (6.2)
se ve en el panel.

**No se hace nada más.** En concreto, quedan descartadas:

- *Sumar un ingreso al finalizar la orden de corte* — metía en el libro una
  entrada de una prenda que nunca estuvo en bodega, y ni siquiera resolvía el
  problema, porque el negativo aparece al confirmar, no al finalizar.
- *No descontar de entrada para las prendas hechas a pedido* — dejaría el saldo
  en 0, pero se pierde la deuda, que es justamente lo que Paola quiere ver.

Si algún día esto se replantea, la razón de la decisión es ésta: **el libro sólo
anota hechos reales, y "vendí algo que todavía no hice" es un hecho real.**

### 6.4 Un problema aparte que salió de acá

**La venta está enganchada al evento equivocado.** `CERRADA_EXITO` significa
"el trato se cerró", y hoy dispara la salida de stock. Pero el stock sale de
bodega cuando la prenda **se despacha**, que puede ser semanas después. Mientras
tanto el sistema ya la descontó.

Hoy no hace daño (nada depende del saldo en tiempo real). Empieza a hacerlo el
día que haya un estado de despacho o que la tienda muestre disponibilidad. Si
alguna vez se agrega ese estado, **el gancho de venta se muda ahí**.
