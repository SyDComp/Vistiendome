const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const normalize = (s) => stripAccents(String(s || '').toLowerCase().trim());

/**
 * Busca productos por nombre, categoría o cualquier valor de variante (talla,
 * color, o cualquier característica que se defina en el catálogo — no hay
 * nada hardcodeado, itera lo que venga en variant.config). Tokeniza el
 * término de búsqueda: "vestido rojo" encuentra un vestido con variante roja
 * aunque "vestido" y "rojo" vivan en campos distintos ("rojo vestido" también
 * matchea, el orden no importa). Ignora acentos.
 *
 * Único punto del sitio que hace este matching — InstantSearch (dropdown) y
 * Search (página de resultados) llaman a esta misma función.
 */
export const searchProducts = (products, query) => {
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    if (!tokens.length) return [];

    const results = [];

    (products || []).forEach(product => {
        const productHaystack = normalize(`${product.name} ${product.category || ''}`);
        const nameMatch = tokens.every(t => productHaystack.includes(t));

        if (nameMatch) {
            results.push({ ...product, display_name: product.name, matchType: 'product' });
        }

        (product.variants || []).forEach(variant => {
            const configValues = Object.values(variant.config || {}).map(v => normalize(v));
            const variantHaystack = `${productHaystack} ${configValues.join(' ')}`;
            if (!tokens.every(t => variantHaystack.includes(t))) return;

            const variantLabel = Object.values(variant.config || {}).join(' - ');
            // Excluye la talla del "grupo" para que colores/estilos distintos del
            // mismo producto (Azul Marino vs. Azul Rey) salgan como resultados separados.
            const variantGroup = Object.entries(variant.config || {})
                .filter(([k]) => !/talla|size|medida/i.test(k))
                .map(([, v]) => v)
                .join(' - ') || variant.sku;

            results.push({
                ...product,
                id: `${product.id}-${variant.sku}`,
                display_name: `${product.name} - ${variantLabel}`,
                image: variant.image || product.image,
                price: variant.price,
                sku: variant.sku,
                variant_group: variantGroup,
                matchType: 'variant'
            });
        });
    });

    // Match de nombre/categoría antes que match interno de variante (sort estable en JS moderno).
    results.sort((a, b) => (a.matchType === 'product' ? 0 : 1) - (b.matchType === 'product' ? 0 : 1));

    const unique = [];
    const seen = new Set();
    results.forEach(r => {
        const key = r.variant_group ? `${r.slug}::${r.variant_group}` : r.slug;
        if (!seen.has(key)) {
            unique.push(r);
            seen.add(key);
        }
    });

    return unique;
};
