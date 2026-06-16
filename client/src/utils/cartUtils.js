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

export const generateWhatsAppMessage = (cart, userData, total) => {
    const productsList = cart.map(item => {
        return `- *${item.quantity}x* ${item.name} (${item.variantLabel})\n  _Precio: ${formatCurrency(item.price)} c/u_\n  _Link:_ ${item.productUrl}`;
    }).join('\n\n');

    const addressPart = userData.direccion 
        ? `\n*Despacho:* ${userData.direccion}, ${userData.comuna}, ${userData.region}`
        : '';
    
    const contactPart = (userData.email || userData.telefono)
        ? `\n*Contacto:* ${userData.email || ''} ${userData.telefono ? '| ' + userData.telefono : ''}`
        : '';

    const message = `*NUEVO PEDIDO VISTIENDOMÉ* 🌸\n` +
        `---------------------------\n` +
        `*Cliente:* ${userData.nombre}` +
        `${contactPart}` +
        `${addressPart}\n\n` +
        `*Productos:* \n${productsList}\n\n` +
        `---------------------------\n` +
        `*TOTAL ESTIMADO:* ${formatCurrency(total)}\n\n` +
        `_Enviado desde el catálogo digital._`;

    return encodeURIComponent(message);
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
