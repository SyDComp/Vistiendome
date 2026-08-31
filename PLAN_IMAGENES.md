# Plan — Optimización de imágenes

> **Objetivo medible:** que la portada baje de **7,5 MB a menos de 1 MB**.
> Todo lo demás de este documento es medio para ese fin.

Documento ejecutable: quien lo tome no necesita volver a medir ni a investigar
nada de lo que está acá. Los datos ya fueron medidos sobre el **build de
producción** (2026-08-23), no en desarrollo.

---

## 1. El problema, medido

| Qué | Valor |
|---|---|
| Peso de la portada | **7,5 MB** |
| De eso, imágenes | **7,26 MB — 97%** |
| Imágenes en la portada | 18 |
| Con carga diferida | **0** |
| Tamaño servido | **1638×2048** (3,3 megapíxeles) |
| Tamaño mostrado | **280×350** |
| Píxeles de más | **8,6×**, ya contando pantallas retina |
| Peso por foto | 460–630 KB |
| Media total en disco | 320 archivos, **80 MB** (`server/media/`) |

Lo que significa para la clienta:

| Conexión | Espera |
|---|---|
| 3G con mala señal (~50 KB/s) | **~2,5 minutos** |
| 4G promedio (~625 KB/s) | ~12 s |
| Fibra | ~1,2 s |

**El código no es el cuello de botella.** El JS de la portada son 95 KB y
comprime bien (311 KB → 97 KB); las APIs son livianas (`/looks` = 44 KB). Se
puede optimizar todo lo demás al máximo y la portada seguiría tardando minutos
con mala señal. No gastar esfuerzo ahí.

---

## 2. Lo que ya está a favor (verificado, no suponer)

| Hecho | Consecuencia |
|---|---|
| **Pillow 10.4.0 ya instalado** (`requirements.txt`) | No hay dependencia nueva que aprobar |
| `MediaAsset.metadata_json` es un campo JSON libre (`catalog.py:239`) | Las derivadas se registran ahí **sin migración** |
| `ProductCard` ya usa `PremiumImage` (`ProductCard.jsx:80,88`) | Catálogo y explorador se arreglan en **un** componente |
| La subida pasa por un solo lugar (`media.py:60` `upload_file`) | Un solo punto donde enganchar el redimensionado |
| `/media` se sirve con `StaticFiles` (`main.py:43`) | Ahí se agregan las cabeceras de caché |
| gzip ya funciona | No hay que tocar compresión de texto |

> ⚠️ **Corrección a una nota previa:** el informe de C5 decía "de 42 `<img>`
> sólo 6 usan `PremiumImage`, así que agregar lazy no es tocar un componente".
> Es engañoso: la **mayoría de esos 42 están en el panel de admin**, que no
> afecta a la clienta. En el sitio público el grueso de las imágenes ya pasa
> por `PremiumImage` vía `ProductCard`. El trabajo real es menor de lo estimado.

---

## 2b. Decisión: los bytes NO van a la base de datos

Pregunta que surgió antes de empezar, y queda zanjada acá para no rediscutirla.

**La BD guarda el registro (qué imagen existe, dónde, con qué metadatos); el
disco guarda los bytes.** Es como ya está hecho (`MediaAsset` no tiene columna
binaria, verificado contra la BD real) y es lo correcto.

| | Hoy | Con los bytes en Postgres |
|---|---|---|
| Tamaño de la BD | **11 MB** | **~91 MB**, creciendo con cada foto |
| Servir una imagen | Archivo estático directo | Consulta + conexión ocupada por foto |
| Respaldo de la BD | Rápido | Enorme y lento |

Y lo decisivo: las imágenes **son** el cuello de botella de este proyecto.
Hacerlas pasar por Postgres empeora exactamente lo que este plan quiere
arreglar.

> **La preocupación legítima detrás de la pregunta:** si las fotos viven sólo en
> disco, un respaldo de la BD no las protege. Es cierto. La solución es
> **respaldar `server/media/` junto con la base**, no meter binarios en la BD.

