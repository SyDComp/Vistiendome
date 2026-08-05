// Devuelve true si el color de fondo es oscuro (para decidir texto/íconos claros).
export const isDarkColor = (hex) => {
    if (!hex || typeof hex !== 'string') return false;
    let c = hex.replace('#', '').trim();
    if (c.length === 3) c = c.split('').map(ch => ch + ch).join('');
    if (c.length !== 6) return false;
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    // Luminancia relativa percibida (0-255). < 140 => fondo oscuro.
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance < 140;
};

// Color de contraste (texto/ícono) para un fondo dado.
export const contrastColor = (bgHex, dark = '#1e293b', light = '#ffffff') =>
    isDarkColor(bgHex) ? light : dark;
