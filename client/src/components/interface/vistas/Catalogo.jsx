import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Filtros from '../catalogo/Filtros';
import ElementoColeccion from '../colecciones/ElementoColeccion';
import { getProducts, getCategoriesTree, getImageUrl, getFiltersMetadata } from '../../../services/api';

const Catalogo = () => {
    const location = useLocation();
    const [productos, setProductos] = useState([]);
    const [totalCategorias, setTotalCategorias] = useState([]); 
    const [filtersMetadata, setFiltersMetadata] = useState({});
    const [appliedFilters, setAppliedFilters] = useState({
        category: null,
        specs: {},
        priceRange: null
    });
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null); 
    const [orden, setOrden] = useState('relevancia');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const cargarDatos = async () => {
            setLoading(true);
            try {
                const [prods, tree, meta] = await Promise.all([
                    getProducts(),
                    getCategoriesTree(),
                    getFiltersMetadata()
                ]);
                setProductos(prods);
                setTotalCategorias(tree);
                setFiltersMetadata(meta);
            } catch (error) {
                console.error("Error al cargar el catálogo:", error);
            } finally {
                setLoading(false);
            }
        };
        cargarDatos();
    }, []);

    // Actualizar productos cuando cambian los filtros (Opcional: recarga desde el servidor)
    /*
    useEffect(() => {
        const refetch = async () => {
             const prods = await getProducts(appliedFilters);
             setProductos(prods);
        };
        refetch();
    }, [appliedFilters]);
    */

    // Lógica de filtrado y ordenamiento MULTI-FACETADA
    const productosFiltrados = useMemo(() => {
        let resultado = [...productos];

        // 1. Filtro por categoría (considerando jerarquía si viene del chip rápido)
        if (categoriaSeleccionada) {
            const getDescendantSlugs = (node) => {
                let slugs = [node.slug];
                if (node.children) node.children.forEach(c => slugs = [...slugs, ...getDescendantSlugs(c)]);
                return slugs;
            };
            const allowedSlugs = getDescendantSlugs(categoriaSeleccionada);
            resultado = resultado.filter(p => allowedSlugs.includes(p.category_slug));
        } else if (appliedFilters.category) {
            // Filtro de categoría exacto desde el Drawer
            resultado = resultado.filter(p => p.category_slug === appliedFilters.category);
        }

        // 2. Filtro por especificaciones (Atributos dinámicos)
        if (appliedFilters.specs && Object.keys(appliedFilters.specs).length > 0) {
            resultado = resultado.filter(p => {
                // Para que un producto pase, debe cumplir con AL MENOS UNO de los valores seleccionados para CADA atributo
                return Object.entries(appliedFilters.specs).every(([key, values]) => {
                    if (!values || values.length === 0) return true;
                    // El valor puede estar en p.specs o en alguno de sus SKUs (pueden venir en el detalle del producto)
                    // Como el listado de productos es liviano, nos basamos en lo que tenemos.
                    // Nota: Si el listado no trae specs, este filtro local solo funcionará si los datos están presentes.
                    return values.includes(p.specs?.[key]);
                });
            });
        }

        // 3. Ordenar
        if (orden === 'precio-bajo') {
            resultado.sort((a, b) => (a.price || 0) - (b.price || 0));
        } else if (orden === 'precio-alto') {
            resultado.sort((a, b) => (b.price || 0) - (a.price || 0));
        }

        return resultado;
    }, [productos, categoriaSeleccionada, appliedFilters, orden]);

    if (loading) {
        return (
            <div className="catalogo-loading container">
                <div className="loader">Cargando colección artesanal...</div>
            </div>
        );
    }

    return (
        <div className="catalogo-view-premium container">
            <header className="catalogo-header-premium">
                <span className="sc-subtitle">Colecciones de Autor</span>
                <h1 className="sc-title-elegant">Nuestro Catálogo</h1>
                <div className="sc-decorative-line" />
                <p className="sc-description">Piezas únicas diseñadas con consciencia, alma y propósito.</p>
            </header>

            <div className="catalogo-layout">
                <Filtros 
                    categorias={totalCategorias}
                    categoriaSeleccionada={categoriaSeleccionada}
                    setCategoriaSeleccionada={setCategoriaSeleccionada}
                    filtersMetadata={filtersMetadata}
                    activeFilters={appliedFilters}
                    setFilters={setAppliedFilters}
                />

                <main className="catalogo-productos-grid">
                    {productosFiltrados.length > 0 ? (
                        <div className="elementosColeccion-premium">
                            {productosFiltrados.map(producto => (
                                <Link 
                                    key={producto.id} 
                                    to={producto.sku ? `/producto/${producto.slug}/${producto.sku}` : `/producto/${producto.slug}`}
                                    state={{ backgroundLocation: location }}
                                    className="product-card-link-premium"
                                >
                                    <ElementoColeccion 
                                        tipo="vertical"
                                        nombre={producto.name}
                                        precio={producto.price ? `$ ${producto.price.toLocaleString('es-CL')}` : 'Consultar'}
                                        imagen={producto.image ? getImageUrl(producto.image) : (producto.images?.[0]?.url ? getImageUrl(producto.images[0].url) : null)}
                                    />
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div className="no-resultados-premium">
                            <div className="no-results-icon">∅</div>
                            <p>No se encontraron piezas en esta selección.</p>
                            <button onClick={handleClearAll} className="btn-reset-filters">Ver todo el catálogo</button>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default Catalogo;