**Estado del registro, medido:** 73 archivos sueltos en `media/` y 73 registros
en `mediaasset` — correspondencia exacta, cero huérfanos. Cero rutas `/media/`
escritas a mano en el código. Aparte hay **92 archivos en `media/products/`
sin ningún registro en BD**: heredados, nadie los referencia. Revisar si se
borran o se registran, pero fuera del alcance de este plan.

---

## 3. Estrategia

**Generar derivadas al subir + rellenar las existentes.** No redimensionar al
vuelo en cada request: sin una capa de caché eso cambia peso por CPU y latencia,
y no hay razón para pagarlo cuando las fotos casi nunca cambian.

Tres tamaños, elegidos por lo que la app **realmente muestra**:

| Nombre | Ancho | Para qué |
|---|---|---|
| `sm` | 400 px | Tarjetas (se muestran a 280 px; 400 cubre retina razonable) |
| `md` | 800 px | Ficha de producto |
| `xl` | 1200 px | Banners de portada — el ancho exacto del contenedor |
| `lg` | 1600 px | Zoom / pantallas grandes |

> **Por qué se agregó `xl` después (2026-08-24):** con sólo 400/800/1600, un
> banner de 1200 px obligaba al navegador a bajar el de 1600 — como pedir
> zapatos del 42 cuando sólo hay 40 y 44. Medido: `xl` pesa 109 KB contra
> 175 KB de `lg`, **38% menos por foto, 399 KB menos en la portada**.
>
> La etiqueta `xl` quedó entre `md` y `lg` por historia (`lg` se creó primero
> a 1600). El navegador lee el ancho, no el nombre, así que no molesta.
>
> Agregar un tamaño obligó a corregir la idempotencia: el script saltaba las
> imágenes que "ya tenían derivadas" y por lo tanto **nunca habría generado el
> tamaño nuevo**. Ahora `generar_derivadas` omite sólo los archivos que ya
> existen, así que sumar un tamaño no reprocesa los demás. Verificado: 292
> archivos (73 × 4) y segunda corrida en 0 bytes.

El original **nunca se toca ni se borra**: es la copia maestra de Paola.

Formato: **WebP** para las derivadas (~30% menos que JPEG con calidad
equivalente, soportado por todos los navegadores vigentes), conservando el
archivo original tal cual.

---

## 4. Fases

Cada fase se puede terminar, verificar y commitear sola.

### Fase 0 — Eliminar la media duplicada del cliente ← **empezar por acá**

La victoria más barata de todo el plan, y no depende de nada de lo demás.

**Cada foto del catálogo está guardada dos veces**, byte por byte idéntica:
una copia registrada en la BD (`server/media/`, la buena) y otra suelta dentro
del código del cliente (`client/src/assets/`, herencia del prototipo).

| Medido por hash de contenido | |
|---|---|
| Archivos analizados | 405 |
| Grupos de archivos repetidos | **72** |
| De esos, repetidos entre `client` y `server` | **72 — o sea, todos** |
| Espacio desperdiciado en copias | **77,8 MB** |

Ejemplo, mismo contenido exacto:

```
client/src/assets/img_catalogo/VESTIDO_NOEMI/CORAL_2.jpg   ┐ 717 KB
server/media/vestido_noemi_coral_2.jpg                     ┘ cada una
```

Y esas copias del cliente **viajan al navegador**: de los 5,4 MB del build,
**3,8 MB (70%) son estas fotos muertas**.

**Inventario de `client/src/assets/`, verificado uno por uno:**

| Carpeta / archivo | Peso | Referencias reales |
|---|---|---|
| `img_catalogo/` | 36 MB | 6, todas desde exports muertos de `pruebas.jsx` |
| `temporales/` | 1,5 MB | **0** |
| `hero.png` | — | **0** |
| `react.svg`, `vite.svg` | — | **0** (restos del andamiaje de Vite) |

