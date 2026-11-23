/**
 * Utilitarios de formateo de texto para estandarización del catálogo
 */

export const formatChar = (text) => (text || '').trim().toUpperCase();

const SIGLAS = new Set(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'CM', 'MM', 'KG', 'ML', 'UN', 'PAR']);

/**
 * Mayúscula Cada Palabra, con la misma regla que el servidor
 * (catalog_admin.normalize_opt): las siglas de talla y medida, y toda palabra
 * con números, van en mayúscula. Antes "5XL" quedaba "5xl" en el formulario
 * hasta guardar (reportado 2026-11-23).
 */
export const formatOpt = (text) => {
    if (!text) return '';
    const limpio = text.trim();
    if (SIGLAS.has(limpio.toUpperCase())) return limpio.toUpperCase();
    return limpio.toLowerCase().split(/\s+/).map(p =>
        /\d/.test(p) ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1)
    ).join(' ');
};

/**
 * Normaliza un objeto de configuración de SKU (llaves y valores)
 */
export const normalizeConfig = (config) => {
    const normalized = {};
    Object.entries(config || {}).forEach(([key, value]) => {
        normalized[formatChar(key)] = formatOpt(value);
    });
    return normalized;
};

/**
 * Normaliza el dominio de una característica
 */
export const normalizeDomain = (domain) => {
    return (domain || []).map(item => {
        // Las opciones del sistema (vOS) no se tocan: son inmutables y el
        // servidor las compara por valor exacto. `formatOpt` las rompía —
        // baja todo a minúsculas y sólo capitaliza la primera letra, así que
        // "XS" salía como "Xs" y "XL" como "Xl". El backend entonces creía
        // que se habían eliminado y devolvía 403, dejando TALLA imposible de
        // guardar desde el panel.
        if (item.is_system) return item;
        return {
            ...item,
            value: item.value ? formatOpt(item.value) : item.value
        };
    });
};

export const formatRUT = (rut) => {
    if (!rut) return '';
    const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
    if (clean.length < 2) return clean;
    const dv = clean.slice(-1);
    let numbers = clean.slice(0, -1);
    numbers = numbers.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${numbers}-${dv}`;
};