import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getCollectionBySlug, getImageUrl, getProducts } from '../../../lib/api/endpoints';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useWebSocket } from '../../../context/WebSocketContext';
import PremiumLoader from '../../ui/PremiumLoader';
import PremiumImage from '../../ui/PremiumImage';

const DetalleColeccion = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { lastMessage } = useWebSocket();
    const [collection, setCollection] = useState(null);
    const [loading, setLoading] = useState(true);
    const [scrolled, setScrolled] = useState(false);
    const location = useLocation();

    const fetchColl = async () => {
        try {
            setLoading(true);
            if (slug && slug.startsWith('smart_')) {
                let data = [];
                let title = 'Colección';
                let desc = '';
                
                if (slug === 'smart_latest') {
                    title = 'Recién Llegados (Novedades)';
                    desc = 'Las últimas tendencias y piezas añadidas a nuestro catálogo.';
                    data = await getProducts();
                } else if (slug === 'smart_best_sellers') {
                    title = 'Los Más Vendidos (Top Ventas)';
                    desc = 'Nuestras piezas más populares y amadas por nuestras clientas.';
                    const res = await fetch(`/api/v1/products/?page_size=50&sort=sales`);
                    const resData = await res.json();
                    data = Array.isArray(resData) ? resData : (resData.items || []);
                } else if (slug === 'smart_random') {
                    title = 'Descubre Algo Nuevo (Aleatorio)';
                    desc = 'Déjate sorprender por una selección curada aleatoria.';
                    const all = await getProducts();
                    data = [...all].sort(() => Math.random() - 0.5);
                }
                
                const fakeSkus = [];
                data.forEach(p => {
                    let selectedVariant = null;
                    if (p.variants && p.variants.length > 0) {
                        if (slug === 'smart_random') {
                            // Para colecciones aleatorias, escogemos una variante (color) al azar
                            const randomIndex = Math.floor(Math.random() * p.variants.length);
                            selectedVariant = p.variants[randomIndex];
                        } else {
                            // Para novedades o más vendidos, tomamos la primera variante disponible
                            selectedVariant = p.variants[0];
                        }
                    }

                    fakeSkus.push({
                        sku: selectedVariant ? selectedVariant.sku : p.slug,
                        product_slug: p.slug,
                        product_name: p.name,
                        price: selectedVariant ? (selectedVariant.price || p.price) : p.price,
                        image: selectedVariant?.image || p.image || p.images?.[0]?.url || p.image_url,
                        config: selectedVariant ? selectedVariant.config : {}
                    });
                });
                
                setCollection({
                    name: title,
                    description: desc,
                    slug: slug,
                    skus: fakeSkus,
                    image_url: null
                });
            } else {
                const data = await getCollectionBySlug(slug);
                setCollection(data);
            }
        } catch (err) {
            console.error("Error loading collection detail:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 100);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        fetchColl();
    }, [slug]);

    // --- SINCRONIZACIÓN EN TIEMPO REAL (WebSockets) ---
    useEffect(() => {
        if (!lastMessage) return;

        console.log('📩 Mensaje WebSocket recibido:', lastMessage);

        if (lastMessage.type === 'invalidate_cache' && lastMessage.resource === 'collections') {
            const { action, slug: msgSlug, old_slug: msgOldSlug } = lastMessage;
            
            console.log(`🔄 Señal de invalidación detectada [${action}]. Evaluando relevancia para "${slug}"...`);
            
            // Caso 1: Esta misma colección fue modificada o renombrada
            const isRelevant = msgSlug === slug || msgOldSlug === slug;
            
            if (isRelevant) {
                if (action === 'delete') {
                    console.warn('⚠️ Esta colección ha sido eliminada por un administrador.');
                    navigate('/');
                } else {
                    console.log('✨ Refrescando datos de colección por cambio detectado en Admin.');
                    fetchColl();
                }
            } else {
                console.log('ℹ️ El cambio ocurrió en otra colección. No es necesario refrescar esta vista.');
            }
        }
    }, [lastMessage, slug, navigate]);

    // Agrupar variantes por producto pero preservando todas las piezas individuales
    const groupedProducts = React.useMemo(() => {
        if (!collection?.skus) return [];
        const groups = {};
        collection.skus.forEach(sku => {
            if (!groups[sku.product_slug]) {
                groups[sku.product_slug] = {
                    name: sku.product_name || "Producto",
                    slug: sku.product_slug,
                    variants: []
                };
            }
            groups[sku.product_slug].variants.push(sku);
        });
        return Object.values(groups);
    }, [collection]);

    if (loading) return (
        <div className="collection-detail-view fade-in">
            <header className="collection-hero">
                <div className="collection-detail-hero-content">
                    <div className="skeleton-box" style={{ width: '120px', height: '24px', margin: '0 auto 16px', borderRadius: '12px' }} />
                    <div className="skeleton-box" style={{ width: '60%', height: '48px', margin: '0 auto 24px', borderRadius: '12px' }} />
                    <div className="skeleton-box" style={{ width: '40%', height: '24px', margin: '0 auto 32px', borderRadius: '8px' }} />
                    <div className="skeleton-box" style={{ width: '200px', height: '20px', margin: '0 auto', borderRadius: '8px' }} />
                </div>
            </header>
            <main className="collection-products container">
                <div className="grid-header">
                    <div className="skeleton-box" style={{ width: '200px', height: '32px', borderRadius: '8px', marginBottom: '8px' }} />
                    <div className="skeleton-box" style={{ width: '150px', height: '16px', borderRadius: '4px' }} />
                </div>
                <section className="product-group-section">
                    <div className="group-title-wrapper">
                        <div className="skeleton-box" style={{ width: '150px', height: '24px', borderRadius: '8px' }} />
                    </div>
                    <div className="products-grid">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="product-card">
                                <div className="skeleton-box" style={{ width: '100%', aspectRatio: '3/4', borderRadius: '4px', marginBottom: '16px' }} />
                                <div className="product-info" style={{ padding: '0 12px 12px' }}>
                                    <div className="skeleton-box" style={{ width: '80%', height: '18px', borderRadius: '4px', marginBottom: '8px' }} />
                                    <div className="skeleton-box" style={{ width: '40%', height: '16px', borderRadius: '4px' }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );

    if (!collection) return (
        <div className="collection-not-found">
            <h2>Colección no encontrada</h2>
            <button onClick={() => navigate('/')}>Volver al inicio</button>
        </div>
    );

    return (
        <div className="collection-detail-view fade-in">
            {/* Botón Volver Premium (Adaptativo) */}
            <button 
                onClick={() => navigate('/colecciones')} 
                className={`back-btn-premium ${scrolled ? 'is-scrolled' : ''}`} 
                title="Volver"
            >
                <ArrowLeft size={24} />
            </button>

            {/* Hero Section — Fondo limpio sin imagen */}
            <header className="collection-hero">
                <div className="collection-detail-hero-content">
                    <div className="collection-detail-hero-badge">
                        <Sparkles size={14} />
                        <span>COLECCIÓN CURADA</span>
                    </div>
                    <h1 className="collection-detail-hero-title">{collection.name}</h1>
                    {collection.description && (
                        <p className="collection-detail-hero-desc">{collection.description}</p>
                    )}
                    <div className="hero-stats">
                        <span>{collection.skus?.length || 0} piezas</span>
                        <span className="hero-stats-dot">·</span>
                        <span>{groupedProducts.length} {groupedProducts.length === 1 ? 'modelo' : 'modelos'}</span>
                    </div>
                </div>
            </header>

            {/* Products Grid Sections */}
            <main className="collection-products container">
                <div className="grid-header">
                    <h2>Selección de Piezas</h2>
                    <span>{collection.skus?.length || 0} variantes en {groupedProducts.length} modelos</span>
                </div>

                {slug.startsWith('smart_') ? (
                    <section className="product-group-section">
                        <div className="products-grid">
                            {collection.skus?.map(variant => (
                                <div 
                                    key={variant.sku} 
                                    className="product-card"
                                    onClick={() => navigate(`/coleccion/${slug}/producto/${variant.product_slug}/${variant.sku}`, {
                                        state: {
                                            backgroundLocation: location,
                                            initialProduct: {
                                                slug: variant.product_slug,
                                                name: variant.product_name,
                                                image: variant.image,
                                                price: variant.price
                                            }
                                        }
                                    })}
                                >
                                    <div className="product-image-box">
                                        {variant.image ? (
                                            <PremiumImage 
                                                src={getImageUrl(variant.image)} 
                                                alt={variant.sku} 
                                                objectFit="contain"
                                            />
                                        ) : (
                                            <div className="no-image" />
                                        )}
                                        {variant.compare_at_price && variant.compare_at_price > variant.price && (
                                            <div className="sku-tag discount-tag">
                                                -{Math.round((1 - variant.price / variant.compare_at_price) * 100)}%
                                            </div>
                                        )}
                                    </div>
                                    <div className="product-info">
                                        <h3 className="product-name">
                                            {variant.product_name} {variant.config?.color ? `- Color ${variant.config.color}` : ''}
                                        </h3>
                                        <div className="product-footer">
                                            <span className="product-price">${variant.price?.toLocaleString('es-CL')}</span>
                                            <div className="view-detail-icon">
                                                <ArrowLeft size={16} className="rotated-180" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ) : (
                    groupedProducts.map(group => (
                        <section key={group.slug} className="product-group-section">
                            <div className="group-title-wrapper">
                                <h3 className="group-title">{group.name}</h3>
                                <div className="group-title-line" />
                            </div>
                            
                            <div className="products-grid">
                                {group.variants.map(variant => (
                                    <div 
                                        key={variant.sku} 
                                        className="product-card"
                                        onClick={() => navigate(`/coleccion/${slug}/producto/${group.slug}/${variant.sku}`, {
                                            state: {
                                                backgroundLocation: location,
                                                initialProduct: {
                                                    slug: group.slug,
                                                    name: group.name,
                                                    image: variant.image,
                                                    price: variant.price
                                                }
                                            }
                                        })}
                                    >
                                        <div className="product-image-box">
                                            {variant.image ? (
                                                <PremiumImage 
                                                    src={getImageUrl(variant.image)} 
                                                    alt={variant.sku} 
                                                    objectFit="contain"
                                                />
                                            ) : (
                                                <div className="no-image" />
                                            )}
                                            {variant.compare_at_price && variant.compare_at_price > variant.price && (
                                                <div className="sku-tag discount-tag">
                                                    -{Math.round((1 - variant.price / variant.compare_at_price) * 100)}%
                                                </div>
                                            )}
                                        </div>
                                        <div className="product-info">
                                            <h3 className="product-name">
                                                {variant.config?.color ? `Color ${variant.config.color}` : group.name}
                                            </h3>
                                            <div className="product-footer">
                                                <span className="product-price">${variant.price?.toLocaleString('es-CL')}</span>
                                                <div className="view-detail-icon">
                                                    <ArrowLeft size={16} className="rotated-180" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    ))
                )}
            </main>


        </div>
    );
};

export default DetalleColeccion;
