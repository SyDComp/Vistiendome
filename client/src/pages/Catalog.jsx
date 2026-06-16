import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/molecules/ProductCard';
import ProductModal from '../components/molecules/ProductModal';
import SectionHeader from '../components/atoms/SectionHeader';
import { useWebSocket } from '../context/WebSocketContext';
import './Catalog.css';

export default function Catalog() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [filtersExpanded, setFiltersExpanded] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const wsMessage = useWebSocket();

    const fetchData = async () => {
        try {
            // Fetch products
            const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
            const productsRes = await fetch(`${apiUrl}/products`);
            if (productsRes.ok) {
                const productsData = await productsRes.json();
                // Filter out inactive products for public view
                setProducts(productsData.filter(p => p.is_active !== false));
            }

            // Fetch categories
            const categoriesRes = await fetch(`${apiUrl}/products/categories`);
            if (categoriesRes.ok) {
                const categoriesData = await categoriesRes.json();
                // Add "Todo" option at the beginning
                setCategories([
                    { id: 'all', name: 'Todo' },
                    ...categoriesData.map(cat => ({ id: cat.id, name: cat.name }))
                ]);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch products and categories initially
    useEffect(() => {
        fetchData();
    }, []);

    // WebSocket reactivity
    useEffect(() => {
        if (wsMessage && (wsMessage.event === 'PRODUCTS_UPDATED' || wsMessage.event === 'CATEGORIES_UPDATED')) {
            console.log('WebSocket update received for catalog');
            // Silent refetch
            fetchData();
        }
    }, [wsMessage]);

    // Deep linking: Auto-open product from URL
    useEffect(() => {
        const productId = searchParams.get('producto');
        const categoryId = searchParams.get('category');

        // Handle product deep link
        if (productId && products.length > 0 && !selectedProduct) {
            const product = products.find(p => p.id === productId);
            if (product) {
                setSelectedProduct(product);
            }
        }

        // Handle category deep link
        if (categoryId) {
            // Check if category is valid (optional, but good UX)
            // For now just set it, as the filter logic handles non-matches gracefully (empty list)
            // But we should ensure it matches one of our categories types if we want to be strict
            // Given the categories are loaded async, we might want to wait, or just set it.
            // If we set it and it's not in the list, the sidebar might not show it as active if we rely on exact ID match
            // But let's set it. The categories array usually has numbers or strings matching IDs.
            // We need to handle potential type mismatch (string vs number) if IDs are numbers.
            // The API sees query params as strings.
            // Our filter comparison `product.category?.id === filter` might need loose equality or strict if we cast.
            // Let's assume IDs are integers for now based on previous context, but searchParams gives strings.
            // Let's try to cast if it looks like a number, or keep as string.
            // Actually, looking at `categories` state, if it comes from API, IDs are likely numbers.
            // Let's normalize to number if possible.
            const catId = !isNaN(categoryId) ? Number(categoryId) : categoryId;
            setFilter(catId);
        }
    }, [searchParams, products]);

    useEffect(() => {
        const handleReset = () => {
            setFilter('all');
            setSearchQuery('');
            setSearchParams({});
        };
        window.addEventListener('catalog-reset', handleReset);
        return () => window.removeEventListener('catalog-reset', handleReset);
    }, [setSearchParams]);



    // Filtrar productos por categoría y búsqueda
    const filteredProducts = products.filter(product => {
        const matchesCategory = filter === 'all' || product.category?.id === filter;
        const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (product.description && product.description.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="catalog-page">
            {/* Modal de Producto */}
            <ProductModal
                product={selectedProduct}
                onClose={() => {
                    setSelectedProduct(null);
                    // Remove producto param from URL when closing modal
                    if (searchParams.get('producto')) {
                        setSearchParams({});
                    }
                }}
            />

            {/* Header unificado */}
            <SectionHeader 
                title="Catálogo"
                subtitle="Curaduría de piezas únicas"
                onClick={() => {
                    setFilter('all');
                    setSearchQuery('');
                    setSearchParams({});
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
            />

            <div className="catalog-layout">
                {/* Sidebar Filters */}
                <aside className="catalog-filters">
                    <div className="catalog-search-container">
                        <div className="search-wrapper">
                            <input
                                type="text"
                                placeholder="Buscar piezas..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                            {searchQuery && (
                                <button className="search-clear" onClick={() => setSearchQuery('')}>✕</button>
                            )}
                        </div>
                    </div>

                    <div
                        className="filters-header"
                        onClick={() => setFiltersExpanded(!filtersExpanded)}
                        style={{ cursor: 'pointer' }}
                    >
                        <h3>Colecciones</h3>
                        <button
                            className="filters-toggle"
                            aria-label="Toggle filters"
                        >
                            {filtersExpanded ? '−' : '+'}
                        </button>
                    </div>
                    <ul className={filtersExpanded ? 'expanded' : ''}>
                        {categories.map(cat => (
                            <li
                                key={cat.id}
                                className={filter === cat.id ? 'active' : ''}
                                onClick={() => {
                                    setFilter(cat.id);
                                    // Auto-close on mobile after selection
                                    if (window.innerWidth <= 968) {
                                        setFiltersExpanded(false);
                                    }
                                }}
                            >
                                {cat.name}
                            </li>
                        ))}
                    </ul>
                </aside>

                {/* Product Grid */}
                <main className="product-grid-container">
                    {loading ? (
                        <div className="loading-state">Cargando piezas...</div>
                    ) : (
                        <div className="products-grid">
                            {filteredProducts.length === 0 ? (
                                <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#888', padding: '3rem' }}>
                                    {products.length === 0
                                        ? 'No hay productos disponibles en este momento.'
                                        : 'No se encontraron productos en esta colección.'}
                                </p>
                            ) : (
                                filteredProducts.map(product => (
                                    <div key={product.id} onClick={() => {
                                        setSelectedProduct(product);
                                        setSearchParams({ producto: product.id });
                                    }}>
                                        <ProductCard product={product} />
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </main>
            </div>

        </div>
    );
}
