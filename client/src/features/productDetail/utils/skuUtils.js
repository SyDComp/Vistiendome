/**
 * Genera un código EAN-13 a partir de un string de entrada.
 * Usa un hash para garantizar determinismo.
 */
export const generateEAN13 = (text) => {
    if (!text) return '';
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash = hash & hash;
    }
    let hashStr = Math.abs(hash).toString().padStart(12, '0');
    while (hashStr.length < 12) hashStr += hashStr;
    hashStr = hashStr.substring(0, 12);
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(hashStr[i]) * (i % 2 === 0 ? 1 : 3);
    return hashStr + ((10 - (sum % 10)) % 10);
};

/**
 * Formatea un SKU para mostrarlo en la UI.
 */
export const formatSku = (skuStr) => {
    if (!skuStr) return '';
    let clean = skuStr;
    if (clean.toLowerCase().startsWith('pr-')) {
        clean = clean.slice(3);
    }
    return clean.replace(/_/g, ' ').replace(/-/g, ' • ');
};
