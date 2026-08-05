/**
 * Explorador: explota los productos en sus variantes y muestra una tarjeta por
 * "look" distinto (imagen distinta). Las variantes que comparten la misma foto
 * (típicamente las tallas de un mismo color) se colapsan en una sola tarjeta.
 * Si una variante no tiene foto propia, se colapsa por color; si tampoco hay
 * color, cada SKU queda como tarjeta.
 *
 * @param {Array} products  Productos base (con .variants del serializer público).
 * @param {object} appliedSpecs Filtros de especificación activos {Atributo: [valores]}.
 * @returns {Array} Pseudo-productos compatibles con ProductGrid (uno por look).
 */
export const flattenVariantsByLook = (products, appliedSpecs = {}) => {
    if (!products?.length) return [];

    const cards = [];
    const seen = new Set();
    const hasSpecs = appliedSpecs && Object.keys(appliedSpecs).length > 0;

    const matchesSpecs = (variant) => {
        if (!hasSpecs) return true;
        return Object.entries(appliedSpecs).every(([key, values]) => {
            if (!values || values.length === 0) return true;
            const lk = String(key).toLowerCase().trim();
            const lv = values.map(v => String(v).toLowerCase().trim());
            return variant.config && Object.entries(variant.config).some(
                ([ck, cv]) => ck.toLowerCase().trim() === lk && lv.includes(String(cv).toLowerCase().trim())
            );
        });
    };

    const getColor = (config) => config?.COLOR || config?.Color || config?.color || null;

    products.forEach(product => {
        const variants = product.variants || [];

        if (!variants.length) {
            const key = `${product.id}::base`;
            if (!seen.has(key)) {
                seen.add(key);
                cards.push({ ...product, id: `${product.id}-base`, baseProductId: product.id });
            }
            return;
        }

        variants.forEach(variant => {
            if (!matchesSpecs(variant)) return;

            const color = getColor(variant.config);
            const lookKey = variant.image
                ? `${product.id}::img::${variant.image}`
                : (color ? `${product.id}::col::${String(color).toLowerCase().trim()}` : `${product.id}::sku::${variant.sku}`);

            if (seen.has(lookKey)) return;
            seen.add(lookKey);

            // Descriptor del look: color si existe; si no, el primer atributo que no sea talla
            const descriptor = color || Object.entries(variant.config || {})
                .filter(([k]) => !['talla', 'size'].includes(k.toLowerCase()))
                .map(([, v]) => v)[0] || '';

            cards.push({
                id: `${product.id}-${variant.sku}`,
                baseProductId: product.id,
                slug: product.slug,
                name: descriptor ? `${product.name} · ${descriptor}` : product.name,
                price: variant.price ?? product.price,
                original_price: variant.original_price,
                on_sale: variant.on_sale,
                image: variant.image || product.image,
                extras: {}, // sin carrusel: la tarjeta muestra solo la foto de ESTA variante
                sku: variant.sku,
                config: variant.config,
            });
        });
    });

    return cards;
};