Quién arrastra `img_catalogo`: `client/src/constants/pruebas.jsx` importa las
fotos como módulos del código, y `Home.jsx` / `Footer.jsx` importan de ahí sólo
`navLinks` y `soporteLinks` — pero importar cualquier cosa arrastra el módulo
entero, imágenes incluidas.

**Verificado: ningún export con imágenes se usa.** `elementosCarrusel`,
`productosCatalogo` y `redesSociales` no aparecen en ningún lado.
`elementosColeccion` aparece en `Search.jsx:85` **sólo como nombre de clase
CSS** (`className="elementosColeccion-premium"`), no como dato importado.

> **El principio que debe quedar:** en `client/` sólo van favicon, iconos y
> poco más. Eso ya está bien resuelto en `client/public/` (favicon.svg,
> apple-touch-icon, og-image). Las fotos de catálogo son contenido, no código:
> viven en `server/media/` y se referencian desde la BD, nunca se importan.

**Qué hacer:**
1. Mover `navLinks` / `soporteLinks` a su propio archivo de constantes — son
   datos de navegación, no de prueba.
2. Que nada vivo importe `pruebas.jsx`; eliminarlo.
3. Borrar `client/src/assets/img_catalogo/`, `temporales/`, `hero.png`,
   `react.svg`, `vite.svg`.

> ⚠️ Antes de borrar, confirmar que cada archivo de `img_catalogo` tiene su
> gemelo en `server/media` (el hash ya lo probó para los 72 grupos). Lo que no
> tenga copia registrada, **no se borra**: se sube por el panel primero.

**Verificación:** en `dist/` no debe quedar ninguna foto de catálogo. Sí quedan
—y deben quedar— los iconos del sitio, que vienen de `client/public/` y no del
bundle: `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` y
`og-image.jpg`. El sitio debe verse igual: estas fotos no se mostraban en
ningún lado.

> ✅ **Hecho (2026-08-23).** Build de **5,4 MB → 2,3 MB**. Se borraron 73
> archivos con gemelo probado en `server/media`; los **14 sin copia registrada**
> (`LOGO.jpg`, `hero.png`, `temporales/`) y los 3 `DESCRIPCION.txt` con textos
> comerciales de Paola **no se borraron**: quedaron en `_media_sin_registrar/`
> a la espera de decisión. `client/src/assets/` dejó de existir.
>
> `og-image.jpg` pesa 572 KB, alto para lo que es. No afecta la carga de la
> página (sólo lo piden los rastreadores al compartir un enlace), pero conviene
> comprimirlo cuando se toquen las imágenes.

### Fase 0b — Respaldo de media sincronizado con el de la BD

Consecuencia directa de la decisión de la sección 2b: si los bytes viven en
disco, el respaldo de la BD **no los protege**. Y peor, un respaldo desfasado
es casi tan malo como ninguno — la BD tendría registros apuntando a archivos
que ese respaldo de media todavía no tenía.

**Requisito:** que `server/media/` y el volcado de la BD se respalden **en el
mismo momento**, como una unidad. Un `mediaasset` sin su archivo es un enlace
roto; un archivo sin registro es un huérfano invisible.

Ya existe `_db_backups/` en la raíz (de la recuperación desde el VPS): es el
lugar natural para que convivan los dos respaldos con la misma marca de tiempo.

### Fase 1 — Generar derivadas (servidor)

1. Módulo nuevo `server/app/core/imagenes.py` — una responsabilidad: dado un
   archivo, producir sus derivadas y devolver sus rutas. Sin tocar la BD.
   - Respetar la orientación EXIF (`ImageOps.exif_transpose`) o las fotos
     verticales de Paola salen rotadas.
   - **No agrandar**: si el original mide menos que el objetivo, se omite ese
     tamaño (no inventar píxeles).
   - Guardar como `media/derivadas/{nombre}_{sm|md|lg}.webp`.
