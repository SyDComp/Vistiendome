const stripAccents = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const normalize = (s) => stripAccents(String(s || '').toLowerCase().trim());

// Cómo pide la gente ver lo rebajado. No son características del catálogo:
// se tratan aparte, como un filtro.
const PALABRAS_DE_OFERTA = new Set([
    'oferta', 'ofertas', 'rebaja', 'rebajas', 'rebajado', 'rebajados',
    'descuento', 'descuentos', 'promocion', 'promociones', 'liquidacion', 'sale',
]);

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
    const escritos = normalize(query).split(/\s+/).filter(Boolean);
    if (!escritos.length) return [];

    // "ofertas" no es un nombre ni una característica: es una intención. Se saca
    // de los tokens —si se dejara, se exigiría encontrar la palabra "oferta"
    // dentro del nombre o del color, y no aparecería nunca— y pasa a filtrar por
    // el campo que el backend ya calcula. Así "ofertas" solo devuelve lo
    // rebajado, y "vestido oferta" devuelve los vestidos rebajados.
    const pideOferta = escritos.some(t => PALABRAS_DE_OFERTA.has(t));
    const tokens = escritos.filter(t => !PALABRAS_DE_OFERTA.has(t));
    // Sin tokens (se escribió sólo "ofertas") every() da true y pasa todo, que
    // sumado al filtro de oferta es exactamente lo que se pidió.
    const coincide = (heno) => tokens.every(t => heno.includes(t));

    const results = [];

    (products || []).forEach(product => {
        const productHaystack = normalize(`${product.name} ${product.category || ''}`);
        const nameMatch = coincide(productHaystack) && (!pideOferta || product.on_sale);

        if (nameMatch) {
            results.push({ ...product, display_name: product.name, matchType: 'product' });
        }

        (product.variants || []).forEach(variant => {
            // Clave Y valor, no sólo el valor. Quien busca escribe lo que ve en la
            // ficha —"COLOR: Azul Marino"— así que teclea "color azul". Con sólo
            // los valores indexados, "azul" encontraba 6 piezas y "color azul"
            // ninguna: el token "color" no existía en ningún lado y el filtro
            // exige que estén todos. Lo mismo con "talla XL" y "cuello en v".
            const configPartes = Object.entries(variant.config || {}).flat().map(v => normalize(v));
            const variantHaystack = `${productHaystack} ${configPartes.join(' ')}`;
            if (!coincide(variantHaystack)) return;
            if (pideOferta && !variant.on_sale) return;

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
                // Sin esto el resultado se quedaba con el precio de la variante
                // pero con la oferta del producto: la tarjeta no sabía si pintar
                // la etiqueta ni contra qué precio tachar.
                original_price: variant.original_price ?? product.original_price,
                on_sale: variant.on_sale ?? false,
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
