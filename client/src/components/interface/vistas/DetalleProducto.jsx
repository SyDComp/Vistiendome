import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Share2, ShieldCheck, Truck, MapPin, MessageCircle, ShoppingBag, X, ChevronRight } from 'lucide-react';
import ProductPreviewCarousel from '../detalles/ProductPreviewCarousel';
import VariantSelector from '../detalles/VariantSelector';
import VariantSelectionDrawer from '../detalles/VariantSelectionDrawer';
import Navbar from '../../layout/navbar/Navbar';
import PremiumLoader from '../../ui/PremiumLoader';
import { getProductBySlug, getImageUrl } from '../../../services/api';
import { useCart } from '../../../context/CartContext';
import { useNotification } from '../../../context/NotificationContext';
import ReactBarcode from 'react-barcode';
import { Barcode as BarcodeIcon } from 'lucide-react';
import './DetalleProducto.css';

const generateEAN13 = (text) => {
    if (!text) return '';
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash = hash & hash;
    }
    let hashStr = Math.abs(hash).toString().padStart(12, '0');
    while (hashStr.length < 12) hashStr += hashStr;
    hashStr = hashStr.substring(0, 12);
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(hashStr[i]) * (i % 2 === 0 ? 1 : 3);
    return hashStr + ((10 - (sum % 10)) % 10);
};



