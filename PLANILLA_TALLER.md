# La planilla del taller — qué copiamos del papel y qué cambiamos

> Referencia: la planilla que Paola usa hoy, en papel. Foto del 2026-08-31.
> No se hizo una réplica: se tomó lo que el papel hace bien y se corrigió lo
> que hace mal.

## Cómo es el papel

Un bloque por clienta. Encabezado con **Fecha** y **N° pedido** (el mismo número
para todas: es un pedido de grupo, y cada bloque va numerado 1, 2, 3…). Debajo,
una tabla:

```
PRODUCTO              CANT  TALLA  COLOR       MANGAS        LARGO
Jumper Lanilla              XL     Palo Rosa   Manga larga   Bajo rodilla
Blazer Lanilla              XL     Marengo     Manga larga
```

Filas vacías al final para escribir a mano. Una celda resaltada en amarillo
cuando hay una excepción.

## Lo que el papel hace bien — y se conserva

1. **Una columna por característica.** Se lee bajando la vista por la columna
   TALLA, no leyendo una frase por fila. Esto es lo que la pantalla hacía peor
   que el papel: tenía todo apilado en una celda
   (`CUELLO: En V · MANGAS: Larga · COLOR: Negro · MATERIAL: Tela Sofia · TALLA: XS`).
2. **Posición fija.** La talla siempre en el mismo lugar. No hay que releer el
   encabezado en cada bloque.
3. **Filas vacías para anotar a mano.** El papel es un documento de trabajo, se
   escribe encima. Se mantienen dos por modelo.
4. **Agrupado.** El papel agrupa por clienta; nosotros agrupamos por modelo en
   la orden de corte, que es lo que se necesita al cortar. Ver abajo.
5. **Una marca para lo hecho.** El papel usa el amarillo; acá hay una casilla
   para tildar.

## Lo que el papel hace mal — y se corrige

1. **Sus columnas son fijas y sirven para un tipo de prenda.** TALLA, COLOR,
   MANGAS, LARGO alcanzan para un vestido. El *vestido perla* tiene CUELLO,
   MANGAS, MATERIAL, TALLA y ESTAMPADO: **cinco características para cuatro
   columnas**. Lo que no cabe, se pierde o se anota al margen.
   → Acá **las columnas salen de los datos**. Como cada modelo trae su propio
   juego, se agrupa por modelo y cada tabla lleva exactamente sus columnas.
   Denso, sin celdas vacías, y coincide con cómo se corta: un modelo a la vez.
2. **No hay totales.** La pregunta del taller es "¿cuántas corto?", y en el
   papel hay que contarlas a mano cruzando bloques.
   → Total por modelo, y total general al pie.
3. **La repetición es invisible.** Si tres clientas piden lo mismo, son tres
   filas en tres bloques distintos, cuando al taller le conviene cortarlas
   juntas. → Al agrupar por modelo quedan una debajo de otra.
4. **No dice qué está hecho.** → La orden tiene estados, y cada pieza queda
   marcada como cortada al finalizar.
5. **Se copia a mano**, con los errores de transcripción que eso trae.

## Quién decide qué columnas salen

Las columnas salen de los datos, pero **cuáles de esas salen impresas lo decide
Paola**, característica por característica, con la propiedad
**"Sale en la orden de corte"** (Catálogo › Características).

La costurera necesita talla y color; el material o el tipo de cuello pueden
sobrarle, y una columna de más en una hoja de taller es ruido. Antes salían
todas y nadie podía decidirlo.

Detalles que importan:

- **Arranca en SÍ.** Quitar una columna es una decisión; que falte por omisión
  sería un olvido, y un olvido acá se descubre cuando la prenda ya está mal
  cortada.
- Se ve **en la tabla de características**, no sólo dentro de la ficha: la
  pregunta es "cuáles salen", en plural, y se responde mirando la lista.
- Si la lista no se puede cargar, **salen todas**. Una columna de más molesta;
  una hoja sin la talla manda a cortar mal.
