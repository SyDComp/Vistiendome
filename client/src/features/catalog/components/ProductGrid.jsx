import ProductCard from '../../../components/shared/ProductCard/ProductCard';
import { getImageUrl } from '../../../lib/api/endpoints/images.api';

const ProductGrid = ({ products, loading, onProductClick, isModalOpen, onClearAll }) => {
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
                const images = producto.extras?.preview_carousel
                    ? producto.extras.preview_carousel.map(img =>
                        typeof img === 'string' ? getImageUrl(img) : getImageUrl(img.url)
                    )
                    : [];

                const mainImage = producto.image
                    ? getImageUrl(producto.image)
                    : (producto.images?.[0]?.url ? getImageUrl(producto.images[0].url) : null);

                const price = producto.price
                    ? `$ ${producto.price.toLocaleString('es-CL')}`
                    : 'Consultar';

                return (
                    <div key={producto.id} className="catalog-grid-item">
                        <ProductCard
                            type="vertical"
                            name={producto.name}
                            price={price}
                            image={mainImage}
                            images={images}
                            interval={producto.extras?.carousel_speed}
                            isPaused={isModalOpen}
                            onClick={(indexActual) => onProductClick(producto, indexActual)}
                        />
                    </div>
                );
            })}
        </div>
    );
};

export default ProductGrid;
