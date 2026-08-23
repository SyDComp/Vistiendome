/**
 * Promociones configurables (lleva X paga Y, descuento en unidad repetida,
 * regalo por compra).
 *
 * "Lleva 3 paga 2" y "segunda unidad al 50%" son la MISMA regla: por cada
 * `lleva` unidades, las (`lleva` - `paga`) más baratas reciben `descuento`%.
 * Con descuento=100 la unidad va gratis (3x2 clásico); con 50, va a mitad de
 * precio. Por eso no hay dos tipos: hay uno, en las palabras que ella usa.
 *
 * El regalo sí es otro mecanismo — no descuenta lo que hay en el carrito,
 * agrega algo. Por eso es un tipo aparte.
 *
 * Configuración global en ajustes (clave `promotions`), igual que los tramos
 * de precio. Nada hardcodeado: productos, cantidades, porcentaje y vigencia
 * son datos que Paola define desde el panel.
 */

/** ¿La promoción está vigente hoy? Sin fechas, siempre lo está. */
export const enVigencia = (promo, ahora = new Date()) => {
    if (promo?.desde) {
        const inicio = new Date(promo.desde);
        inicio.setHours(0, 0, 0, 0);
        if (ahora < inicio) return false;
    }
    if (promo?.hasta) {
        // "válida hasta el 31" incluye el 31 completo, no hasta su medianoche.
        const fin = new Date(promo.hasta);
        fin.setHours(23, 59, 59, 999);
        if (ahora > fin) return false;
    }
    return true;
};

/** Lista de productos vacía = aplica a todo el catálogo. */
const enAlcance = (item, promo) => {
    const ids = promo?.productos || [];
    if (!ids.length) return true;
    return ids.map(String).includes(String(item.productId));
};

const precioEfectivo = (item) => item.precioTramo ?? item.price ?? 0;

/**
 * Evalúa las promociones sobre el carrito.
 *
 * @returns { descuentos: [{nombre, monto, unidades}], regalos: [{nombre, texto}] }
 *          Los descuentos son a nivel carrito (no por línea): "lleva 3 paga 2"
 *          descuenta unidades de un pool, no de una línea en particular, así
 *          que atribuirlo a una fila sería inventar precisión que no existe.
 */
export const evaluarPromociones = (cart, config, ahora = new Date()) => {
    const descuentos = [];
    const regalos = [];
    const promos = (config?.promos || []).filter(p => p?.active !== false && enVigencia(p, ahora));
    if (!cart?.length || !promos.length) return { descuentos, regalos };

    for (const promo of promos) {
        // Por defecto una promoción NO se acumula con el precio por cantidad
        // (mayorista/iglesia): si no, un pedido grande se lleva los dos
        // descuentos encima y el margen desaparece sin que nadie lo note.
        const elegibles = cart.filter(i =>
            enAlcance(i, promo) && (promo.combinable === true || !i.tramoAplicado)
        );
        if (!elegibles.length) continue;

        const unidadesTotales = elegibles.reduce((a, i) => a + (i.quantity || 0), 0);
        const montoTotal = elegibles.reduce((a, i) => a + precioEfectivo(i) * (i.quantity || 0), 0);

        if (promo.type === 'regalo') {
            const minUnidades = Number(promo.min_unidades) || 0;
            const minMonto = Number(promo.min_monto) || 0;
            // Sin ninguna condición no es una promoción, es un regalo a todos:
            // se ignora para no regalar por un formulario a medio llenar.
            if (!minUnidades && !minMonto) continue;
            if (minUnidades && unidadesTotales < minUnidades) continue;
            if (minMonto && montoTotal < minMonto) continue;
            regalos.push({ nombre: promo.name || 'Regalo', texto: promo.regalo_texto || '' });
            continue;
        }

        const lleva = Number(promo.lleva) || 0;
        const paga = Number(promo.paga) || 0;
        const pct = Number(promo.descuento);
        const porcentaje = Number.isFinite(pct) && pct > 0 ? Math.min(pct, 100) : 0;
        const beneficiadas = lleva - paga;
        if (lleva < 2 || beneficiadas < 1 || !porcentaje) continue;
        if (unidadesTotales < lleva) continue;

        // Se expande a unidades sueltas y se descuenta sobre las MÁS BARATAS:
        // es lo que espera la clienta y lo que hace cualquier tienda.
        const precios = [];
        elegibles.forEach(i => {
            const p = precioEfectivo(i);
            for (let k = 0; k < (i.quantity || 0); k++) precios.push(p);
        });
        precios.sort((a, b) => a - b);

        const grupos = Math.floor(precios.length / lleva);
        const cuantas = Math.min(grupos * beneficiadas, precios.length);
        let monto = 0;
        for (let k = 0; k < cuantas; k++) monto += Math.round(precios[k] * porcentaje / 100);

        if (monto > 0) {
            descuentos.push({ nombre: promo.name || 'Promoción', monto, unidades: cuantas });
        }
    }

    return { descuentos, regalos };
};