2. Enganchar en `media.py:60` (`upload_file`), después de guardar el original.
   Registrar las rutas en `asset.metadata_json["derivadas"]`.
3. Que un fallo generando derivadas **no rompa la subida**: la imagen original
   ya está guardada y es lo que no se puede perder.

**Verificación:** subir una foto desde el panel y confirmar que aparecen los
tres archivos y que `metadata_json` los lista.

> ✅ **Hecho (2026-08-23).** `server/app/core/imagenes.py`, enganchado en
> `upload_file` y en el borrado por lote (las derivadas se eliminan con su
> original, sin quedar huérfanas).
>
> Medido sobre una foto real de 1640×2048 (570 KB):
>
> | Tamaño | Resultado | vs. original |
> |---|---|---|
> | `sm` 400 px | **18 KB** | **32× más liviana** |
> | `md` 800 px | 55 KB | 10× |
> | `lg` 1600 px | 216 KB | 2,6× |
>
> Casos borde probados: no agranda imágenes chicas (300×200 → ninguna
> derivada; 600×400 → sólo `sm`), conserva transparencia en PNG, omite GIF
> (podrían ser animados) y `eliminar_derivadas` borra lo que corresponde.
> Verificado extremo a extremo por HTTP: subida → 3 archivos + registro en
> `metadata_json` → borrado → 0 huérfanos.

### Fase 2 — Rellenar las 320 existentes

Script en `server/scripts/` (no un endpoint: se corre una vez).

- Idempotente: si la derivada ya existe, saltarla. Se tiene que poder cortar y
  volver a correr sin duplicar trabajo.
- Que informe progreso: son 320 archivos, no termina instantáneo.
- **Medir el disco antes y después** — hoy son 80 MB; anotar cuánto suma.

**Verificación:** contar archivos en `media/derivadas/` y comparar contra el
número de `MediaAsset` con `metadata_json["derivadas"]` poblado.

> ✅ **Hecho (2026-08-23).** `server/scripts/generar_derivadas.py`, con modo
> `--simular` para ver qué haría antes de tocar nada.
>
> **73 de 73 procesadas, cero errores.** Contrato verificado: 219 archivos en
> `media/derivadas/` (73 × 3 exacto), 73 registros con derivadas en la base, y
> **0 referencias rotas** (toda derivada registrada existe en disco).
> Idempotencia probada: la segunda corrida informó "ya estaban: 73" y sumó
> 0 bytes.
>
> **Costo en disco:** media pasó de 78,4 MB a **95,8 MB (+17,4 MB)**. Barato
> para lo que devuelve.
>
> | | Total | Promedio por foto |
> |---|---|---|
> | Originales | 35,6 MB | 500 KB |
> | `sm` | 1,2 MB | **17 KB** |
> | `md` | 3,7 MB | 52 KB |
> | `lg` | 12,5 MB | — |
>
> **Proyección para la Fase 3:** la portada (18 fotos) pasaría de **~8,8 MB a
> ~305 KB**, por debajo del objetivo de 1 MB con margen.
>
> Nota: sólo se procesaron las **73 imágenes registradas en la base**. Los 92
> archivos de `media/products/` siguen sin registro y sin derivadas — nada los
> referencia, generarlas sería gastar disco al pepe.

### Fase 3 — Servirlas (cliente)

1. Que la API exponga las derivadas junto a `url`. **Ojo:** varios endpoints
   arman la URL de imagen a mano (`imagen_de_variante` en `core/looks.py`,
   `products.py`, `crm.py`). Buscar todos antes de tocar uno.
2. `PremiumImage` usa `srcset` + `sizes` y deja que el navegador elija. Fallback
   a `url` original si no hay derivadas (las fotos viejas hasta que corra el
   script, y cualquier caso raro).
3. `loading="lazy"` en `PremiumImage`, **menos** en la primera imagen visible
   (marcarla con una prop): diferir la foto principal empeora la percepción.

