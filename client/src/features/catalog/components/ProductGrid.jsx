import ProductCard from '../../../components/shared/ProductCard/ProductCard';
import { getImageUrl } from '../../../lib/api/endpoints/images.api';
import { track } from '../../../lib/analytics';

const ProductGrid = ({ products, loading, onProductClick, isModalOpen, onClearAll, activeFilters }) => {
    if (loading) {
        return (
            <div className="catalog-grid">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="catalog-grid-item">
                        <div className="skeleton-box" style={{ width: '100%', aspectRatio: '3/4', borderRadius: '4px', marginBottom: '16px' }}></div>
                        <div className="skeleton-box" style={{ width: '80%', height: '18px', borderRadius: '4px', marginBottom: '8px' }}></div>
                        <div className="skeleton-box" style={{ width: '40%', height: '16px', borderRadius: '4px' }}></div>
                    </div>
                ))}
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="catalog-empty-state">
                <div className="catalog-empty-icon">∅</div>
                <p>No se encontraron piezas en esta selección.</p>
                <button onClick={onClearAll} className="catalog-btn-reset">
                    Ver todo el catálogo
                </button>
            </div>
        );
    }

    return (
        <div className="catalog-grid">
            {products.map(producto => {
                // Buscar variante coincidente si hay filtros aplicados
                let bestVariant = null;
                if (activeFilters?.specs && Object.keys(activeFilters.specs).length > 0 && producto.variants) {
                    bestVariant = producto.variants.find(v => {
                        return Object.entries(activeFilters.specs).every(([key, values]) => {
                            if (!values || values.length === 0) return true;
                            const lowerValues = values.map(val => String(val).toLowerCase().trim());
                            const lowerKey = String(key).toLowerCase().trim();
                            return v.config && Object.entries(v.config).some(([ck, cv]) => 
                                ck.toLowerCase().trim() === lowerKey && lowerValues.includes(String(cv).toLowerCase().trim())
                            );
                        });
                    });
                }

                let images = producto.extras?.preview_carousel
                    ? producto.extras.preview_carousel.map(img =>
                        typeof img === 'string' ? getImageUrl(img) : getImageUrl(img.url)
                    )
                    : [];

                let mainImage = producto.image
                    ? getImageUrl(producto.image)
                    : (producto.images?.[0]?.url ? getImageUrl(producto.images[0].url) : null);

                // Si encontramos una mejor variante y tiene imagen propia, la ponemos primera
                if (bestVariant && bestVariant.image) {
                    const variantImageUrl = getImageUrl(bestVariant.image);
                    mainImage = variantImageUrl;
                    images = [variantImageUrl, ...images.filter(img => img !== variantImageUrl)];
                }

                const displayPrice = bestVariant ? bestVariant.price : producto.price;
                const hasPrice = displayPrice != null && displayPrice > 0;
                const priceValue = hasPrice
                    ? `$ ${displayPrice.toLocaleString('es-CL')}`
                    : 'Consultar';
                const pricePrefix = hasPrice && !bestVariant ? 'Desde' : null;

                // Oferta temporal: precio original tachado + badge
                const onSale = bestVariant ? bestVariant.on_sale : producto.on_sale;
                const originalRaw = bestVariant ? bestVariant.original_price : producto.original_price;
                const originalPrice = (onSale && originalRaw != null && originalRaw > displayPrice)
                    ? `$ ${originalRaw.toLocaleString('es-CL')}`
                    : null;

                return (
                    <div key={producto.id} className="catalog-grid-item">
                        <ProductCard
                            type="vertical"
                            name={producto.name}
                            price={priceValue}
                            originalPrice={originalPrice}
                            onSale={onSale && hasPrice}
                            pricePrefix={pricePrefix}
                            image={mainImage}
                            images={images}
                            interval={producto.extras?.carousel_speed}
                            isPaused={isModalOpen}
                            onClick={(indexActual) => {
                                // Pasar un objeto temporal que fuerce la SKU si es necesario
                                const tempProducto = bestVariant ? { ...producto, sku: bestVariant.sku } : producto;
                                track('click', { product_id: producto.baseProductId ?? producto.id });
                                onProductClick(tempProducto, indexActual);
                            }}
                        />
                    </div>
                );
            })}
        </div>
    );
};

export default ProductGrid;
