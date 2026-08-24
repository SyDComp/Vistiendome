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

## 3. Estrategia

**Generar derivadas al subir + rellenar las existentes.** No redimensionar al
vuelo en cada request: sin una capa de caché eso cambia peso por CPU y latencia,
y no hay razón para pagarlo cuando las fotos casi nunca cambian.

Tres tamaños, elegidos por lo que la app **realmente muestra**:

| Nombre | Ancho | Para qué |
|---|---|---|
| `sm` | 400 px | Tarjetas (se muestran a 280 px; 400 cubre retina razonable) |
| `md` | 800 px | Ficha de producto |
| `lg` | 1600 px | Zoom / pantallas grandes |

El original **nunca se toca ni se borra**: es la copia maestra de Paola.

Formato: **WebP** para las derivadas (~30% menos que JPEG con calidad
equivalente, soportado por todos los navegadores vigentes), conservando el
archivo original tal cual.

---

## 4. Fases

Cada fase se puede terminar, verificar y commitear sola.

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

### Fase 2 — Rellenar las 320 existentes

Script en `server/scripts/` (no un endpoint: se corre una vez).

- Idempotente: si la derivada ya existe, saltarla. Se tiene que poder cortar y
  volver a correr sin duplicar trabajo.
- Que informe progreso: son 320 archivos, no termina instantáneo.
- **Medir el disco antes y después** — hoy son 80 MB; anotar cuánto suma.

**Verificación:** contar archivos en `media/derivadas/` y comparar contra el
número de `MediaAsset` con `metadata_json["derivadas"]` poblado.

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

### Fase 4 — Caché de `/media`

Hoy sólo hay `etag`/`last-modified`, así que el navegador **revalida en cada
visita** en vez de servir de caché sin preguntar. Agregar `Cache-Control` con
un `max-age` largo — los nombres de archivo son únicos (UUID), así que no hay
riesgo de servir una versión vieja.

**Verificación:** `curl -I` sobre una imagen y ver la cabecera; segunda visita
sin peticiones de imagen en la pestaña de red.

### Fase 5 — Los `<img>` crudos del sitio público

Sólo los públicos, **no los del admin** (ese trabajo no lo ve la clienta):
`CMSRenderer`, `FeaturedCollections`, `ColeccionesIndex`, `Nosotros`,
`WelcomeModal`, `InstantSearch`, `CartDrawer`.

Pasarlos por `PremiumImage` para que hereden `srcset` y `lazy`.

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
