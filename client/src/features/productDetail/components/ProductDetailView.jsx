import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Share2, ShieldCheck, Truck, MessageCircle, ShoppingBag, Barcode as BarcodeIcon } from 'lucide-react';
import ReactBarcode from 'react-barcode';
import ProductPreviewCarousel from './ProductPreviewCarousel';
import VariantSelector from './VariantSelector';
import VariantSelectionDrawer from './VariantSelectionDrawer';
import { useCart } from '../../../context/CartContext.jsx';
import { useNotification } from '../../../context/NotificationContext.jsx';
import { useSettings } from '../../../context/SettingsContext.jsx';
import { getImageUrl } from '../../../lib/api/endpoints/index.js';
import useProductDetail from '../hooks/useProductDetail';
import { generateEAN13, formatSku } from '../utils/skuUtils';
import { handleShare } from '../utils/shareUtils';
import { buildWhatsAppMessage } from '../../../utils/cartUtils';
import { track } from '../../../lib/analytics';
import '../productDetail.css';

const ProductDetailView = ({ producto: initialProduct, isModal = false }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { addItem } = useCart();
    const { toast } = useNotification();
    const { settings } = useSettings();

    const {
        producto,
        loading,
        error,
        selections,
        skuActual,
        configAtributos,
        skusNormalizados,
        isMobile,
        precioFinal,
        handleOptionChange,
        handleJumpToSKU,
        checkOptionReachability,
        handleClose: hookHandleClose,
        showShareToast,
        setShowShareToast,
        showBarcode,
        setShowBarcode,
        imgIndex,
        collectionSlug,
        slug,
    } = useProductDetail(location.state?.initialProduct || initialProduct);

    // Analítica: registrar vista de producto
    useEffect(() => {
        if (producto?.id) {
            track('view', { product_id: producto.id });
        }
    }, [producto?.id]);

    const onShare = async () => {
        const result = await handleShare(producto?.name);
        if (result.copied) setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2000);
    };

    const onClose = () => {
        hookHandleClose();
    };

    const onWhatsApp = () => {
        if (loading || !producto || !skuActual || !precioFinal || precioFinal <= 0) return;
        const priorityOrder = ['talla', 'color'];
        const variantLabel = Object.entries(selections)
            .sort(([keyA], [keyB]) => {
                const indexA = priorityOrder.indexOf(keyA.toLowerCase());
                const indexB = priorityOrder.indexOf(keyB.toLowerCase());
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1;
                if (indexB !== -1) return 1;
                return keyA.localeCompare(keyB);
            })
            .map(([key, val]) => `${key.charAt(0).toUpperCase() + key.slice(1)} ${val}`)
            .join(' / ');
        const message = buildWhatsAppMessage({
            tipo: 'pedido',
            productos: [{ name: producto.name, variantLabel, selections, url: window.location.href }],
        });
        const contactNumber = settings?.social_links?.whatsapp?.replace(/\D/g, '') || '569XXXXXXXX';
        const url = `https://wa.me/${contactNumber}?text=${encodeURIComponent(message)}`;
        track('checkout_whatsapp', { product_id: producto?.id, sku: skuActual?.sku });
        window.open(url, '_blank');
    };

    const addToCart = () => {
        if (loading || !producto || !skuActual || !precioFinal || precioFinal <= 0) return;
        const rawImage = skuActual?.image_urls?.[0] || producto?.image;
        const currentImage = getImageUrl(rawImage);
        addItem({
            productId: producto?.id,
            sku: skuActual?.sku,
            name: producto?.name,
            price: precioFinal,
            image: currentImage,
            variantLabel: Object.entries(selections).map(([k, v]) => `${k}: ${v}`).join(', '),
            selections: selections,
            productUrl: window.location.href,
        });
        track('add_to_cart', { product_id: producto?.id, sku: skuActual?.sku });
    };

    const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

    if (error && !producto) return <div className="detail-error">{error || 'Producto no disponible'}</div>;

    return (
        <>
            <button className="btn-close-detail" onClick={onClose} title="Volver">
                <ChevronLeft size={24} />
            </button>
            <button className="btn-share-fixed" onClick={onShare} title="Compartir">
                <Share2 size={20} />
            </button>

            <div className={`detalle-producto-container fade-in ${isModal ? 'is-modal-view' : ''}`}>
                <main className="container main-content-wrapper">
                    <div className="detalle-grid-premium">
                        <div className="detalle-column-left">
                            <div className="sticky-gallery-container">
                                {loading && !producto ? (
                                    <div className="skeleton-box" style={{ height: '70vh', width: '100%', borderRadius: '16px' }}></div>
                                ) : (
                                    <ProductPreviewCarousel
                                        skus={skusNormalizados}
                                        coverImage={producto?.image}
                                        skuActual={skuActual}
                                        onJumpToVariant={(config) => handleJumpToSKU(config)}
                                        imgIndex={imgIndex}
                                        onImageSelected={(newIndex) => {
                                            if (!skuActual) return;
                                            const targetUrl = collectionSlug
                                                ? `/coleccion/${collectionSlug}/producto/${slug}/${skuActual.sku}/${newIndex}`
                                                : `/catalogo/producto/${slug}/${skuActual.sku}/${newIndex}`;
                                            navigate(targetUrl, { replace: true, state: location.state });
                                        }}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="detalle-column-right">
                            <header className="product-header-premium">
                                <div className="detalle-producto-header-top">
                                    <span className="product-category-tag">{producto?.category?.name}</span>
                                </div>
                                <h1 className="product-title-elegant">
                                    {loading && !producto ? (
                                        <div className="skeleton-box" style={{ height: '36px', width: '70%', borderRadius: '8px' }}></div>
                                    ) : (
                                        producto?.name
                                    )}
                                </h1>
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
                                                <div className="barcode-wrapper">
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
                                    {loading && !producto ? (
                                        <div className="skeleton-box" style={{ height: '36px', width: '120px', borderRadius: '8px' }}></div>
                                    ) : (() => {
                                        const refSku = skuActual || producto?.skus?.[0];
                                        const onSale = refSku?.on_sale && refSku?.original_price > precioFinal;
                                        return (
                                            <>
                                                {onSale && <span className="price-sale-badge">Oferta</span>}
                                                {onSale && (
                                                    <span className="price-original">${refSku.original_price.toLocaleString('es-CL')}</span>
                                                )}
                                                <span className="currency">$</span>
                                                <span className={`val${onSale ? ' val--sale' : ''}`}>{precioFinal.toLocaleString('es-CL')}</span>
                                            </>
                                        );
                                    })()}
                                </div>
                            </header>

                            <div className="product-description-refined">
                                {loading ? (
                                    <div className="skeleton-container">
                                        <div className="skeleton-box" style={{ height: '16px', width: '100%', marginBottom: '8px' }}></div>
                                        <div className="skeleton-box" style={{ height: '16px', width: '90%', marginBottom: '8px' }}></div>
                                        <div className="skeleton-box" style={{ height: '16px', width: '95%' }}></div>
                                    </div>
                                ) : (
                                    <p>{producto?.description}</p>
                                )}
                            </div>

                            <div className="divider-premium-elegant" />

                            {!isMobile && (
                                <div className="selectors-container-premium">
                                    {loading ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            <div className="skeleton-box" style={{ height: '80px', width: '100%', borderRadius: '12px' }}></div>
                                            <div className="skeleton-box" style={{ height: '80px', width: '100%', borderRadius: '12px' }}></div>
                                        </div>
                                    ) : (
                                        <VariantSelector
                                            attributes={configAtributos}
                                            selections={selections}
                                            onChange={handleOptionChange}
                                            checkOptionReachability={checkOptionReachability}
                                        />
                                    )}
                                </div>
                            )}

                            {isMobile && (
                                <div className="mobile-selection-summary-container">
                                    {loading ? (
                                        <div className="skeleton-box" style={{ height: '60px', width: '100%', borderRadius: '16px' }}></div>
                                    ) : (
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
                                            <span className="summary-arrow">›</span>
                                        </button>
                                    )}
                                </div>
                            )}

                            {(() => {
                                const validSpecs = Object.entries(producto?.specs || {}).filter(([key, val]) => {
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
                                    disabled={loading || !producto || !skuActual || !precioFinal || precioFinal <= 0}
                                    onClick={() => {
                                        const selectedCount = Object.keys(selections).length;
                                        if (selectedCount < configAtributos.length) {
                                            setIsDrawerOpen(true);
                                        } else {
                                            addToCart();
                                        }
                                    }}
                                >
                                    <ShoppingBag size={20} />
                                    {loading ? 'Cargando producto...' : 'Añadir a Cotización'}
                                </button>
                                <button
                                    className="btn-secondary-premium"
                                    disabled={loading || !producto || !skuActual || !precioFinal || precioFinal <= 0}
                                    onClick={onWhatsApp}
                                >
                                    <MessageCircle size={20} />
                                    Pedir por WhatsApp
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
                            disabled={loading || !producto || !skuActual || !precioFinal || precioFinal <= 0}
                            onClick={() => {
                                const selectedCount = Object.keys(selections).length;
                                if (selectedCount < configAtributos.length) {
                                    setIsDrawerOpen(true);
                                } else {
                                    addToCart();
                                }
                            }}
                        >
                            <ShoppingBag size={20} />
                            {loading ? 'Cargando...' : 'Al Carrito'}
                        </button>
                        <button
                            className="btn-mobile-whatsapp-full"
                            disabled={loading || !producto || !skuActual || !precioFinal || precioFinal <= 0}
                            onClick={onWhatsApp}
                        >
                            <MessageCircle size={20} />
                            Pedir por WhatsApp
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
                productName={producto?.name}
                onConfirm={() => setIsDrawerOpen(false)}
            />
        </>
    );
};

export default ProductDetailView;
