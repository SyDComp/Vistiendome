import { useNavigate, useLocation } from 'react-router-dom';
import useCatalog from '../hooks/useCatalog';
import FilterBar from './FilterBar';
import ProductGrid from './ProductGrid';
import '../catalog.css';

const ExplorerView = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Mismo hook que el catálogo, distinta proyección: el catálogo muestra
    // productos, el explorador muestra looks. El colapso ahora viene resuelto
    // del servidor, así que acá no hay nada que explotar.
    const {
        filteredLooks,
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

    const handleProductClick = (producto, indexActual) => {
        let targetSku = producto.sku; // sku extraído de la variante agrupada
        if (producto.extras?.preview_carousel) {
            const currentImgObj = producto.extras.preview_carousel[indexActual];
            // Si la imagen es un objeto con url y sku, podemos actualizar el targetSku
            if (currentImgObj && typeof currentImgObj === 'object' && currentImgObj.sku) {
                targetSku = currentImgObj.sku;
            }
        }
        
        // Si la clienta filtró por talla, el detalle debe abrirse en esa talla y
        // no en la que le tocó representar al look. Se manda el primer valor
        // elegido de cada filtro; el detalle lo usa como selección inicial.
        const preseleccion = {};
        Object.entries(appliedFilters.specs || {}).forEach(([k, vals]) => {
            if (!vals || !vals.length) return;
            const disponibles = (producto.facets?.[k] || []).filter(v =>
                vals.some(sel => String(sel).toLowerCase().trim() === String(v).toLowerCase().trim())
            );
            if (disponibles.length) preseleccion[k] = disponibles[0];
        });

        const targetUrl = targetSku
            ? `/catalogo/producto/${producto.slug}/${targetSku}`
            : `/catalogo/producto/${producto.slug}`;

        navigate(targetUrl, {
            state: { backgroundLocation: location, initialProduct: producto, preseleccion }
        });
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
                        products={filteredLooks}
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