const DetalleProducto = ({ producto: initialProduct, isModal = false }) => {
    const { slug, sku: variantSkuCode, imgIndex, collectionSlug } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const containerRef = useRef(null);
    const [searchParams] = useSearchParams();
    const fromSearch = searchParams.get('from_search');
    const { addItem } = useCart();
    const { toast } = useNotification();
    const [producto, setProducto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    
    // Estado de selecciones
    const [selections, setSelections] = useState({});
    const [showShareToast, setShowShareToast] = useState(false);
    const [showBarcode, setShowBarcode] = useState(false); // Estado para mostrar código de barras

    const handleShare = async () => {
        const shareUrl = window.location.href;
        const shareTitle = producto?.name ? `${producto.name} — Vistiendomé` : 'Vistiendomé';
        const shareText = producto?.name ? `Mira esta pieza: ${producto.name}` : 'Mira esta pieza de Vistiendomé';

        // Usar la API nativa de compartir en móviles (funciona en todos los dispositivos reales)
        if (navigator.share) {
            try {
                await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
                return; // El usuario compartió o canceló, no necesitamos toast
            } catch (err) {
                // Si el usuario canceló, simplemente salimos
                if (err.name === 'AbortError') return;
                // Si falló por otra razón, caemos al fallback
            }
        }

        // Fallback para escritorio: copiar al portapapeles
        try {
            await navigator.clipboard.writeText(shareUrl);
            setShowShareToast(true);
            setTimeout(() => setShowShareToast(false), 2000);
        } catch {
            // Último recurso si clipboard también falla
            const textArea = document.createElement('textarea');
            textArea.value = shareUrl;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setShowShareToast(true);
            setTimeout(() => setShowShareToast(false), 2000);
        }
    };

    // Función inteligente de salida
    const handleClose = () => {
        if (location.state?.backgroundLocation) {
            navigate(-1);
            return;
        }
        if (fromSearch) {
            navigate(`/search?q=${encodeURIComponent(fromSearch)}`);
            return;
        }
        if (collectionSlug) {
            navigate(`/coleccion/${collectionSlug}`);
            return;
        }
        navigate('/catalogo');
    };

    useEffect(() => {
        setSelections({});
    }, [slug]);

    const formatSku = (skuStr) => {
        if (!skuStr) return "";
        let clean = skuStr;
        if (clean.toLowerCase().startsWith('pr-')) {
            clean = clean.slice(3);
        }
        return clean.replace(/_/g, ' ').replace(/-/g, ' • ');
    };

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

    const VALOR_NA = "No aplica";

    const llavesMaestras = useMemo(() => {
        if (!producto?.skus) return [];
        const keys = new Set();
        producto.skus.forEach(s => {
            Object.keys(s.config || {}).forEach(k => keys.add(k));
        });
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

    // Bloqueo de scroll global cuando el componente está montado
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, []);

    // Scroll to top o a la imagen al cambiar
    useEffect(() => {
        if (!containerRef.current) return;
        containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }, [location.pathname]);

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
        const attrs = llavesMaestras.map(key => {
            const isColor = key.toLowerCase() === 'color';
            const opcionesRaw = [...new Set(skusNormalizados.map(s => s.config?.[key]))];
            const opcionesReales = opcionesRaw.filter(o => o !== VALOR_NA);
            const opcionesAProcesar = opcionesReales.length > 0 ? opcionesReales : [VALOR_NA];

            const opcionesConMetadata = opcionesAProcesar.map(opc => {
                let thumb = null;
                if (isColor && opc !== VALOR_NA) {
                    const representativeSku = skusNormalizados.find(s => s.config[key] === opc && s.image_urls?.length > 0);
                    if (representativeSku) thumb = getImageUrl(representativeSku.image_urls[0]);
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
        }).filter(attr => {
            if (attr.opciones.length === 1 && attr.opciones[0].valor === VALOR_NA) return false;
            return true;
        });
        // Ordenar: primero los seleccionables (>1 opción), luego los de solo lectura (1 opción)
        return attrs.sort((a, b) => {
            const aSelectable = a.opciones.length > 1 ? 0 : 1;
            const bSelectable = b.opciones.length > 1 ? 0 : 1;
            return aSelectable - bSelectable;
        });
    }, [llavesMaestras, skusNormalizados]);

    const skuActual = useMemo(() => {
        if (!skusNormalizados || Object.keys(selections).length === 0) return null;
        return skusNormalizados.find(s => {
            return Object.entries(selections).every(([key, val]) => s.config?.[key] === val);
        });
    }, [skusNormalizados, selections]);

    const lastUrlSku = React.useRef(variantSkuCode);

    useEffect(() => {
        if (!configAtributos.length || !skusNormalizados.length) return;
        if (Object.keys(selections).length === 0) {
            if (variantSkuCode) {
                lastUrlSku.current = variantSkuCode;
                const urlMatch = skusNormalizados.find(s => s.sku === variantSkuCode);
                if (urlMatch) { setSelections({ ...urlMatch.config }); return; }
            }
            const getFileName = (path) => path?.split(/[?#]/)[0].split(/[\\\\/]/).pop()?.toLowerCase();
            const coverImage = producto?.image;
            const coverFileName = getFileName(coverImage);
            const matchingSku = coverImage ? skusNormalizados.find(s => 
                s.image_urls?.some(url => getFileName(url) === coverFileName)
            ) : null;
            if (matchingSku) { setSelections({ ...matchingSku.config }); } 
            else {
                const fallback = {};
                configAtributos.forEach(attr => {
                    const bestOption = attr.opciones.find(o => o.valor !== VALOR_NA) || attr.opciones[0];
                    fallback[attr.id] = bestOption.valor;
                });
                setSelections(fallback);
            }
            return;
        }
        if (variantSkuCode !== lastUrlSku.current) {
            lastUrlSku.current = variantSkuCode;
            const urlMatch = skusNormalizados.find(s => s.sku === variantSkuCode);
            if (urlMatch) setSelections({ ...urlMatch.config });
            return;
        }
        if (skuActual && skuActual.sku !== variantSkuCode) {
            lastUrlSku.current = skuActual.sku;
            const targetUrl = collectionSlug 
                ? `/coleccion/${collectionSlug}/producto/${producto?.slug || slug}/${skuActual.sku}`
                : `/catalogo/producto/${producto?.slug || slug}/${skuActual.sku}`;
            navigate(targetUrl, { replace: true, state: location.state });
        }
    }, [configAtributos, skusNormalizados, variantSkuCode, skuActual, slug, navigate, location.state, selections, producto, imgIndex, collectionSlug]);

    const checkOptionReachability = (attrId, value) => {
        return skusNormalizados.some(s => {
            if (s.config[attrId] !== value) return false;
            return Object.entries(selections).every(([k, v]) => {
                if (k === attrId) return true;
                return s.config[k] === v;
            });
        });
    };

    const handleJumpToSKU = (config) => {
        setSelections(prev => {
            const next = { ...prev };
            Object.entries(config).forEach(([k, v]) => { next[k] = v; });
            return next;
        });
    };

    const handleOptionChange = (attrId, value) => {
        setSelections(prev => {
            const currentSelections = { ...prev, [attrId]: value };
            const matches = skusNormalizados.filter(s => s.config[attrId] === value);
            if (matches.length > 0) {
                const exactMatch = matches.find(s => Object.entries(currentSelections).every(([k, v]) => s.config[k] === v));
                if (!exactMatch) {
                    let bestMatch = matches[0];
                    let maxCoincidencias = -1;
                    matches.forEach(s => {
                        let coincidencias = 0;
                        Object.entries(currentSelections).forEach(([k, v]) => { if (s.config[k] === v) coincidencias++; });
                        if (coincidencias > maxCoincidencias) { maxCoincidencias = coincidencias; bestMatch = s; }
                    });
                    const finalSelections = { ...currentSelections };
                    llavesMaestras.forEach(k => { finalSelections[k] = bestMatch.config[k]; });
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
            ? '\n\n_Detalles técnicos:_\n' + Object.entries(producto.specs).map(([k, v]) => `• ${k}: ${v}`).join('\n')
            : '';
        const message = `¡Hola Paola! ✨ \n\nMe interesa este producto: *${producto.name}*\n\n${selectionsText}${specsText}\n\n¿Podrías darme más información?`;
        const url = `https://wa.me/569XXXXXXXX?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    if (loading) return <PremiumLoader text="Materializando tu próxima pieza de autor..." />;
    
    if (error || !producto) return <div className="detail-error">{error || "Producto no disponible"}</div>;

    return (
        <>
            <button className="btn-close-detail" onClick={handleClose} title="Volver">
                <ChevronLeft size={24} />
            </button>
            <button className="btn-share-fixed" onClick={handleShare} title="Compartir">
                <Share2 size={20} />
            </button>

            <div ref={containerRef} className={`detalle-producto-container fade-in ${isModal ? 'is-modal-view' : ''}`}>
                {/* Loader Premium */}
                <main className="container main-content-wrapper">
                    <div className="detalle-grid-premium">
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
                                            const targetUrl = collectionSlug 
                                                ? `/coleccion/${collectionSlug}/producto/${slug}/${skuActual.sku}/${newIndex}`
                                                : `/catalogo/producto/${slug}/${skuActual.sku}/${newIndex}`;
                                            navigate(targetUrl, { replace: true, state: location.state });
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="detalle-column-right">
                            <header className="product-header-premium">
                                <div className="detalle-producto-header-top">
                                    <span className="product-category-tag">{producto.category?.name}</span>
                                </div>
                                <h1 className="product-title-elegant">{producto.name}</h1>
                                {skuActual && (
                                    <div className="detalle-producto-sku-container">
                                        <div className={`product-sku-pill ${showBarcode ? 'has-barcode' : ''}`}>
                                            <span className="sku-label">SKU</span>
                                            <span className="sku-val">{formatSku(skuActual.sku)}</span>
                                            <button 
                                                onClick={() => setShowBarcode(!showBarcode)}
                                                className={`barcode-toggle-btn ${showBarcode ? 'active' : ''}`}
                                                title="Ver código de barras"
                                            >
                                                <BarcodeIcon size={14} />
                                            </button>
                                        </div>
                                        
                                        {showBarcode && (
                                            <div className="barcode-display-container">
                                                <div 
                                                    className="barcode-wrapper"
                                                    ref={node => {
                                                        if (node) {
                                                            const svg = node.querySelector('svg');
                                                            if (svg) {
                                                                svg.style.maxWidth = '100%';
                                                                svg.style.height = 'auto';
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <ReactBarcode 
                                                        value={skuActual.barcode || generateEAN13(skuActual.sku) || '000000'} 
                                                        format="CODE128" 
                                                        width={1.2} 
                                                        height={40} 
                                                        fontSize={12} 
                                                        displayValue={true} 
                                                        margin={0} 
                                                        background="transparent" 
                                                    />
                                                </div>
                                            </div>
                                        )}
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

                            {isMobile && (
                                <div className="mobile-selection-summary-container">
                                    <button className="btn-open-selection-drawer" onClick={() => setIsDrawerOpen(true)}>
                                        <div className="summary-info">
                                            <span className="summary-label">Opciones seleccionadas</span>
                                            <div className="summary-values">
                                                {Object.entries(selections).length > 0 ? (
                                                    Object.entries(selections).map(([id, val], i) => (
                                                        <React.Fragment key={id}>
                                                            <span className="summary-val-badge">
                                                                {val === 'No aplica' ? 'Estándar' : val}
                                                            </span>
                                                            {i < Object.entries(selections).length - 1 && (
                                                                <span className="summary-bullet">•</span>
                                                            )}
                                                        </React.Fragment>
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

                            <div className="cta-grid-desktop">
                                <button 
                                    className="btn-primary-premium"
                                    onClick={() => {
                                        const selectedCount = Object.keys(selections).length;
                                        if (selectedCount < configAtributos.length) { setIsDrawerOpen(true); } 
                                        else {
                                            const rawImage = skuActual?.image_urls?.[0] || producto?.image;
                                            const currentImage = getImageUrl(rawImage);
                                            addItem({
                                                productId: producto.id,
                                                sku: skuActual?.sku,
                                                name: producto.name,
                                                price: precioFinal,
                                                image: currentImage,
                                                variantLabel: Object.entries(selections).map(([k, v]) => `${k}: ${v}`).join(', '),
                                                selections: selections,
                                                productUrl: window.location.href
                                            });
                                        }
                                    }}
                                >
                                    <ShoppingBag size={20} />
                                    Añadir a Cotización
                                </button>
                                <button className="btn-secondary-premium" onClick={handleWhatsApp}>
                                    <MessageCircle size={20} />
                                    Consultar
                                </button>
                            </div>

                            <div className="trust-badges-refined">
                                <div className="trust-item-mini">
                                    <ShieldCheck size={16} />
                                    <span>Calidad Garantizada</span>
                                </div>
                                <div className="trust-item-mini">
                                    <Truck size={16} />
                                    <span>Despacho Express</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>

                <div className="mobile-action-bar">
                    <div className="buttons-group-mobile">
                        <button 
                            className="btn-mobile-buy"
                            onClick={() => {
                                const selectedCount = Object.keys(selections).length;
                                if (selectedCount < configAtributos.length) { setIsDrawerOpen(true); } 
                                else {
                                    const rawImage = skuActual?.image_urls?.[0] || producto?.image;
                                    const currentImage = getImageUrl(rawImage);
                                    addItem({
                                        productId: producto.id,
                                        sku: skuActual?.sku,
                                        name: producto.name,
                                        price: precioFinal,
                                        image: currentImage,
                                        variantLabel: Object.entries(selections).map(([k, v]) => `${k}: ${v}`).join(', '),
                                        selections: selections,
                                        productUrl: window.location.href
                                    });
                                }
                            }}
                        >
                            <ShoppingBag size={20} />
                            Al Carrito
                        </button>
                        <button className="btn-mobile-whatsapp-full" onClick={handleWhatsApp}>
                            <MessageCircle size={20} />
                            Consultar
                        </button>
                    </div>
                </div>
            </div>

            {showShareToast && (
                <div className="share-toast-premium">
                    <div className="toast-dot" />
                    Enlace de pieza única copiado
                </div>
            )}

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
        </>
    );
};

export default DetalleProducto;
