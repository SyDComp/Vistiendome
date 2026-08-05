import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { useWebSocket } from '../../../context/WebSocketContext';
import FeaturedCollections from '../colecciones/FeaturedCollections';
import { getProducts, getImageUrl } from '../../../services/api';
import { ArrowRight, ChevronLeft, ChevronRight, ShoppingBag } from 'lucide-react';

const API_BASE = (import.meta.env.PROD ? '/api/v1/homepage/' : 'http://127.0.0.1:8000/api/v1/homepage/');

// ── Hook de viewport ─────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 1050, forcedValue = null) {
    const [isMobile, setIsMobile] = useState(() => forcedValue !== null ? forcedValue : window.innerWidth < 1050);
    
    useEffect(() => {
        if (forcedValue !== null) {
            setIsMobile(forcedValue);
            return;
        }
        const handler = () => setIsMobile(window.innerWidth < 1050);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, [forcedValue]);
    
    return isMobile;
}

// ── Renderizador de capas (universal) ─────────────────────────────────────────
const LayerRenderer = ({ layers = [], navigate, isMobile }) => {
    return (
        <>
            {[...layers].sort((a, b) => a.zIndex - b.zIndex).map(layer => {
                const x = isMobile ? (layer.mx ?? layer.x ?? 50) : (layer.x ?? 50);
                const y = isMobile ? (layer.my ?? layer.y ?? 50) : (layer.y ?? 50);
                const scale = isMobile ? (layer.ms ?? layer.scale ?? 1) : (layer.scale ?? 1);
                const rotation = isMobile ? (layer.mr ?? layer.rotation ?? 0) : (layer.rotation ?? 0);
                const fontSize = isMobile ? (layer.mf ?? layer.fontSize ?? 48) : (layer.fontSize ?? 48);

                return (
                    <div
                        key={layer.id}
                        onClick={() => !previewMode && layer.link && navigate(layer.link)}
                        style={{
                            position: 'absolute',
                            left: `${x}%`,
                            top: `${y}%`,
                            zIndex: layer.zIndex,
                            transform: `translate(-50%,-50%) rotate(${rotation}deg)`,
                            cursor: layer.link ? 'pointer' : 'default',
                            width: layer.type === 'image' ? `${scale * 100}%` : 'auto',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            pointerEvents: layer.link ? 'auto' : 'none'
                        }}
                    >
                        {layer.type === 'text' ? (
                            <div style={{ 
                                color: layer.color || '#fff', 
                                fontSize: `calc(100cqw * ${fontSize / 1000} * ${scale})`,
                                fontWeight: '900', 
                                whiteSpace: 'nowrap', 
                                letterSpacing: '-0.03em', 
                                lineHeight: '1', 
                                textShadow: '0 4px 20px rgba(0,0,0,0.35)', 
                                userSelect: 'none' 
                            }}>
                                {layer.content}
                            </div>
                        ) : (
                            <img 
                                src={layer.url ? (layer.url.startsWith('http') ? layer.url : `${layer.url}`) : ''} 
                                style={{ display: 'block', width: '100%', height: 'auto', pointerEvents: 'none' }} 
                                alt="" 
                            />
                        )}
                    </div>
                );
            })}
        </>
    );
};

// ── BLOQUES UNIVERSALES ──────────────────────────────────────────────────────