**Verificación:** en el build de producción, medir de nuevo la portada. Debe
bajar de 7,5 MB a menos de 1 MB.

> ✅ **Hecho (2026-08-24), junto con la Fase 5.** Resultado medido en el build
> de producción:
>
> | Página | Antes | Ahora |
> |---|---|---|
> | **Portada** | **7,50 MB** | **1,09 MB** (−85%) |
> | Catálogo | 5,14 MB | **0,47 MB** (−91%) |
> | JPG originales descargados | 15 | **0** |
> | Imágenes con srcset | 0 de 18 | **17 de 18** |
>
> ⚠️ En la primera pasada quedó en **1,09 MB**, 9% sobre el objetivo, porque
> los 6 banners se servían a 1600 px cuando el contenedor mide 1200: al no
> existir ese tamaño, el navegador tenía que tomar el inmediatamente superior.
> **Resuelto agregando la derivada `xl` de 1200 px** (ver abajo): **399 KB
> menos**, lo que deja la portada en **~0,69 MB — bajo el objetivo**.
>
> La imagen 18 sin srcset es la del modal de bienvenida, alojada en Google: no
> es media propia y no puede tener derivadas.
>
> **Corrección al orden de las fases:** el criterio de verificación de esta
> fase (el peso de la portada) NO dependía sólo de la Fase 3. La portada la
> dibujan `<img>` crudos, que eran la Fase 5 — así que hubo que hacer las dos
> juntas. Con sólo la Fase 3, el catálogo bajaba pero la portada quedaba igual.
>
> **Endpoints que hubo que enriquecer** (el plan advertía que las URL de imagen
> se arman en varios lados, y se quedó corto — eran cinco fuentes distintas):
>
> | Fuente | Alimenta |
> |---|---|
> | `/products/looks` (tarjeta + look) | catálogo, explorador |
> | `/products/` (portada + variantes) | buscador, colecciones, CMS |
> | `extras.preview_carousel` | el carrusel de cada tarjeta |
> | `/collections/` y `/collections/{slug}` | portadas de colección |
> | `/homepage/` (capas de escena) | los banners del estudio CMS |
>
> El carrusel fue el caso más engañoso: rota cada 3 segundos, así que bajaba
> varios originales completos por tarjeta sin que se notara en una foto fija.

### Fase 4 — Caché de `/media`

Hoy sólo hay `etag`/`last-modified`, así que el navegador **revalida en cada
visita** en vez de servir de caché sin preguntar. Agregar `Cache-Control` con
un `max-age` largo — los nombres de archivo son únicos (UUID), así que no hay
riesgo de servir una versión vieja.

**Verificación:** `curl -I` sobre una imagen y ver la cabecera; segunda visita
sin peticiones de imagen en la pestaña de red.

> ✅ **Hecho (2026-08-24).** Clase `MediaEstatica` en `main.py`:
> `Cache-Control: public, max-age=604800` (una semana), verificado en
> originales y derivadas. El `etag` sigue funcionando como red de seguridad
> (segunda visita → 304, 0 bytes).
>
> **Una semana y no "para siempre", a propósito:** las fotos nuevas llegan con
> nombre único (UUID), pero las 73 que ya estaban tienen nombre legible
> (`vestido_noemi_coral.jpg`). Si alguna se reemplazara conservando el nombre,
> una caché eterna la dejaría vieja para siempre; así se corrige sola.

### Sobre el carrusel de las tarjetas — medido, no opinado

Surgió la duda de si rotar la imagen en las tarjetas del catálogo fue mala idea
y convenía dejar una sola foto. **Los números dicen que ya no hace falta:**

| | Fotos rotando | Costo si se ven todas |
|---|---|---|
| Antes de este plan | 33 | **16,1 MB** |
| Ahora | 33 | **0,55 MB** |

