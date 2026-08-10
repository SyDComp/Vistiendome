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

export const buildWhatsAppMessage = ({ tipo = 'pedido', cliente, despacho, grupo, productos, total, mensaje } = {}) => {
    const L = [];
    const subtitulo = tipo === 'grupo' && grupo?.tipo
        ? `${TITULOS.grupo} · ${grupo.tipo}`
        : (TITULOS[tipo] || 'Nuevo mensaje');

    L.push(`¡Hola Paola! 🌸 *${subtitulo}*`);
    L.push('──────────────');

    if (cliente?.nombre) L.push(`*Cliente:* ${cliente.nombre}`);
    if (cliente?.rut) L.push(`*RUT:* ${cliente.rut}`);
    const contacto = [cliente?.email, cliente?.telefono].filter(Boolean).join(' | ');
    if (contacto) L.push(`*Contacto:* ${contacto}`);

    if (grupo?.cantidad) L.push(`*Cantidad aprox.:* ${grupo.cantidad}`);
    if (grupo?.evento) L.push(`*Evento:* ${grupo.evento}`);

    if (despacho) {
        const dest = [despacho.direccion, despacho.comuna, despacho.region].filter(Boolean).join(', ');
        const linea = [despacho.transporte, dest].filter(Boolean).join(' - ');
        if (linea) L.push(`*Despacho:* ${linea}`);
    }

    if (productos && productos.length) {
        L.push('');
        if (productos.length === 1) {
            L.push('*Detalle del producto:*');
        } else {
            L.push(`*Productos (${productos.length}):*`);
        }
        
        productos.forEach((p, index) => {
            if (index > 0 || productos.length > 1) {
                L.push('');
            }
            const prefix = productos.length > 1 ? `*${index + 1}. Producto:* ` : '*Producto:* ';
            L.push(`${prefix}${p.name}`);
            if (p.quantity) L.push(`*Cantidad:* ${p.quantity}`);
            if (p.price != null) L.push(`*Precio:* ${formatCurrency(p.price)}${p.quantity ? ' c/u' : ''}`);
            
            const variantLines = formatVariantAttributes(p);
            variantLines.forEach(line => L.push(line));
            
            if (p.url) L.push(`*Enlace:* ${p.url}`);
        });
    }

    if (total != null) {
        L.push('');
        L.push(`*Total estimado:* ${formatCurrency(total)}`);
    }

    if (mensaje) {
        L.push('');
        L.push(`*Mensaje:* ${mensaje}`);
    }

    L.push('──────────────');
    L.push('_Enviado desde el catálogo digital_ ✨');
    return L.join('\n');
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
