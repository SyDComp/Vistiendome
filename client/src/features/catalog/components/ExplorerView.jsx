import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useCatalog from '../hooks/useCatalog';
import FilterBar from './FilterBar';
import ProductGrid from './ProductGrid';
import { flattenVariantsByLook } from '../utils/clusterUtils';
import '../catalog.css';

const ExplorerView = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Usamos el mismo hook del catálogo para obtener los datos y filtros básicos
    const {
        filteredProducts,
        categories,
        filtersMetadata,
        loading,
        appliedFilters,
        setAppliedFilters,
        selectedCategory,
        setSelectedCategory,
        clearAll,
        isModalOpen,
    } = useCatalog();

    // Explotamos los productos en sus variantes (una tarjeta por look/foto distinta)
    const variantCards = useMemo(
        () => flattenVariantsByLook(filteredProducts, appliedFilters.specs),
        [filteredProducts, appliedFilters.specs]
    );

    const handleProductClick = (producto, indexActual) => {
        let targetSku = producto.sku; // sku extraído de la variante agrupada
        if (producto.extras?.preview_carousel) {
            const currentImgObj = producto.extras.preview_carousel[indexActual];
            // Si la imagen es un objeto con url y sku, podemos actualizar el targetSku
            if (currentImgObj && typeof currentImgObj === 'object' && currentImgObj.sku) {
                targetSku = currentImgObj.sku;
            }
        }
        
        const targetUrl = targetSku
            ? `/catalogo/producto/${producto.slug}/${targetSku}`
            : `/catalogo/producto/${producto.slug}`;
            
        navigate(targetUrl, { state: { backgroundLocation: location, initialProduct: producto } });
    };

    return (
        <div className="catalog-view container fade-in">
            <header className="catalog-header">
                <span className="catalog-subtitle">Colecciones de Autor</span>
                <h1 className="catalog-title">Explorador</h1>
                <div className="catalog-decorative-line" />
                <p className="catalog-description">
                    Navega por todas nuestras piezas y afina tu búsqueda con los filtros.
                </p>
            </header>

            <div className="catalog-layout">
                <FilterBar
                    categories={categories}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    filtersMetadata={filtersMetadata}
                    activeFilters={appliedFilters}
                    setFilters={setAppliedFilters}
                />

                <main className="catalog-main">
                    <ProductGrid
                        products={variantCards}
                        loading={loading}
                        onProductClick={handleProductClick}
                        isModalOpen={isModalOpen}
                        onClearAll={clearAll}
                        activeFilters={appliedFilters}
                    />
                </main>
            </div>
        </div>
    );
};

export default ExplorerView;