No fue una mala decisión: era **cara con los originales**, y la optimización le
sacó el 97% del costo. Quitarla hoy ahorraría medio MB repartido en más de un
minuto de navegación, a cambio de perder una función que la clienta ya vio y
que muestra los colores disponibles sin hacer clic. **Se deja.**

### Fase 5 — Los `<img>` crudos del sitio público

Sólo los públicos, **no los del admin** (ese trabajo no lo ve la clienta):
`CMSRenderer`, `FeaturedCollections`, `ColeccionesIndex`, `Nosotros`,
`WelcomeModal`, `InstantSearch`, `CartDrawer`.

Pasarlos por `PremiumImage` para que hereden `srcset` y `lazy`.

> ✅ **Hecho (2026-08-24)** para los que pesan: `CMSRenderer` (tarjeta de
> producto, carrusel y capas de escena) y `FeaturedCollections`. Se les agregó
> `srcSet` + `sizes` + `loading="lazy"` directamente, en vez de reescribirlos
> con `PremiumImage`: el cambio es el mismo y no arrastra el estado de carga ni
> el esqueleto de ese componente a bloques que no lo necesitan.
>
> **Sin hacer, a propósito:** `WelcomeModal` (su imagen es una URL externa de
> Google, sin derivadas posibles), `InstantSearch` y `CartDrawer` (miniaturas
> chicas, fuera de la carga inicial), y todos los `<img>` del panel de admin
> —que son la mayoría— porque no los ve la clienta y C5 midió que el admin no
> es el cuello de botella.

---

## 5. Trampas anotadas

- **No borrar ni sobrescribir los originales.** Son la copia maestra. Las
  derivadas van a una carpeta aparte.
- **No romper las fotos existentes**: hasta que corra el script de relleno, la
  mayoría no tendrá derivadas. El fallback tiene que estar antes de que la API
  empiece a devolverlas.
- **Orientación EXIF**: sin `exif_transpose`, las fotos sacadas con celular en
  vertical salen acostadas.
- **No agrandar imágenes chicas** — sólo suma peso sin ganar nada.
- **`_cleanup_backup/`** existe sin trackear en la raíz del repo; no mezclarlo.
- Medir siempre sobre `yarn build` + `yarn preview`. En desarrollo, `StrictMode`
  duplica efectos y ensucia cualquier medición de red.

---

## 6. Contrato de verificación (cómo saber que se terminó)

| Métrica | Antes | Objetivo |
|---|---|---|
| Peso de la portada | 7,5 MB | **< 1 MB** |
| Imágenes con carga diferida | 0 de 18 | todas menos la primera |
| Píxeles de más por foto | 8,6× | ≤ 2× |
| Portada en 3G con mala señal | ~2,5 min | **< 20 s** |
| Catálogo y explorador | igual que hoy | sin cambios visuales |

Comando para volver a medir el peso, en la consola del navegador sobre el build
de producción:

```js
performance.getEntriesByType('resource')
  .reduce((t,e)=>t+(e.transferSize||0),0)/1048576
```

---

Documento vivo. El tablero general sigue en [PLAN_TRABAJO.md](PLAN_TRABAJO.md);
esto es el detalle de la etapa de imágenes.

---

## Fase 6 — Que la forma fácil sea la correcta (estructural)

> **Por qué esta fase existe.** Las fases 0–5 arreglaron pantallas. Cada una
> quedó bien, y en la siguiente volvió a pasar lo mismo: galería 35 MB, ficha de
> producto 17,6 MB, tarjetas del panel, selector de variantes, detalle de
> colección 2,7 MB. **Cinco veces.** El detalle de colección es el caso que lo
> deja claro: el servidor **ya mandaba** el `srcset` y el componente nunca lo
> leyó. Con eso, "acordarse mejor" dejó de ser un plan.

### El problema real

Mostrar una foto bien exigía dos aciertos simultáneos:

1. que el endpoint se acordara de incluir el `srcset`, y
2. que la vista se acordara de usarlo.