export const UniversalBlock = ({ config, aspectRatio = '21/9', borderRadius = '40px', previewMode = false, forceMobile = null }) => {
    const navigate = useNavigate();
    const isMobile = useIsMobile(1050, forceMobile);

    let bgColor = config.bg_color || '#1e1b4b';
    let layers = [];
    let currentRadius = borderRadius;

    if (config.scenes?.length) {
        const scene = config.scenes[0];
        bgColor = (isMobile ? (scene.mobile_bg_color || scene.bg_color) : scene.bg_color) || bgColor;
        const allLayers = scene.layers || [];
        layers = allLayers.filter(l => {
            if (!l.display || l.display === 'both') return true;
            return l.display === (isMobile ? 'mobile' : 'desktop');
        });
        const t = isMobile ? (scene.mobile_border_type || scene.border_type || 'soft') : (scene.border_type || 'soft');
        if (t === 'none') currentRadius = '0px';
        else if (t === 'soft') currentRadius = isMobile ? '32px' : '40px';
        else if (t === 'deep') currentRadius = isMobile ? '60px' : '100px';
        
        if (previewMode && t !== 'none') currentRadius = '24px';
    } else {
        layers = config?.layers || [];
    }

    const desktopRatio = config?.desktop_ratio || aspectRatio;
    const currentRatio = isMobile ? (config?.mobile_ratio || '9/16') : desktopRatio;
    const desktopMaxW = desktopRatio === '1/1' ? '700px' : '1200px';

    return (
        <div style={{ marginBottom: previewMode ? '20px' : '40px', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <div style={{ 
                width: '100%', 
                maxWidth: previewMode ? '100%' : (isMobile ? '375px' : desktopMaxW),
                aspectRatio: currentRatio, 
                borderRadius: currentRadius, 
                overflow: 'hidden', 
                position: 'relative', 
                background: bgColor || 'transparent', 
                boxShadow: previewMode ? '0 10px 30px rgba(0,0,0,0.1)' : '0 30px 60px -12px rgba(0,0,0,0.15)',
                transition: 'all 0.5s ease',
                containerType: 'inline-size'
            }}>
                <LayerRenderer layers={layers} navigate={navigate} isMobile={isMobile} />
            </div>
        </div>
    );
};

export const SceneCarouselBlock = ({ config, previewMode = false, forceMobile = null }) => {
    const navigate = useNavigate();
    const isMobile = useIsMobile(1050, forceMobile);
    const [activeIdx, setActiveIdx] = useState(0);
    const [dragStart, setDragStart] = useState(null);

    const scenes = config?.scenes || [];

    useEffect(() => {
        if (scenes.length <= 1) return;
        const intervalMs = (config?.carousel_interval || 5) * 1000;
        const t = setInterval(() => setActiveIdx(i => (i + 1) % scenes.length), intervalMs);
        return () => clearInterval(t);
    }, [scenes.length, config?.carousel_interval]);

    const go = (dir) => setActiveIdx(i => (i + dir + scenes.length) % scenes.length);

    if (!scenes.length) return null;

    const firstScene = scenes[0] || {};
    const borderT = isMobile ? (firstScene.mobile_border_type || firstScene.border_type || 'soft') : (firstScene.border_type || 'soft');
    let containerRadius = '0px';
    if (borderT === 'soft') containerRadius = isMobile ? '32px' : '40px';
    else if (borderT === 'deep') containerRadius = isMobile ? '60px' : '100px';
    
    if (previewMode && borderT !== 'none') containerRadius = '24px';

    const desktopRatio = config?.desktop_ratio || '21/9';
    const currentRatio = isMobile ? (config?.mobile_ratio || '9/16') : desktopRatio;
    const desktopMaxW = desktopRatio === '1/1' ? '700px' : '1200px';

    return (
        <div style={{ marginBottom: previewMode ? '30px' : '60px', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <div
                style={{ 
                    width: '100%', 
                    maxWidth: previewMode ? '100%' : (isMobile ? '375px' : desktopMaxW),
                    aspectRatio: currentRatio, 
                    position: 'relative', 
                    overflow: 'hidden', 
                    background: 'transparent', 
                    borderRadius: containerRadius,
                    boxShadow: previewMode ? '0 10px 30px rgba(0,0,0,0.1)' : '0 30px 60px -12px rgba(0,0,0,0.15)',
                    cursor: dragStart ? 'grabbing' : 'grab', 
                    touchAction: 'pan-y',
                    containerType: 'inline-size'
                }}
                onPointerDown={e => setDragStart(e.clientX)}
                onPointerUp={e => { if (dragStart !== null) { const d = e.clientX - dragStart; if (Math.abs(d) > 50) go(d > 0 ? -1 : 1); setDragStart(null); } }}
            >
                {scenes.map((scene, i) => {
                    const sceneBg = (isMobile ? (scene.mobile_bg_color || scene.bg_color) : scene.bg_color) || '#1e1b4b';
                    const allLayers = scene.layers || [];
                    const layers = allLayers.filter(l => {
                        if (!l.display || l.display === 'both') return true;
                        return l.display === (isMobile ? 'mobile' : 'desktop');
                    });
                    
                    let sceneRadius = '0px';
                    const t = isMobile ? (scene.mobile_border_type || scene.border_type || 'soft') : (scene.border_type || 'soft');
                    
                    if (t === 'none') sceneRadius = '0px';
                    else if (t === 'soft') sceneRadius = isMobile ? '32px' : '40px';
                    else if (t === 'deep') sceneRadius = isMobile ? '60px' : '100px';
                    
                    if (previewMode && t !== 'none') sceneRadius = '24px'; // Unificado en preview para orden visual, pero respetando 'none'

                    return (
                        <div key={scene.id || i} style={{ position: 'absolute', inset: 0, opacity: activeIdx === i ? 1 : 0, transition: 'opacity 1.2s ease', background: sceneBg, pointerEvents: activeIdx === i ? 'auto' : 'none', borderRadius: sceneRadius, overflow: 'hidden' }}>
                            <LayerRenderer layers={layers} navigate={navigate} isMobile={isMobile} />
                        </div>
                    );
                })}

                {scenes.length > 1 && (
                    <>
                        <button onClick={e => { e.stopPropagation(); go(-1); }} style={{ position:'absolute', left:'16px', top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,0.12)', backdropFilter:'blur(8px)', border:'none', color:'#fff', width:'44px', height:'44px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:100 }}><ChevronLeft size={20} /></button>
                        <button onClick={e => { e.stopPropagation(); go(1); }}  style={{ position:'absolute', right:'16px', top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,0.12)', backdropFilter:'blur(8px)', border:'none', color:'#fff', width:'44px', height:'44px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', zIndex:100 }}><ChevronRight size={20} /></button>
                    </>
                )}
            </div>
        </div>
    );
};

export const TextBlock = ({ config, title, previewMode = false, forceMobile = null }) => {
    const isMobile = useIsMobile(1050, forceMobile);
    const { 
        content = '', 
        align = 'left'
    } = config || {};

    // Reemplazar espacios duros (non-breaking spaces) por espacios normales. 
    // Esto previene que el navegador trate toda la oración como una sola palabra gigante.
    const sanitizedContent = typeof content === 'string' 
        ? content.replace(/&nbsp;|\u00A0/g, ' ') 
        : content;

    return (
        <div style={{ marginBottom: previewMode ? '30px' : (isMobile ? '40px' : '60px'), textAlign: align }}>
            <div style={{ 
                maxWidth: previewMode ? '100%' : '1000px', 
                margin: align === 'center' ? '0 auto' : '0'
            }}>
                {title && <h2 style={{ fontSize: previewMode ? '20px' : (isMobile ? '22px' : '28px'), fontWeight: '900', color: '#1e1b4b', marginBottom: '24px' }}>{title}</h2>}
                <div 
                    className="rich-text-content"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(sanitizedContent) }}
                    style={{ 
                        fontSize: previewMode ? '14px' : (isMobile ? '15px' : '17px'), 
                        lineHeight: isMobile ? '1.6' : '1.8', 
                        color: '#475569'
                    }}
                />
            </div>
            <style>{`
                .rich-text-content {
                    word-break: normal !important;
                    overflow-wrap: break-word !important;
                    hyphens: none !important;
                }
                .rich-text-content * {
                    max-width: 100%;
                }
                .rich-text-content h1 { font-size: 2.2em; margin-bottom: 0.5em; color: #1e1b4b; line-height: 1.2; }
                .rich-text-content h2 { font-size: 1.8em; margin-bottom: 0.5em; color: #1e1b4b; line-height: 1.3; }
                .rich-text-content h3 { font-size: 1.4em; margin-bottom: 0.5em; color: #1e1b4b; line-height: 1.4; }
                .rich-text-content p { margin-bottom: 1em; }
                .rich-text-content ul, .rich-text-content ol { margin-bottom: 1em; padding-left: 20px; }
                .rich-text-content li { margin-bottom: 0.5em; }
                .rich-text-content strong { font-weight: 800; }
                .rich-text-content img { height: auto; border-radius: 12px; }
            `}</style>
        </div>
    );
};

export const DataTableBlock = ({ config, title, previewMode = false, forceMobile = null }) => {
    const isMobile = useIsMobile(1050, forceMobile);
    const headers = config.headers || [];
    const rows = config.rows || [];
    const styles = config.styles || {
        headerBg: '#f8fafc',
        headerColor: '#64748b',
        cellBg: '#ffffff',
        cellColor: '#1e1b4b',
        borderColor: '#f1f5f9',
        fontSize: '14px',
        borderRadius: '20px',
        showVerticalLines: false,
        showHorizontalLines: true
    };

    if (!headers.length) return null;

    return (
        <div style={{ marginBottom: previewMode ? '20px' : (isMobile ? '30px' : '40px') }}>
            {title && <h3 style={{ fontSize: previewMode ? '14px' : (isMobile ? '18px' : '20px'), fontWeight: '800', color: '#1e1b4b', marginBottom: '20px' }}>{title}</h3>}
            <div style={{ overflowX: 'auto', borderRadius: styles.borderRadius || '20px', border: `1px solid ${styles.borderColor}` }}>
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, textAlign: 'left', background: styles.cellBg }}>
                    <thead>
                        <tr style={{ background: styles.headerBg }}>
                            {headers.map((h, i) => (
                                <th key={i} style={{ 
                                    padding: previewMode ? '10px 12px' : (isMobile ? '12px 14px' : '16px 20px'), 
                                    fontSize: previewMode ? '10px' : (isMobile ? '11px' : '12px'), 
                                    fontWeight: '800', 
                                    color: styles.headerColor, 
                                    textTransform: 'uppercase', 
                                    letterSpacing: '1px', 
                                    borderBottom: (styles.showHorizontalLines !== false) ? `2px solid ${styles.borderColor}` : 'none',
                                    borderRight: (styles.showVerticalLines && i < headers.length - 1) ? `1px solid ${styles.borderColor}` : 'none'
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i}>
                                {headers.map((h, j) => {
                                    const cell = row[h];
                                    const val = typeof cell === 'object' ? cell.value : (cell || row[Object.keys(row)[j]] || '-');
                                    const isBold = typeof cell === 'object' ? cell.bold : false;
                                    const cellColor = typeof cell === 'object' ? cell.color : null;

                                    return (
                                        <td key={j} style={{ 
                                            padding: previewMode ? '10px 12px' : (isMobile ? '12px 14px' : '16px 20px'), 
                                            fontSize: previewMode ? '11px' : (isMobile ? '13px' : (styles.fontSize || '14px')), 
                                            fontWeight: isBold ? '800' : (j === 0 ? '700' : '500'), 
                                            color: cellColor || (j === 0 ? '#1e1b4b' : styles.cellColor),
                                            borderBottom: (styles.showHorizontalLines !== false && i < rows.length - 1) ? `1px solid ${styles.borderColor}` : 'none',
                                            borderRight: (styles.showVerticalLines && j < headers.length - 1) ? `1px solid ${styles.borderColor}` : 'none'
                                        }}>
                                            {val}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ProductCard = ({ product, previewMode }) => {
    const navigate = useNavigate();
    return (
        <div 
            className="product-carousel-card"
            onClick={() => !previewMode && navigate(product.sku ? `/catalogo/producto/${product.slug}/${product.sku}` : `/catalogo/producto/${product.slug}`)}
            style={{ 
                flex: '0 0 auto',
                width: previewMode ? '160px' : '280px',
                minWidth: previewMode ? '160px' : '280px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                scrollSnapAlign: 'start'
            }}
        >
            <div style={{ 
                borderRadius: '8px', 
                overflow: 'hidden', 
                aspectRatio: '4/5', 
                background: '#f8fafc',
                marginBottom: '12px',
                position: 'relative',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
            }}>
                <img 
                    src={product.image ? getImageUrl(product.image) : (product.images?.[0]?.url ? getImageUrl(product.images[0].url) : '')} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    alt={product.name}
                />
                <div className="add-to-cart-banner">
                    + Añadir al Carrito
                </div>
            </div>
            <div style={{ padding: '0 4px' }}>
                <h4 style={{ 
                    margin: '0 0 4px 0', 
                    fontSize: previewMode ? '12px' : '15px', 
                    fontWeight: '700', 
                    color: '#1e1b4b', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap' 
                }}>{product.name}</h4>
                <span style={{ 
                    fontSize: previewMode ? '13px' : '16px', 
                    fontWeight: '900', 
                    color: '#8f0653' 
                }}>
                    {product.price ? `$ ${product.price.toLocaleString('es-CL')}` : 'Consultar'}
                </span>
            </div>
        </div>
    );
};

export const ProductCarouselBlock = ({ config, title, previewMode = false, forceMobile = null }) => {
    const isMobile = useIsMobile(1050, forceMobile);
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = React.useRef(null);

    useEffect(() => {
        const load = async () => {
            try {
                const collectionId = config?.collection_id;
                let data = [];
                
                if (collectionId === 'smart_latest' || !collectionId) {
                    // Últimos productos subidos
                    data = await getProducts();
                } else if (collectionId === 'smart_best_sellers') {
                    // Simulamos top ventas con un limit, en el futuro puede ser un endpoint real
                    const res = await fetch(`/api/v1/products/?page_size=20&sort=sales`);
                    const resData = await res.json();
                    data = Array.isArray(resData) ? resData : (resData.items || []);
                } else if (collectionId === 'smart_random') {
                    // Productos aleatorios
                    const all = await getProducts();
                    data = [...all].sort(() => Math.random() - 0.5);
                } else {
                    // Colección específica del usuario (por slug)
                    const res = await fetch(`/api/v1/collections/${collectionId}`);
                    const resData = await res.json();
                    data = resData.skus || [];
                }
                
                setProducts(data.slice(0, 12));
            } catch (err) {
                console.error("Error loading carousel products:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [config?.collection_id]);

    const scroll = (direction) => {
        if (!scrollRef.current) return;
        const offset = direction === 'left' ? -400 : 400;
        scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    };

    const [showArrows, setShowArrows] = useState(false);
    if (loading || !products.length) return null;

    return (
        <div style={{ marginBottom: previewMode ? '40px' : '80px', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <div 
                style={{ 
                    width: '100%', 
                    maxWidth: previewMode ? '100%' : '1200px',
                    position: 'relative', 
                    marginTop: previewMode ? '20px' : '0px',
                    padding: previewMode ? '0 10px' : (isMobile ? '0 16px' : '0 20px')
                }}
                onMouseEnter={() => setShowArrows(true)}
                onMouseLeave={() => setShowArrows(false)}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', marginBottom: '24px', padding: '0 4px' }}>
                    <div>
                        <h2 style={{ fontSize: previewMode ? '16px' : (isMobile ? '18px' : '24px'), fontWeight: '900', color: '#1e1b4b', margin: 0, textTransform: 'uppercase', letterSpacing: '1.2px' }}>
                            {title || 'Nuestros Favoritos'}
                        </h2>
                    </div>
                    <button 
                        onClick={() => !previewMode && navigate(`/coleccion/${config?.collection_id || 'smart_latest'}`)}
                        style={{ background: 'none', border: 'none', color: '#1e1b4b', fontWeight: '700', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '4px', letterSpacing: '1px' }}
                    >
                        VER TODO
                    </button>
                </div>

                <div style={{ position: 'relative' }}>
                    {/* Flechas Flotantes Estilo Lounge */}
                    {(isMobile || (showArrows && products.length > 4)) && (
                        <>
                            <button 
                                onClick={(e) => { e.stopPropagation(); scroll('left'); }} 
                                className="floating-nav-btn left"
                                style={{ 
                                    left: isMobile ? '4px' : '-22px',
                                    width: isMobile ? '36px' : '44px',
                                    height: isMobile ? '36px' : '44px',
                                }}
                            >
                                <ChevronLeft size={isMobile ? 18 : 24} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); scroll('right'); }} 
                                className="floating-nav-btn right"
                                style={{ 
                                    right: isMobile ? '4px' : '-22px',
                                    width: isMobile ? '36px' : '44px',
                                    height: isMobile ? '36px' : '44px',
                                }}
                            >
                                <ChevronRight size={isMobile ? 18 : 24} />
                            </button>
                        </>
                    )}

                    <div 
                        ref={scrollRef}
                        className="product-carousel-scroll"
                        style={{ 
                            display: 'flex', 
                            gap: isMobile ? '12px' : '20px', 
                            overflowX: 'auto', 
                            padding: isMobile ? '10px 4px 20px' : '10px 4px 40px',
                            scrollSnapType: 'x mandatory',
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none'
                        }}
                    >
                        {products.map(product => (
                            <ProductCard key={product.id} product={product} previewMode={previewMode} />
                        ))}
                    </div>
                </div>

                <style>{`
                    .product-carousel-scroll::-webkit-scrollbar { display: none; }
                    .floating-nav-btn {
                        position: absolute; top: 40%; transform: translateY(-50%);
                        width: 44px; height: 44px; background: #fff; color: #1e1b4b;
                        border: none; border-radius: 4px; display: flex; align-items: center; justify-content: center;
                        cursor: pointer; z-index: 100; box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                        transition: all 0.2s ease;
                    }
                    .floating-nav-btn:hover { background: #1e1b4b; color: #fff; transform: translateY(-50%) scale(1.1); }
                    .add-to-cart-banner {
                        position: absolute; bottom: 0; left: 0; right: 0;
                        background: rgba(255,255,255,0.95); padding: 12px;
                        text-align: center; color: #1e1b4b; font-size: 11px; font-weight: 800;
                        text-transform: uppercase; letter-spacing: 1px;
                        transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    }
                    .product-carousel-card:hover .add-to-cart-banner { transform: translateY(0); }
                    .product-carousel-card:hover img { transform: scale(1.05); }
                    .product-carousel-card img { transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
                `}</style>
            </div>
        </div>
    );
};

export const RecentProductsBlock = ({ previewMode = false }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getProducts();
                setProducts(data.slice(0, 8));
            } catch (err) {
                console.error("Error loading recent products:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    if (loading || !products.length) return null;

    return (
        <div style={{ marginBottom: previewMode ? '30px' : '60px' }}>
            {!previewMode && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', padding: '0 20px' }}>
                    <div>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#8f0653', textTransform: 'uppercase', letterSpacing: '2px' }}>Novedades</span>
                        <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#1e1b4b', margin: '4px 0 0 0' }}>Últimos Lanzamientos</h2>
                    </div>
                    <button 
                        onClick={() => window.location.href = `/coleccion/${config?.collection_id || 'smart_latest'}`}
                        style={{ background: 'none', border: 'none', color: '#8f0653', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        VER TODO <ArrowRight size={16} />
                    </button>
                </div>
            )}
            
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: previewMode ? 'repeat(2, 1fr)' : 'repeat(auto-fill, minmax(280px, 1fr))', 
                gap: previewMode ? '16px' : '32px',
                padding: previewMode ? '0' : '0 20px'
            }}>
                {products.map(product => (
                    <div key={product.id} style={{ position: 'relative' }}>
                        <div style={{ 
                            borderRadius: previewMode ? '20px' : '32px', 
                            overflow: 'hidden', 
                            aspectRatio: '3/4', 
                            background: '#f8fafc',
                            marginBottom: '12px',
                            boxShadow: '0 10px 30px -5px rgba(0,0,0,0.05)'
                        }}>
                            <img 
                                src={product.image ? getImageUrl(product.image) : (product.images?.[0]?.url ? getImageUrl(product.images[0].url) : '')} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                alt={product.name}
                            />
                        </div>
                        <h4 style={{ margin: '0 0 2px 0', fontSize: previewMode ? '13px' : '18px', fontWeight: '800', color: '#1e1b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.name}</h4>
                        <span style={{ fontSize: previewMode ? '12px' : '16px', fontWeight: '600', color: '#8f0653' }}>{product.price ? `$ ${product.price.toLocaleString('es-CL')}` : 'Consultar'}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

const CMSRenderer = ({ page = 'homepage', data = null, previewMode = false, activeId = null, forceMobile = null }) => {
    const isMobile = useIsMobile(1050, forceMobile);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const { lastMessage } = useWebSocket();

    const fetchContent = useCallback(async () => {
        if (data) {
            setSections(data);
            setLoading(false);
            return;
        }
        try {
            const res = await fetch(`${API_BASE}?page=${page}`);
            const dataRes = await res.json();
            setSections(dataRes);
        } catch (err) {
            console.error(`Error loading CMS page ${page}:`, err);
        } finally {
            setLoading(false);
        }
    }, [page, data]);

    useEffect(() => {
        fetchContent();
    }, [fetchContent]);

    useEffect(() => {
        if (!data && lastMessage?.type === 'invalidate_cache' && lastMessage.resource === 'cms' && lastMessage.page === page) {
            fetchContent();
        }
    }, [lastMessage, fetchContent, page, data]);

    if (loading) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <div className="loading-spinner"></div>
            </div>
        );
    }

    if (sections.length === 0) return null;

    return (
        <div 
            className={`cms-dynamic-renderer fade-in ${previewMode ? 'preview-mode' : ''}`}
            style={{ paddingTop: previewMode ? '0' : '30px' }}
        >
            {sections.map((section) => {
                if (!section || (!section.is_active && !previewMode)) return null;
                
                const isActiveInPreview = activeId === section.id;

                const renderBlock = () => {
                    switch (section.type) {
                        case 'hero':
                            return <UniversalBlock config={section.config} previewMode={previewMode} forceMobile={forceMobile} />;
                        case 'banner':
                            return <UniversalBlock config={section.config} aspectRatio="3/1" borderRadius="32px" previewMode={previewMode} forceMobile={forceMobile} />;
                        case 'composition_carousel':
                            return <SceneCarouselBlock config={section.config} previewMode={previewMode} forceMobile={forceMobile} />;
                        case 'text_post':
                            return <TextBlock config={section.config} title={section.title} previewMode={previewMode} forceMobile={forceMobile} />;
                        case 'data_table':
                            return <DataTableBlock config={section.config} title={section.title} previewMode={previewMode} forceMobile={forceMobile} />;
                        case 'recent_products':
                            return <RecentProductsBlock previewMode={previewMode} />;
                        case 'product_carousel':
                            return <ProductCarouselBlock config={section.config} title={section.title} previewMode={previewMode} forceMobile={forceMobile} />;
                        default:
                            return null;
                    }
                };

                return (
                    <div 
                        key={section.id} 
                        id={`preview-section-${section.id}`}
                        style={{ 
                            border: previewMode && isActiveInPreview ? '3px solid #8f0653' : 'none',
                            borderRadius: '0px',
                            transition: 'all 0.3s ease',
                            opacity: !section.is_active && previewMode ? 0.4 : 1,
                            transform: previewMode && isActiveInPreview ? 'scale(1.02)' : 'none',
                            boxShadow: previewMode && isActiveInPreview ? '0 20px 40px rgba(143,6,83,0.15)' : 'none',
                            marginBottom: '0px'
                        }}
                    >
                        {renderBlock()}
                    </div>
                );
            })}
        </div>
    );
};

export default CMSRenderer;
