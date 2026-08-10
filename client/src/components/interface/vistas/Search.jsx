import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, Link, useLocation } from 'react-router-dom';
import { getProducts, getImageUrl } from '../../../lib/api/endpoints';
import { searchProducts } from '../../../features/catalog/utils/productSearch';
import ProductCard from '../../shared/ProductCard/ProductCard';
import { Search as SearchIcon, ArrowLeft, Share2 } from 'lucide-react';
import PremiumLoader from '../../ui/PremiumLoader';
import { track } from '../../../lib/analytics';

const Search = () => {
    const [searchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const location = useLocation();
    
    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showShareToast, setShowShareToast] = useState(false);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const data = await getProducts();
                setAllProducts(data || []);
            } catch (err) {
                console.error("Error fetching products for search:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    // Analítica: registrar búsqueda (con debounce para no contar cada tecla)
    useEffect(() => {
        const q = query.trim();
        if (!q) return;
        const t = setTimeout(() => track('search', { query: q }), 800);
        return () => clearTimeout(t);
    }, [query]);

    const results = useMemo(() => {
        if (!query.trim()) return [];
        return searchProducts(allProducts, query);
    }, [allProducts, query]);

    const handleShare = () => {
        navigator.clipboard.writeText(window.location.href);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2000);
    };

    if (loading) {
        return <PremiumLoader text="Buscando piezas..." />;
    }

    return (
        <div className="search-view-premium container search-view-container">
            <header className="search-header">
                <div className="search-subtitle-container">
                    <div className="search-subtitle-line-right" />
                    <span className="search-subtitle-text">Exploración Latente</span>
                    <div className="search-subtitle-line-left" />
                </div>
                
                <h1 className="search-title">
                    Resultados para <span className="search-query-highlight">"{query}"</span>
                </h1>
                <p className="search-results-count">
                    {results.length} {results.length === 1 ? 'pieza encontrada' : 'piezas encontradas'} en nuestro catálogo artesanal.
                </p>

                <div className="search-actions-container">
                    <button onClick={handleShare} className="search-btn-share">
                        <Share2 size={16} /> Compartir Búsqueda
                    </button>
                    <Link to="/catalogo" className="search-link-catalog">
                         Ver Catálogo Completo
                    </Link>
                </div>
            </header>

            <main>
                {results.length > 0 ? (
                    <div className="elementosColeccion-premium search-grid">
                        {results.map(item => (
                            <Link 
                                key={item.id} 
                                to={item.sku ? `/catalogo/producto/${item.slug}/${item.sku}?from_search=${encodeURIComponent(query)}` : `/catalogo/producto/${item.slug}?from_search=${encodeURIComponent(query)}`}
                                state={{ backgroundLocation: location }}
                                className="search-link-item"
                            >
                                <ProductCard
                                    type="vertical"
                                    name={item.display_name}
                                    price={item.price ? `$ ${item.price.toLocaleString('es-CL')}` : 'Consultar'}
                                    image={getImageUrl(item.image)}
                                />
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="search-empty-state">
                        <div className="search-empty-icon">∅</div>
                        <h2 className="search-empty-title">Sin eco en el vacío</h2>
                        <p className="search-empty-desc">No encontramos coincidencias para tu búsqueda. Prueba con términos más generales.</p>
                        <Link to="/" className="search-empty-link">
                            <ArrowLeft size={18} /> Volver al inicio
                        </Link>
                    </div>
                )}
            </main>

            {showShareToast && (
                <div className="search-toast-container">
                    <div className="search-toast-dot" />
                    Enlace copiado al portapapeles
                </div>
            )}


        </div>
    );
};

export default Search;
