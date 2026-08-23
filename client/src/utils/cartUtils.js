/**
 * Utilidades para el manejo de datos del carrito y generación de mensajes.
 */

export const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0
    }).format(value);
};

const TITULOS = {
    pedido: 'Nuevo pedido',
    consulta: 'Consulta personal',
    grupo: 'Presupuesto grupal',
    flotante: 'Consulta desde el sitio web',
};

/**
 * Abre WhatsApp con un mensaje precargado, de forma robusta en iOS/iPadOS/Android
 * (evita que Safari bloquee el popup por ocurrir tras código asíncrono).
 * Único punto del sitio que hace esta navegación — no duplicar esta detección.
 */
export const openWhatsApp = (phone, message) => {
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    const isIOSOrIPad = /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
        /Android/i.test(navigator.userAgent);

    let popup = null;
    if (!isIOSOrIPad) {
        popup = window.open(url, '_blank');
    }
    if (isIOSOrIPad || !popup || popup.closed || typeof popup.closed === 'undefined') {
        window.location.href = url;
    }
};

/**
 * Helper ÚNICO para armar el mensaje de WhatsApp en TODO el sitio
 * (consulta desde variante, carrito, y formulario de contacto/grupos).
 * Mantiene un formato consistente sin importar el origen. Devuelve el texto
 * crudo; cada llamador hace encodeURIComponent al construir la URL.
 *
 * @param {object} opts
 * @param {'pedido'|'consulta'|'grupo'} opts.tipo
 * @param {object} [opts.cliente]   { nombre, rut, email, telefono }
 * @param {object} [opts.despacho]  { transporte, direccion, comuna, region, tipo_despacho }
 * @param {object} [opts.grupo]     { tipo, cantidad, evento }
 * @param {Array}  [opts.productos] [{ name, variantLabel, quantity, price, url }]
 * @param {number} [opts.total]
 * @param {string} [opts.mensaje]
 */
const formatVariantAttributes = (p) => {
    const lines = [];
    if (p.selections && typeof p.selections === 'object' && Object.keys(p.selections).length > 0) {
        Object.entries(p.selections).forEach(([key, val]) => {
            if (val) {
                const label = key.charAt(0).toUpperCase() + key.slice(1);
                lines.push(`*${label}:* ${val}`);
            }
        });
    } else if (p.variantLabel && typeof p.variantLabel === 'string') {
        if (p.variantLabel.includes(':')) {
            const parts = p.variantLabel.split(',').map(s => s.trim());
            parts.forEach(part => {
                const [k, ...vParts] = part.split(':');
                if (k && vParts.length > 0) {
                    const label = k.trim().charAt(0).toUpperCase() + k.trim().slice(1);
                    const val = vParts.join(':').trim();
                    lines.push(`*${label}:* ${val}`);
                } else if (part) {
                    lines.push(`*Detalle:* ${part}`);
                }
            });
        } else if (p.variantLabel.includes(' / ')) {
            const parts = p.variantLabel.split(' / ').map(s => s.trim());
            parts.forEach(part => {
                const firstSpace = part.indexOf(' ');
                if (firstSpace !== -1) {
                    const label = part.substring(0, firstSpace).trim();
                    const val = part.substring(firstSpace + 1).trim();
                    const cleanLabel = label.charAt(0).toUpperCase() + label.slice(1);
                    lines.push(`*${cleanLabel}:* ${val}`);
                } else if (part) {
                    lines.push(`*Detalle:* ${part}`);
                }
            });
        } else if (p.variantLabel.trim()) {
            lines.push(`*Detalle:* ${p.variantLabel.trim()}`);
        }
    }
    return lines;
};

// Cada bloque es un grupo de líneas relacionadas (ej: Cliente+RUT+Contacto).
// Los bloques se separan entre sí por una única línea en blanco — nada de
// separadores ASCII, que en WhatsApp se ven como ruido, no como orden.
export const buildWhatsAppMessage = ({ tipo = 'pedido', cliente, despacho, grupo, productos, descuentos, regalos, total, mensaje } = {}) => {
    const subtitulo = tipo === 'grupo' && grupo?.tipo
        ? `${TITULOS.grupo} · ${grupo.tipo}`
        : (TITULOS[tipo] || 'Nuevo mensaje');

    const bloques = [];

    bloques.push([`¡Hola Paola! *${subtitulo}*`]);

    const clienteLines = [];
    if (cliente?.nombre) clienteLines.push(`*Cliente:* ${cliente.nombre}`);
    if (cliente?.rut) clienteLines.push(`*RUT:* ${cliente.rut}`);
    const contacto = [cliente?.email, cliente?.telefono].filter(Boolean).join(' | ');
    if (contacto) clienteLines.push(`*Contacto:* ${contacto}`);
    if (grupo?.cantidad) clienteLines.push(`*Cantidad aprox.:* ${grupo.cantidad}`);
    if (grupo?.evento) clienteLines.push(`*Evento:* ${grupo.evento}`);
    if (clienteLines.length) bloques.push(clienteLines);

    if (despacho) {
        const dest = [despacho.direccion, despacho.comuna, despacho.region].filter(Boolean).join(', ');
        const linea = [despacho.transporte, dest].filter(Boolean).join(' - ');
        if (linea) bloques.push([`*Despacho:* ${linea}`]);
    }

    if (productos && productos.length) {
        const prodLines = [productos.length === 1 ? '*Detalle del producto:*' : `*Productos (${productos.length}):*`];
        productos.forEach((p, index) => {
            if (productos.length > 1) prodLines.push('');
            const prefix = productos.length > 1 ? `*${index + 1}. Producto:* ` : '*Producto:* ';
            prodLines.push(`${prefix}${p.name}`);
            if (p.quantity) prodLines.push(`*Cantidad:* ${p.quantity}`);
            if (p.price != null) prodLines.push(`*Precio:* ${formatCurrency(p.price)}${p.quantity ? ' c/u' : ''}`);
            formatVariantAttributes(p).forEach(line => prodLines.push(line));
            if (p.url) prodLines.push(`*Enlace:* ${p.url}`);
        });
        bloques.push(prodLines);
    }

    // Promociones aplicadas: Paola tiene que ver POR QUÉ el total bajó, y qué
    // regalo le prometió el sitio, o lo descubre recién al armar el pedido.
    if (descuentos && descuentos.length) {
        bloques.push(descuentos.map(d => `*${d.nombre}:* -${formatCurrency(d.monto)}`));
    }
    if (regalos && regalos.length) {
        bloques.push(regalos.map(g => `*Regalo (${g.nombre}):* ${g.texto || 'incluido'}`));
    }

    if (total != null) bloques.push([`*Total estimado:* ${formatCurrency(total)}`]);

    if (mensaje) bloques.push([`*Mensaje:* ${mensaje}`]);

    // Sin firma final: el subtítulo del saludo ya dice de dónde viene el
    // mensaje (Nuevo pedido / Consulta desde el sitio web / etc.) — repetirlo
    // al final era decir lo mismo dos veces.
    return bloques.map(b => b.join('\n')).join('\n\n');
};

export const getCartItemKey = (productId, sku, selections = {}) => {
    // Si no hay SKU, usamos una combinación de ID y atributos ordenados para garantizar unicidad
    if (!sku) {
        const sortedSpecs = Object.entries(selections || {})
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}:${v}`)
            .join('|');
        return `${productId}-spec-${sortedSpecs}`;
    }
    // Si hay SKU, es la identidad definitiva
    return `${productId}-${sku}`;
};
