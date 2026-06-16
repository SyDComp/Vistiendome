import { useNavigate, useLocation } from 'react-router-dom';
import useCatalog from '../hooks/useCatalog';
import FilterBar from './FilterBar';
import ProductGrid from './ProductGrid';
import '../catalog.css';

const CatalogView = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const {
        filteredProducts,
        categories,
        filtersMetadata,
        loading,
        appliedFilters,
        setAppliedFilters,
        selectedCategory,
        setSelectedCategory,
        sortOrder,
        setSortOrder,
        clearAll,
        isModalOpen,
    } = useCatalog();

    const handleProductClick = (producto, indexActual) => {
        let targetSku = producto.sku;
        if (producto.extras?.preview_carousel) {
            const currentImgObj = producto.extras.preview_carousel[indexActual];
            if (currentImgObj && currentImgObj.sku) {
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
                <h1 className="catalog-title">Nuestro Catálogo</h1>
                <div className="catalog-decorative-line" />
                <p className="catalog-description">
                    Piezas únicas diseñadas con consciencia, alma y propósito.
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
                        products={filteredProducts}
                        loading={loading}
                        onProductClick={handleProductClick}
                        isModalOpen={isModalOpen}
                        onClearAll={clearAll}
                    />
                </main>
            </div>
        </div>
    );
};

export default CatalogView;
