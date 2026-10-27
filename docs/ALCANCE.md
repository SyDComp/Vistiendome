# Alcance de la plataforma Vistiendomé

Qué se entrega, qué cambió respecto de la propuesta original y qué queda como
mejora futura. La propuesta comercial fue el punto de partida; después se
conversaron cambios con la clienta: se agregaron funciones que el negocio
necesitaba (pedidos, taller, pagos, caja) a cambio de otras que se quitaron,
y el plazo se extendió, informado en su momento.

> Los puntos marcados **[completar]** los completa SydComp con lo conversado.
> Los montos y condiciones comerciales viven en la propuesta, no en el repositorio.

## 1. Lo que se entrega

### Sitio para las clientas

- Catálogo con búsqueda que entiende conceptos ("vestido azul rey", "bajo rodilla").
- Filtros por las características que la tienda define (color, manga, largo…).
- Explorador de prendas: una tarjeta por cada forma de verse la prenda.
- Ficha de producto con sus variantes, ofertas y video.
- Selección asistida: la clienta elige talla, color y demás y envía el pedido
  por WhatsApp con la ficha exacta. El pedido también queda en el panel.
- Pedidos especiales y grupales (coristas, dorcas…) desde Contacto.
- Colecciones, portada y páginas de ayuda armadas desde el panel; modal de
  bienvenida, banner superior, carruseles y redes.
- Página "Cambios y Devoluciones" con la política de cambios como dato: el
  plazo y la regla de lo hecho a medida se cambian en el panel y el sitio y
  el comprobante dicen siempre lo mismo.
- Diseño adaptable, de teléfono a pantalla grande.

### Panel de la tienda

**Catálogo y bodega**

- Productos, variantes (cientos en minutos, con especificaciones), categorías
  jerárquicas con su forma de conseguirse (bodega o taller), características
  con su orden y opciones, colecciones, galería de fotos y ofertas.
- Bodega: existencias por variante, historial de movimientos que no se borra,
  ajustes con nota, y lo apartado para pedidos.
- Códigos de barras internos (prefijo 20, siempre válidos) e impresión de
  etiquetas en varios formatos.

**Pedidos (CRM)**

- Clientas registradas (reemplaza el registro de correos del pie de página).
- Ciclo del pedido: se conversa, se confirma (el sistema propone de dónde sale
  cada prenda: bodega o taller, y la fecha comprometida), se produce y sale;
  agregar, quitar y cancelar prendas sin perder nada.
- Historia de cada pedido, ordenada e inmutable.
- Pagos: libro de pagos con abono mínimo, devoluciones, saldo a favor
  verificado y anulaciones con motivo.
- Taller: órdenes de corte, piezas únicas y etiquetas de envío.
- Lo que piden las clientas (propuestas de colores o tallas que no existen).

**Caja del local**

- Pantalla de caja a pantalla completa, en el PC de la tienda, con acceso
  directo.
- Lector de códigos: la prenda se suma sola al escanear.
- Búsqueda que entiende palabras, y selector con tarjetas, páginas de 10 y
  filtros, todo con el teclado.
- Cobro con varios medios de pago y vuelto.
- Comprobante impreso en la térmica de 58 mm, reimprimible.
- Cierre de caja del día: lo cobrado por medio y el efectivo que debería
  haber en el cajón, impreso y reimprimible para cualquier día.

**Estadísticas del sitio**

- Lo más visto, lo más visto y menos consultado, búsquedas frecuentes,
  filtros usados, carritos abandonados y lo que se cierra por WhatsApp.

**Ajustes del negocio**

- Plazos de pedido, abono mínimo, medios de pago, canales y política de cambios.

### Servidor y operación

- Servidor propio (VPS) con despliegue automatizado, base de datos con
  migraciones y respaldo antes de cada despliegue. Ver `OPERACION.md`.

## 2. Lo que cambió respecto de la propuesta

| Propuesta original | Qué pasó |
|---|---|
| Registro para correos masivos en el pie de página | Se quitó. Lo reemplaza el registro de clientas del panel. |
| Mapa de calor | Se quitó. Las estadísticas de búsquedas, interés y carritos se mantienen. |
| CRM "en el futuro" | Se adelantó: pedidos, taller, pagos y caja se entregan ahora. |
| Plazo de implementación | Se extendió por las funciones agregadas. **[completar: fechas acordadas]** |
| **[completar]** | **[completar: otros cambios conversados]** |

## 3. Mejoras futuras (fuera de esta entrega)

- **Informe de ventas completo:** vendido y cobrado por período, comparado
  con el anterior, por canal, producto, talla y color, y descarga a Excel.
- **Sesión de caja con arqueo:** apertura con fondo, retiros y conteo al
  cerrar, con la diferencia registrada. Tiene sentido con cuentas por persona.
- **Cuentas por persona** en el panel y la caja (hoy, una cuenta compartida).
- **Saldo a favor** con código de vale, vencimiento y uso en la caja.
- **Encargos a proveedor** y cambios de talla dentro del pedido.
- **Tienda en línea con pago automático** (la base ya lo permite).

## 4. Pendiente para la entrega

- Limpieza de los datos de prueba (pedidos, ventas de la caja e historia).
- Infraestructura: respaldos fuera del repositorio, firewall y una
  restauración de prueba.
- Repositorio limpio.
- Capacitación: video del panel y visita en la tienda.
