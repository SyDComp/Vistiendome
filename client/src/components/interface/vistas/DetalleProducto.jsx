import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Share2, ShieldCheck, Truck, MapPin, MessageCircle, ShoppingBag, X, ChevronRight } from 'lucide-react';
import ProductPreviewCarousel from '../detalles/ProductPreviewCarousel';
import VariantSelector from '../detalles/VariantSelector';
import VariantSelectionDrawer from '../detalles/VariantSelectionDrawer';
import { getProductBySlug, getImageUrl } from '../../../services/api';
import { useCart } from '../../../context/CartContext';
import { useNotification } from '../../../context/NotificationContext';

const DetalleProducto = ({ producto: initialProduct, isModal = false }) => {
    const { slug, sku: variantSkuCode, imgIndex } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { addItem } = useCart();
    const { toast } = useNotification();
    const [producto, setProducto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    
    // Estado de selecciones
    const [selections, setSelections] = useState({});

    // Resetear selecciones cuando el slug del producto cambia (Carga de nuevo producto)
    useEffect(() => {
        setSelections({});
    }, [slug]);

    // Formateador estético de SKU para mostrar como subtítulo
    const formatSku = (skuStr) => {
        if (!skuStr) return "";
        let clean = skuStr;
        if (clean.toLowerCase().startsWith('pr-')) {
            clean = clean.slice(3);
        }
        return clean.replace(/_/g, ' ').replace(/-/g, ' • ');
    };

    // 1. Cargar el detalle completo basado en slug de URL o prop inicial
    useEffect(() => {
        const cargarDetalle = async () => {
            const targetSlug = slug || initialProduct?.slug;
            if (!targetSlug) return;
            setLoading(true);
            try {
                const fullData = await getProductBySlug(targetSlug);
                setProducto(fullData);
            } catch (err) {
                console.error("Error cargando detalle:", err);
                setError("No se pudo cargar la información del producto.");
            } finally {
                setLoading(false);
            }
        };
        cargarDetalle();
    }, [initialProduct, slug]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 2. --- LÓGICA DE MATRIZ DE VARIANTES (ESPACIO LATENTE) ---
    const VALOR_NA = "No aplica";

    // Obtener todas las llaves posibles de configuración en el universo de este producto
    const llavesMaestras = useMemo(() => {
        if (!producto?.skus) return [];
        const keys = new Set();
        producto.skus.forEach(s => {
            Object.keys(s.config || {}).forEach(k => keys.add(k));
        });
        
        // Prioridad: Talla, Color, y el resto alfabético
        const priority = ['talla', 'color'];
        return Array.from(keys).sort((a, b) => {
            const idxA = priority.indexOf(a.toLowerCase());
            const idxB = priority.indexOf(b.toLowerCase());
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });
    }, [producto]);

    // SKUs normalizados: Todos tienen las mismas llaves, usando VALOR_NA si falta
    const skusNormalizados = useMemo(() => {
        if (!producto?.skus) return [];
        return producto.skus.map(s => {
            const newConfig = { ...s.config };
            llavesMaestras.forEach(k => {
                if (!(k in newConfig)) newConfig[k] = VALOR_NA;
            });
            return { ...s, config: newConfig };
        });
    }, [producto, llavesMaestras]);

    const configAtributos = useMemo(() => {
        return llavesMaestras.map(key => {
            const isColor = key.toLowerCase() === 'color';
            const opcionesRaw = [...new Set(skusNormalizados.map(s => s.config?.[key]))];
            
            // Si es color, intentamos buscar una imagen representativa para cada opción
            const opcionesConMetadata = opcionesRaw.map(opc => {
                let thumb = null;
                if (isColor && opc !== VALOR_NA) {
                    // Buscar el primer SKU que tenga este color y tenga imágenes
                    const representativeSku = skusNormalizados.find(s => s.config[key] === opc && s.image_urls?.length > 0);
                    if (representativeSku) {
                        thumb = getImageUrl(representativeSku.image_urls[0]);
                    }
                }
                return { valor: opc, thumb };
            }).sort((a, b) => {
                if (a.valor === VALOR_NA) return 1;
                if (b.valor === VALOR_NA) return -1;
                return a.valor.localeCompare(b.valor);
            });

            return {
                id: key,
                etiqueta: key.charAt(0).toUpperCase() + key.slice(1).toLowerCase(),
                opciones: opcionesConMetadata,
                type: isColor ? 'visual' : 'text'
            };
        });
    }, [llavesMaestras, skusNormalizados]);

    const skuActual = useMemo(() => {
        if (!skusNormalizados || Object.keys(selections).length === 0) return null;
        return skusNormalizados.find(s => {
            return Object.entries(selections).every(([key, val]) => s.config?.[key] === val);
        });
    }, [skusNormalizados, selections]);

    // --- MOTOR DE SINCRONIZACIÓN (DEEP LINKING <-> STATE) ---
    const lastUrlSku = React.useRef(variantSkuCode);

    useEffect(() => {
        // 1. Evitar ejecución si los datos básicos no están listos
        if (!configAtributos.length || !skusNormalizados.length) return;

        // Caso 1: Estado vacío (Carga inicial)
        if (Object.keys(selections).length === 0) {
            // Si hay SKU en la URL, priorizamos cargarlo
            if (variantSkuCode) {
                lastUrlSku.current = variantSkuCode;
                const urlMatch = skusNormalizados.find(s => s.sku === variantSkuCode);
                if (urlMatch) {
                    setSelections({ ...urlMatch.config });
                    return;
                }
            }

            // PRIORIDAD ALTA: Intentamos sincronizar con la portada (vitrina)
            const getFileName = (path) => path?.split(/[?#]/)[0].split(/[\\/]/).pop()?.toLowerCase();
            const coverImage = producto?.image;
            const coverFileName = getFileName(coverImage);
            
            // Buscamos el mejor SKU que posea esta imagen de portada
            const matchingSku = coverImage ? skusNormalizados.find(s => 
                s.image_urls?.some(url => getFileName(url) === coverFileName)
            ) : null;

            if (matchingSku) {
                setSelections({ ...matchingSku.config });
            } else {
                // FALLBACK final: Primera opción válida para cada atributo
                const fallback = {};
                configAtributos.forEach(attr => {
                    const bestOption = attr.opciones.find(o => o.valor !== VALOR_NA) || attr.opciones[0];
                    fallback[attr.id] = bestOption.valor;
                });
                setSelections(fallback);
            }
            return;
        }

        // Caso 2: El navegador cambió la URL (Back/Forward o URL modificada a mano)
        if (variantSkuCode !== lastUrlSku.current) {
            lastUrlSku.current = variantSkuCode;
            const urlMatch = skusNormalizados.find(s => s.sku === variantSkuCode);
            if (urlMatch) {
                setSelections({ ...urlMatch.config });
            }
            return;
        }

        // Caso 3: Sincronización Inversa (Estado local -> URL)
        // El usuario hizo clic en un botón o en una miniatura
        if (skuActual && skuActual.sku !== variantSkuCode) {
            lastUrlSku.current = skuActual.sku; // Prevenir un falso rebote
            // Si cambian la variante pero había un imgIndex, lo omitimos para que el carrusel decida el primer fallback
            navigate(`/producto/${slug}/${skuActual.sku}`, { 
                replace: true, 
                state: location.state 
            });
        }
    }, [configAtributos, skusNormalizados, variantSkuCode, skuActual, slug, navigate, location.state, selections, producto, imgIndex]);

    // Lógica de disponibilidad (Reachability): ¿Existe algún SKU con esta opción dada la selección actual de OTROS atributos?
    const checkOptionReachability = (attrId, value) => {
        return skusNormalizados.some(s => {
            // Debe coincidir con el valor propuesto para este atributo
            if (s.config[attrId] !== value) return false;
            
            // Y debe coincidir con las selecciones actuales de todos los DEMÁS atributos
            return Object.entries(selections).every(([k, v]) => {
                if (k === attrId) return true;
                return s.config[k] === v;
            });
        });
    };

    const handleJumpToSKU = (config) => {
        setSelections(prev => {
            const next = { ...prev };
            Object.entries(config).forEach(([k, v]) => {
                next[k] = v;
            });
            return next;
        });
    };

    const handleOptionChange = (attrId, value) => {
        setSelections(prev => {
            const currentSelections = { ...prev, [attrId]: value };
            
            // 1. Buscamos SKUs que tengan este valor específico
            const matches = skusNormalizados.filter(s => s.config[attrId] === value);
            
            if (matches.length > 0) {
                // 2. Buscamos el match exacto con el resto de selecciones
                const exactMatch = matches.find(s => 
                    Object.entries(currentSelections).every(([k, v]) => s.config[k] === v)
                );

                if (!exactMatch) {
                    // 3. Salto Inteligente:
                    let bestMatch = matches[0];
                    let maxCoincidencias = -1;

                    matches.forEach(s => {
                        let coincidencias = 0;
                        Object.entries(currentSelections).forEach(([k, v]) => {
                            if (s.config[k] === v) coincidencias++;
                        });
                        if (coincidencias > maxCoincidencias) {
                            maxCoincidencias = coincidencias;
                            bestMatch = s;
                        }
                    });

                    // Forzamos la configuración del mejor match
                    const finalSelections = { ...currentSelections };
                    llavesMaestras.forEach(k => {
                        finalSelections[k] = bestMatch.config[k];
                    });
                    return finalSelections;
                }
            }
            return currentSelections;
        });
    };





    const precioFinal = skuActual ? skuActual.price : (producto?.skus?.[0]?.price || 0);

    const handleWhatsApp = () => {
        if (!producto) return;
        
        const priorityOrder = ['talla', 'color'];
        const selectionsText = Object.entries(selections)
            .sort(([keyA], [keyB]) => {
                const indexA = priorityOrder.indexOf(keyA.toLowerCase());
                const indexB = priorityOrder.indexOf(keyB.toLowerCase());
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return keyA.localeCompare(keyB);
            })
            .map(([key, val]) => `*${key.charAt(0).toUpperCase() + key.slice(1)}:* ${val}`)
            .join('\n');

        const specsText = producto.specs && Object.keys(producto.specs).length > 0
            ? '\n\n_Detalles técnicos:_\n' + Object.entries(producto.specs)
                .map(([k, v]) => `• ${k}: ${v}`)
                .join('\n')
            : '';

        const message = `¡Hola Paola! ✨ \n\nMe interesa este producto: *${producto.name}*\n\n${selectionsText}${specsText}\n\n¿Podrías darme más información?`;
        const url = `https://wa.me/569XXXXXXXX?text=${encodeURIComponent(message)}`; // TODO: Reemplazar con nro real
        window.open(url, '_blank');
    };

    const handleShare = async () => {
        const shareData = {
            title: producto?.name || 'Vistiéndome Platform',
            text: `Mira este producto en Vistiéndome: ${producto?.name}`,
            url: window.location.href,
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Enlace copiado al portapapeles', 'Compartir');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error al compartir:', err);
            }
        }
    };

    if (loading) return (
        <div className="detalle-loading">
            <div className="loader-container">
                <div className="premium-loader"></div>
                <span>Creando experiencia premium...</span>
            </div>
        </div>
    );
    
    if (error || !producto) return <div className="detail-error">{error || "Producto no disponible"}</div>;



    return (
        <div className={`detalle-producto-container fade-in ${isModal ? 'is-modal-view' : ''}`}>
            {/* Botón de cierre "X" fijo (Solo si es modal o vista fluida) */}
            <button 
                className="btn-close-detail" 
                onClick={() => navigate(-1)}
                title="Cerrar producto"
            >
                <X size={28} />
            </button>

            {/* Cabecera / Botón volver (Glassmorphism) - Opcional en modal */}
            {!isModal && (
                <nav className="detalle-nav">
                    <div className="container nav-content">
                        <button className="btn-back-glass" onClick={() => navigate(-1)}>
                            <ChevronLeft size={24} />
                            <span>Volver</span>
                        </button>
                        <button className="btn-share-glass" onClick={handleShare}>
                            <Share2 size={20} />
                        </button>
                    </div>
                </nav>
            )}

            <main className="container main-content-wrapper">
                <div className="detalle-grid-premium">
                    {/* Galería de Imágenes */}
                    <div className="detalle-column-left">
                        <div className="sticky-gallery-container">
                            <ProductPreviewCarousel 
                                skus={skusNormalizados}
                                coverImage={producto?.image}
                                skuActual={skuActual}
                                onJumpToVariant={(config) => handleJumpToSKU(config)}
                                imgIndex={imgIndex}
                                onImageSelected={(newIndex) => {
                                    if (skuActual) {
                                        navigate(`/producto/${slug}/${skuActual.sku}/${newIndex}`, { 
                                            replace: true, 
                                            state: location.state 
                                        });
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Información del Producto */}
                    <div className="detalle-column-right">
                        <header className="product-header-premium">
                            <div className="category-and-share">
                                <span className="product-category-tag">{producto.category?.name}</span>
                                <button className="btn-share-mini" title="Compartir producto" onClick={handleShare}>
                                    <Share2 size={18} />
                                </button>
                            </div>
                            <h1 className="product-title-elegant">{producto.name}</h1>
                            {skuActual && (
                                <div className="product-sku-pill">
                                    <span className="sku-label">SKU</span>
                                    <span className="sku-val">{formatSku(skuActual.sku)}</span>
                                </div>
                            )}
                            <div className="price-tag-premium">
                                <span className="currency">$</span>
                                <span className="val">{precioFinal.toLocaleString('es-CL')}</span>
                            </div>
                        </header>

                        <div className="product-description-refined">
                            <p>{producto.description}</p>
                        </div>

                        <div className="divider-premium-elegant" />

                        {/* Selección de Variantes (Desktop Only) */}
                        {!isMobile && (
                            <div className="selectors-container-premium">
                                <VariantSelector 
                                    attributes={configAtributos} 
                                    selections={selections} 
                                    onChange={handleOptionChange}
                                    checkOptionReachability={checkOptionReachability}
                                />
                            </div>
                        )}

                        {/* Selección de Variantes (Mobile Summary Button) */}
                        {isMobile && (
                            <div className="mobile-selection-summary-container">
                                <button className="btn-open-selection-drawer" onClick={() => setIsDrawerOpen(true)}>
                                    <div className="summary-info">
                                        <span className="summary-label">Opciones seleccionadas</span>
                                        <div className="summary-values">
                                            {Object.entries(selections).length > 0 ? (
                                                Object.entries(selections).map(([id, val], i) => (
                                                    <span key={id} className="summary-val-badge">
                                                        {val === 'No aplica' ? 'Estándar' : val}
                                                        {i < Object.entries(selections).length - 1 && ' • '}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="summary-placeholder">Elegir talla, color y más...</span>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="summary-arrow" />
                                </button>
                            </div>
                        )}

                        {/* Ficha Técnica / Especificaciones Dinámicas */}
                        {(() => {
                            const validSpecs = Object.entries(producto.specs || {}).filter(([key, val]) => {
                                return val && !key.toLowerCase().includes('colección') && !key.toLowerCase().includes('slug');
                            });
                            
                            if (validSpecs.length === 0) return null;

                            return (
                                <div className="specs-section-premium" style={{ animationDelay: '0.4s' }}>
                                    <div className="section-title-wrapper">
                                        <div className="title-accent" />
                                        <h3 className="section-title-premium-text">Especificaciones</h3>
                                    </div>
                                    <div className="specs-grid-refined">
                                        {validSpecs.map(([key, val]) => (
                                            <div key={key} className="spec-item-refined">
                                                <span className="spec-label-refined">{key}</span>
                                                <span className="spec-value-refined">{val}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Acciones principales (Desktop) */}
                        <div className="cta-grid-desktop">
                            <button 
                                className="btn-primary-premium"
                                onClick={() => {
                                    const selectedCount = Object.keys(selections).length;
                                    if (selectedCount < configAtributos.length) {
                                        setIsDrawerOpen(true);
                                    } else {
                                        // Obtener la imagen actual del carrusel si es posible, o la principal
                                        const rawImage = skuActual?.image_urls?.[0] || producto?.image;
                                        const currentImage = getImageUrl(rawImage);
                                        
                                        addItem({
                                            productId: producto.id,
                                            sku: skuActual?.sku,
                                            name: producto.name,
                                            price: precioFinal,
                                            image: currentImage,
                                            variantLabel: Object.entries(selections).map(([k, v]) => `${k}: ${v}`).join(', '),
                                            productUrl: window.location.href
                                        });
                                    }
                                }}
                            >
                                <ShoppingBag size={20} />
                                Añadir al Carrito
                            </button>
                            <button className="btn-secondary-premium" onClick={handleWhatsApp}>
                                <MessageCircle size={20} />
                                Consultar
                            </button>
                        </div>

                        {/* Badges de Confianza (Desktop) */}
                        <div className="trust-badges-refined">
                            <div className="trust-item-mini">
                                <ShieldCheck size={16} />
                                <span>Garantía Artesanal</span>
                            </div>
                            <div className="trust-item-mini">
                                <Truck size={16} />
                                <span>Despacho Express</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Barra de acción móvil (Sticky Bottom) */}
            <div className="mobile-action-bar">
                <div className="buttons-group-mobile">
                    <button 
                        className="btn-mobile-buy"
                        onClick={() => {
                            const selectedCount = Object.keys(selections).length;
                            if (selectedCount < configAtributos.length) {
                                setIsDrawerOpen(true);
                            } else {
                                const rawImage = skuActual?.image_urls?.[0] || producto?.image;
                                const currentImage = getImageUrl(rawImage);

                                addItem({
                                    productId: producto.id,
                                    sku: skuActual?.sku,
                                    name: producto.name,
                                    price: precioFinal,
                                    image: currentImage,
                                    variantLabel: Object.entries(selections).map(([k, v]) => `${k}: ${v}`).join(', '),
                                    productUrl: window.location.href
                                });
                            }
                        }}
                    >
                        <ShoppingBag size={22} />
                        Añadir al Carrito
                    </button>
                    
                    <button className="btn-mobile-whatsapp-full" onClick={handleWhatsApp}>
                        <MessageCircle size={22} />
                        Consultar por WhatsApp
                    </button>
                </div>
            </div>

            {/* Drawer de Selección para Móvil */}
            <VariantSelectionDrawer 
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                attributes={configAtributos}
                selections={selections}
                onChange={handleOptionChange}
                checkOptionReachability={checkOptionReachability}
                productName={producto.name}
                onConfirm={() => setIsDrawerOpen(false)}
            />

            <style>{`
                .detalle-producto-container {
                    padding-bottom: 120px;
                    min-height: 100vh;
                    background: #fff;
                    position: relative;
                }

                .detalle-producto-container.is-modal-view {
                    width: 100%;
                    max-width: 1300px;
                    margin: 0 auto;
                    background: #fff;
                    border-radius: 0;
                    min-height: auto;
                }

                .btn-close-detail {
                    position: fixed;
                    top: 24px;
                    right: 24px;
                    z-index: 1010;
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    background: white;
                    border: 1px solid rgba(0,0,0,0.08);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    color: #475569;
                }
                .btn-close-detail:hover { transform: rotate(90deg) scale(1.1); color: #8f0653; border-color: #8f0653; }
                
                @media (max-width: 768px) {
                    .detalle-producto-container { padding-bottom: 200px; } /* Ajuste fino tras quitar precio */
                    .btn-close-detail { top: 12px; right: 12px; width: 36px; height: 36px; }
                    .detalle-producto-container.is-modal-view { padding-top: 0; }
                }

                /* Layout Grid-Premium */
                .detalle-grid-premium {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr); /* CRÍTICO: Evita que el contenido desborde el ancho móvil */
                    gap: 32px;
                    padding: 20px 0;
                }
                
                @media (min-width: 1024px) {
                    .detalle-grid-premium {
                        grid-template-columns: minmax(0, 1fr) minmax(0, 0.8fr); /* Galería más grande que texto */
                        gap: 80px;
                        align-items: start;
                        padding: 40px 0;
                        max-width: 1300px;
                        margin: 0 auto;
                    }
                    .detalle-column-left, .detalle-column-right {
                        min-width: 0;
                        width: 100%;
                    }
                    .sticky-gallery-container {
                        position: sticky;
                        top: 40px;
                    }
                }

                /* Product Header & Info */
                .product-header-premium { margin-bottom: 24px; }
                .category-and-share {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 12px;
                }
                .product-category-tag {
                    font-size: 12px;
                    font-weight: 800;
                    color: #8f0653;
                    letter-spacing: 1.5px;
                    text-transform: uppercase;
                    background: rgba(143, 6, 83, 0.05);
                    padding: 4px 12px;
                    border-radius: 20px;
                }
                .btn-share-mini {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #64748b;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-share-mini:hover { background: #fff; color: #8f0653; border-color: #fce7f3; }

                .product-title-elegant {
                    font-size: 2.2rem;
                    font-weight: 900;
                    color: #0f172a;
                    line-height: 1.1;
                    margin-bottom: 12px;
                }
                
                .product-sku-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: #f1f5f9;
                    padding: 4px 12px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }
                .sku-label { font-size: 10px; font-weight: 900; color: #94a3b8; letter-spacing: 1px; }
                .sku-val { font-size: 12px; font-weight: 700; color: #475569; }

                .price-tag-premium {
                    display: flex;
                    align-items: baseline;
                    gap: 6px;
                    color: #1e1b4b;
                }
                .price-tag-premium .currency { font-size: 1.2rem; font-weight: 700; color: #8f0653; }
                .price-tag-premium .val { font-size: 2.8rem; font-weight: 900; letter-spacing: -1.5px; }

                @media (max-width: 768px) {
                    .price-tag-premium .val { font-size: 2.2rem; }
                    .product-title-elegant { font-size: 1.8rem; }
                }

                .product-description-refined {
                    font-size: 1.05rem;
                    line-height: 1.7;
                    color: #475569;
                    margin: 24px 0;
                }

                .divider-premium-elegant {
                    height: 1px;
                    background: linear-gradient(to right, #f1f5f9, #cbd5e1 50%, #f1f5f9);
                    margin: 32px 0;
                }

                /* Specs Refined */
                .section-title-wrapper {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 20px;
                }
                .title-accent { width: 4px; height: 18px; background: #8f0653; border-radius: 4px; }
                .section-title-premium-text { font-size: 15px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #0f172a; margin: 0; }
                
                .specs-grid-refined {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 16px;
                    background: #fdf2f8; /* Muy sutil rosa */
                    padding: 24px;
                    border-radius: 20px;
                    border: 1px solid #fce7f3;
                }
                .spec-item-refined { display: flex; flex-direction: column; gap: 4px; }
                .spec-label-refined { font-size: 10px; font-weight: 700; color: #9d174d; text-transform: uppercase; letter-spacing: 0.5px; }
                .spec-value-refined { font-size: 14px; font-weight: 600; color: #1e293b; }

                /* Action CTA */
                .cta-grid-desktop {
                    display: none;
                    grid-template-columns: 2fr 1fr;
                    gap: 16px;
                    margin: 40px 0;
                }
                @media (min-width: 1024px) { .cta-grid-desktop { display: grid; } }
                
                .btn-primary-premium {
                    background: #1e1b4b;
                    color: white;
                    border: none;
                    padding: 20px;
                    border-radius: 18px;
                    font-weight: 800;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    box-shadow: 0 10px 20px rgba(30, 27, 75, 0.15);
                }
                .btn-primary-premium:hover { transform: translateY(-4px); box-shadow: 0 15px 30px rgba(30, 27, 75, 0.25); background: #2a256a; }
                
                .btn-secondary-premium {
                    background: #fff;
                    color: #1e1b4b;
                    border: 1px solid #e2e8f0;
                    padding: 20px;
                    border-radius: 18px;
                    font-weight: 700;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .btn-secondary-premium:hover { border-color: #8f0653; color: #8f0653; background: #fff5f9; }

                /* Badges */
                .trust-badges-refined {
                    display: none;
                    gap: 24px;
                    margin-top: 24px;
                }
                @media (min-width: 1024px) { .trust-badges-refined { display: flex; } }
                .trust-item-mini { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #64748b; }

                /* Action Bar Mobile Premium - Vertical Stacked */
                .mobile-action-bar {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: rgba(255, 255, 255, 0.98);
                    backdrop-filter: blur(20px);
                    padding: 16px 24px 34px; /* Un poco menos de padding superior sin el precio */
                    border-top: 1px solid #f1f5f9;
                    display: flex;
                    flex-direction: column; /* Stacked layout */
                    gap: 12px;
                    z-index: 1005;
                    box-shadow: 0 -10px 40px rgba(0,0,0,0.1);
                }
                @media (min-width: 1024px) { .mobile-action-bar { display: none; } }

                .buttons-group-mobile { 
                    display: flex; 
                    flex-direction: column; /* Stacked buttons */
                    gap: 12px; 
                    width: 100%;
                }

                .btn-mobile-buy {
                    background: #1e1b4b;
                    color: white;
                    border: none;
                    width: 100%;
                    height: 58px;
                    border-radius: 18px;
                    font-weight: 900;
                    font-size: 16px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    box-shadow: 0 4px 15px rgba(30, 27, 75, 0.2);
                }

                .btn-mobile-whatsapp-full {
                    background: #f0fdf4;
                    color: #166534;
                    border: 1px solid #dcfce7;
                    width: 100%;
                    height: 58px;
                    border-radius: 18px;
                    font-weight: 800;
                    font-size: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    cursor: pointer;
                }
                .btn-mobile-whatsapp-full:active { background: #dcfce7; }

                /* Mobile Selection Summary */
                .mobile-selection-summary-container {
                    margin: 20px 0;
                    animation: fadeIn 0.4s ease;
                }
                .btn-open-selection-drawer {
                    width: 100%;
                    background: #fdf2f8;
                    border: 1px solid #fbcfe8;
                    border-radius: 16px;
                    padding: 16px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: left;
                }
                .btn-open-selection-drawer:active { transform: scale(0.98); background: #fce7f3; }
                
                .summary-label {
                    display: block;
                    font-size: 10px;
                    font-weight: 900;
                    color: #9d174d;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 4px;
                }
                .summary-values { display: flex; flex-wrap: wrap; gap: 4px; }
                .summary-val-badge { font-size: 15px; font-weight: 800; color: #1e1b4b; }
                .summary-placeholder { font-size: 15px; font-weight: 800; color: #94a3b8; }
                .summary-arrow { color: #8f0653; opacity: 0.6; }

                /* Premium Loader */
                .detalle-loading { height: 80vh; display: flex; align-items: center; justify-content: center; }
                .premium-loader { width: 50px; height: 50px; border: 4px solid #f1f5f9; border-top-color: #8f0653; border-radius: 50%; animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default DetalleProducto;
