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