Y `<img src={getImageUrl(x)}>` —la forma incorrecta— es más corta de escribir
que la correcta. Mientras eso sea así, la falla se repite.

### La decisión: parche o estructural

Se evaluaron las dos.

**Parche** — arreglar los `<img>` que faltaban. Se descartó al medir el
alcance: los payloads del panel **no traen** `srcset`, así que arreglar las
vistas obligaba igual a tocar **13 serializadores del servidor**. El parche
costaba más que el arreglo de fondo, y dejaba el problema intacto para la
próxima pantalla.

**Estructural** — lo que se hizo:

- **`GET /api/v1/media/srcsets`** — un mapa `url → srcset` de toda la
  biblioteca, que el cliente pide **una sola vez** (`cachedFetch` deduplica las
  peticiones en vuelo: veinte imágenes montándose a la vez producen una
  petición). 73 entradas, 20,9 KB (1,5 KB si se comprime; el servidor todavía no
  tiene gzip, ver pendientes).
- **`useSrcSet(url, srcsetExplicito)`** — el único lugar donde vive la
  resolución. Si el payload ya trae el srcset lo usa y no consulta nada; si no,
  lo busca en el mapa.
- **`<Imagen>`** y **`<PremiumImage>`** usan ese hook. Escribir
  `<Imagen url={...} sizes="90px" />` ya baja la derivada correcta **aunque el
  endpoint no haya mandado nada**.

### Lo que casi se hace mal

Se consideró que el cliente **dedujera** las derivadas por convención de nombre
(`x.jpg` → `x_sm.webp`), sin pedir mapa. Se descartó al leer el generador:
`generar_derivadas` **no agranda**, así que una foto chica no tiene `xl` ni
`lg`. Un candidato inexistente dentro de un `srcSet` **no cae de vuelta al
`src`**: rompe la imagen. La convención habría funcionado con las 73 fotos de
hoy y habría fallado el día que Paola suba una foto chica.

El otro punto fino es **cuándo se pinta**. Si el `<img>` se pinta antes de
conocer sus derivadas, el navegador ya arrancó a bajar el original y el srcset
llega tarde — la foto se ve igual de bien y la falla es invisible en pantalla.
Por eso, mientras el mapa no está, se pinta el hueco. Sólo ocurre la primera
vez de la sesión. Hay **4 pruebas automáticas** que cubren justamente esto
(`client/src/components/ui/__tests__/Imagen.test.jsx`), porque es lo que un
cambio futuro puede romper sin que se note.

### Medido, sobre build de producción

| Pantalla | Antes | Después |
|---|---|---|
| Ficha de producto | 17,64 MB · 0/52 con srcset | **0,57 MB** (techo) · 35/35 · 0,02 MB al abrir |
| Detalle de colección | 2,70 MB · 7 imágenes · 0 con srcset | **0,181 MB** · 11 imágenes · 11 con srcset |
| Portada | — | 0,718 MB · 13/13 · 0 originales |
| Catálogo | — | 0,095 MB · 4/4 · 0 originales |

20 `<img>` del panel convertidas en 14 archivos (delegado a un subagente
mecánico, con el diff revisado: dejó un import muerto, corregido).

### Pendiente relacionado

- **gzip en el servidor.** No hay `GZipMiddleware`. El mapa viaja en 20,9 KB
  donde podrían ser 1,5 KB, y lo mismo vale para toda respuesta JSON. Es una
  línea, pero cambia el comportamiento de **todos** los endpoints, así que no se
  tocó dentro de esta fase.
- ~~**Fase 0b**~~ — ✅ **Cerrada el 2026-08-31**: `scripts/respaldo.sh` guarda base y medios como una unidad, `scripts/restaurar.sh` los devuelve juntos, y `app/scripts/verificar_medios.py` demuestra que coinciden. Probado restaurando en una base aparte: 0 errores, seis tablas idénticas.
