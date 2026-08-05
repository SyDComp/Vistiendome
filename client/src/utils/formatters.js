/**
 * Utilitarios de formateo de texto para estandarización del catálogo
 */

export const formatChar = (text) => (text || '').trim().toUpperCase();

export const formatOpt = (text) => {
    if (!text) return '';
    // Capitaliza la primera letra de cada palabra y el resto a minúsculas
    return text.trim().toLowerCase().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
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
    return (domain || []).map(item => ({
        ...item,
        value: item.value ? formatOpt(item.value) : item.value
    }));
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