- Afecta la orden de corte —vista, formulario e impresión—. La planilla de
  pedido y el comprobante de la clienta muestran todo, porque son otro
  documento.

## La abstracción, en una frase

Las características **son datos que configura la clienta**, así que las columnas
tienen que salir de los datos y no estar escritas en el diseño. Todo lo demás
se sigue de ahí.

## Las dos vistas — y por qué hacen falta las dos

Son dos preguntas distintas sobre los mismos datos, y el papel las mezcla en una
sola hoja:

| | Agrupa por | Para qué | El producto es |
|---|---|---|---|
| **Por modelo** | modelo | cortar: se tiende la tela de un modelo y salen todas sus tallas juntas | el título del grupo |
| **Por clienta** | clienta | armar y entregar: es lo que hace el papel | **una columna más** |

La orden de corte tiene las dos, con un selector arriba, y **se imprime la que
esté elegida**. No hay que decidir cuál es "la correcta": dependen de qué se
está haciendo en ese momento.

### El costo de la vista por clienta

Una clienta compra varios modelos, y cada modelo trae su propio juego de
características. Las columnas pasan a ser **la unión** de todos, así que
aparecen celdas `—` donde no aplica: el tapado no tiene ESTAMPADO, el vestido
perla no tiene COLOR.

Es inevitable —no se puede alinear en una fila lo que no comparte el mismo juego
de características— y por eso se marca con `—` en vez de dejarlo en blanco: una
celda vacía no distingue "no aplica" de "se les olvidó".

### El ancho de la hoja (tamaño carta), medido

Carta son **215,9 mm**. Con `@page margin: 12mm` quedan **191,9 mm útiles**.

Medido sobre la hoja real, en la vista por clienta: 9 columnas (casilla +
Producto + 6 características + Cant.) ocupan **exactamente 191,9 mm**, sin
desbordar. Ése es el techo: **con más de 6 o 7 características la hoja se pasa**,
y ahí es donde sirve la propiedad "Sale en la orden de corte" para recortarla.

> Defecto que había y se corrigió: el documento apilaba `@page margin: 10mm`
> **con** un `padding: 12mm` del body. Los dos se suman, así que la hoja usaba
> 171,9 de 215,9 mm — tiraba el 20% del ancho sin que se notara.

## Dónde vive esto

| Pieza | Responsabilidad |
|---|---|
| `client/src/utils/prendas.js` | Decide la estructura: qué grupos y qué columnas. No pinta |
| `client/src/components/interface/admin/crm/TablaPrendas.jsx` | La pinta en pantalla |
| `client/src/components/interface/admin/crm/imprimirOrdenCorte.js` | La pinta en papel |

La estructura la decide **un solo lugar**, para que la pantalla y el papel no se
separen con el primer cambio. Lo usan la orden de corte (vista, formulario e
impresión) y la planilla/comprobante de pedido.

## Lo que quedó pendiente

- **Una vista por clienta** ya está descrita abajo; con la propiedad nueva, esa
  vista podría querer su propio juego de columnas (a la clienta le importa el
  material; a la costurera quizá no).
- **El orden de las columnas** usa una lista corta (talla, color, estampado
  primero). Es sólo presentación, pero lo correcto es un campo `orden` en la
  característica que Paola arrastre desde el panel. Hoy ese campo no existe.
- **El explorador de variantes** (`SelectorVariantes`) todavía muestra los
  valores corridos: `En V · Larga · Negro · Tela Sofia · XS`. Es un selector,
  no un documento de trabajo, pero tiene el mismo problema de lectura y sería el
  siguiente en recibir el mismo trato.
- **Vista por clienta de una orden de corte de grupo.** Si una orden junta
  piezas de varias clientas, hoy se agrupa por modelo (para cortar). Falta el
  otro corte —por clienta— para armar los paquetes. Es la vista que el papel ya
  tiene.
- **Modo oscuro**: el panel no lo tiene en ninguna pantalla, así que no se
  agregó sólo acá.
