import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2 } from 'lucide-react';
import { getProducts } from '../../../lib/api/endpoints';
import { searchProducts } from '../../../features/catalog/utils/productSearch';
import Imagen from '../../ui/Imagen';

const InstantSearch = ({ isMobile = false, onResultClick }) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const searchRef = useRef(null);

    // Cerrar al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Lógica de Búsqueda (Deep Search)
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length > 1) {
                setIsLoading(true);
                try {
                    const productsList = await getProducts();
                    const uniqueResults = searchProducts(productsList, query);
                    setResults(uniqueResults.slice(0, 8));
                    setIsOpen(true);
                } catch (error) {
                    console.error("Error search:", error);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setResults([]);
                setIsOpen(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    const handleResultSelect = (result) => {
        setQuery('');
        setIsOpen(false);
        if (onResultClick) onResultClick();
        // Navegación profunda con SKU si existe
        navigate(`/catalogo/producto/${result.slug}${result.sku ? `/${result.sku}` : ''}`);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (query.trim()) {
            setIsOpen(false);
            if (onResultClick) onResultClick();
            navigate(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    return (
        <div className={`instant-search-container ${isMobile ? 'is-mobile' : ''}`} ref={searchRef}>
            <form className="search-form" onSubmit={handleSearchSubmit}>
                <div className="search-input-field">
                    <Search className="search-icon-left" size={18} />
                    <input 
                        type="text" 
                        placeholder={isMobile ? "Buscar..." : "Busca piezas únicas..."}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onFocus={() => query.trim().length > 1 && setIsOpen(true)}
                    />
                    {isLoading ? (
                        <Loader2 className="spinner-search" size={16} />
                    ) : (
                        query && <X className="clear-search" size={18} onClick={() => setQuery('')} />
                    )}
                </div>
            </form>

            {/* Panel de Resultados */}
            {isOpen && (results.length > 0 || !isLoading) && query.length > 1 && (
                <div className="search-results-dropdown fade-in">
                    {results.length > 0 ? (
                        <div className="results-list">
                            <div className="results-header">Resultados Sugeridos</div>
                            {results.map(result => (
                                <div
                                    key={result.id}
                                    className="result-item"
                                    onClick={() => handleResultSelect(result)}
                                >
                                    <div className="result-img">
                                        <Imagen url={result.image} alt={result.display_name} sizes="48px" />
                                    </div>
                                    <div className="result-info">
                                        <span className="result-name">{result.display_name}</span>
                                        <span className="result-price">$ {result.price?.toLocaleString('es-CL')}</span>
                                    </div>
                                </div>
                            ))}
                            <button 
                                className="view-all-results"
                                onClick={handleSearchSubmit}
                            >
                                Ver todos los resultados para "{query}"
                            </button>
                        </div>
                    ) : (
                        <div className="no-results-found">
                            No encontramos nada para "{query}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default InstantSearch;
