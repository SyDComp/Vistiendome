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
