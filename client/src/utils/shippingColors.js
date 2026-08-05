export const DEFAULT_SHIPPING_COLORS = {
    'STARKEN': '#059669',          // Verde esmeralda
    'CORREOS DE CHILE': '#0284c7', // Azul cerúleo
    'RETIRO EN LOCAL': '#d97706',  // Ámbar / Naranja
    'BLUEXPRESS': '#2563eb',       // Azul rey
    'CHILEXPRESS': '#eab308',      // Amarillo dorado
    'FEDEX': '#7c3aed',            // Morado
    'DHL': '#dc2626',              // Rojo
    'OTRO': '#64748b'              // Pizarra
};

export const getShippingColor = (methodName, customColors = {}) => {
    if (!methodName) return '#64748b';
    const upper = methodName.toString().toUpperCase().trim();
    if (customColors && customColors[upper]) {
        return customColors[upper];
    }
    // Check exact or partial match in default map
    if (DEFAULT_SHIPPING_COLORS[upper]) return DEFAULT_SHIPPING_COLORS[upper];
    if (upper.includes('STARKEN')) return '#059669';
    if (upper.includes('CORREOS')) return '#0284c7';
    if (upper.includes('RETIRO') || upper.includes('LOCAL') || upper.includes('SUCURSAL')) return '#d97706';
    if (upper.includes('BLUE')) return '#2563eb';
    if (upper.includes('CHIL')) return '#eab308';
    return '#8f0653'; // magenta de marca por defecto
};
