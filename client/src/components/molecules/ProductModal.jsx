import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useCart } from '../../context/CartContext';
import { useConfig } from '../../context/ConfigContext';
import './ProductModal.css';

const ProductModal = ({ product, onClose }) => {
    const { addToCart } = useCart();
    const { configs } = useConfig();
    const [showDetails, setShowDetails] = useState(false);
    const descriptionRef = React.useRef(null);

    const isCatalogMode = configs?.catalog_mode === 'Activado';
    const vacationMode = configs?.vacation_mode_settings || {};
    const isVacationMode = vacationMode.active;

    // Prevent body scroll when modal is open using "Fixed + Offset" trick
    useEffect(() => {
        if (product) {
            // ONLY if scroll is not already locked by another modal
            if (!document.body.classList.contains('modal-open')) {
                const scrollY = window.scrollY;
                document.body.style.position = 'fixed';
                document.body.style.top = `-${scrollY}px`;
                document.body.style.width = '100vw';
                document.body.classList.add('modal-open');
                document.body.classList.add('product-modal-open');
            }

            if (descriptionRef.current) {
                descriptionRef.current.scrollTop = 0;
            }

            return () => {
                // ALWAYS restore navbar visibility immediately when unmounting
                document.body.classList.remove('product-modal-open');

                // Check if any other modal is still active for scroll locking
                setTimeout(() => {
                    const activeModals = document.querySelectorAll('.modal-overlay, .cart-drawer-overlay, .mobile-menu-open');
                    if (activeModals.length === 0) {
                        const scrollY = document.body.style.top;
                        document.body.style.position = '';
                        document.body.style.top = '';
                        document.body.style.width = '';
                        document.body.classList.remove('modal-open');
                        window.scrollTo(0, parseInt(scrollY || '0') * -1);
                    }
                }, 50);
            };
        }
    }, [product]);

    if (!product) return null;

    const handleAddToCart = () => {
        addToCart(product);
        onClose();
    };

    // Fallback image
    const imageSrc = product.images && product.images.length > 0
        ? `${(import.meta.env.VITE_API_URL || '/api/v1').replace('/api/v1', '')}/static/${product.images[0]}`
        : 'https://images.unsplash.com/photo-1592078615290-033ee584e267?q=80&w=2564&auto=format&fit=crop';

    return createPortal(
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>&times;</button>
                <div className="modal-grid">
                    {/* Image Section */}
                    {/* Image Section - Standard View (NDE disabled as requested) */}
                    <div className="modal-image-container">
                        <div className="product-modal-image-wrapper">
                            <img
                                src={imageSrc}
                                alt={product.name}
                                className="product-modal-image"
                                style={{
                                    objectFit: 'contain',
                                    backgroundColor: '#fcfcfc'
                                }}
                            />
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="modal-info">
                        <div className="modal-fixed-header">
                            <div className="modal-header-top">
                                <p className="modal-category">{product.category?.name || 'Colección General'}</p>
                                <h2 className="modal-title">{product.name}</h2>
                            </div>
                            {!isCatalogMode && (
                                <div className="modal-price">
                                    ${Number(product.price).toLocaleString('es-CL')}
                                </div>
                            )}
                        </div>

                        <div className="section-header-row" onClick={() => setShowDetails(true)}>
                            <h3 className="section-label">Sobre el Producto</h3>
                            <button className="details-trigger-mobile" aria-label="Ver más">
                                Ver más <span>→</span>
                            </button>
                        </div>

                        <div className="modal-body-product" ref={descriptionRef}>
                            <div className="modal-section">
                                <div className="modal-description">
                                    <p>{product.description || "Pieza única creada artesanalmente. Los detalles y texturas son propios de su manufactura manual, garantizando que adquieres un objeto irrepetible."}</p>
                                </div>
                            </div>
                        </div>

                        <div className="modal-meta">
                            <div className="meta-item">
                                <span className="label">Disponibilidad:</span>
                                <span className={product.stock > 0 ? "value in-stock" : "value out-stock"}>
                                    {product.stock > 0 ? "En Stock" : "Agotado"}
                                </span>
                            </div>
                            {(product.height || product.width || product.depth) && (
                                <div className="meta-item">
                                    <span className="label">Medidas:</span>
                                    <span className="value">
                                        {product.height || '?'}{' x '}{product.width || '?'}{' x '}{product.depth || '?'}{' cm'}
                                        <br />
                                        <small style={{ color: '#888', fontSize: '0.75rem' }}>(Alto x Ancho x Largo)</small>
                                    </span>
                                </div>
                            )}
                            <div className="meta-item">
                                <span className="label">Artesano:</span>
                                <span className="value">N&M Taller</span>
                            </div>
                        </div>

                        <div className="modal-actions">
                            {!isCatalogMode && (
                                <>
                                    {isVacationMode ? (
                                        <div style={{ width: '100%' }}>
                                            <button className="btn-secondary full-width" disabled style={{ cursor: 'not-allowed', marginBottom: '0.5rem' }}>
                                                Tienda en Pausa
                                            </button>
                                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#b45309', textAlign: 'center', background: '#fffbeb', padding: '0.5rem', borderRadius: '4px' }}>
                                                {vacationMode.message}
                                            </p>
                                        </div>
                                    ) : product.stock > 0 ? (
                                        <button className="btn-primary full-width" onClick={handleAddToCart}>
                                            <span className="desktop-text">Agregar al Carrito</span>
                                            <span className="mobile-text">Al Carrito</span>
                                        </button>
                                    ) : (
                                        <button className="btn-secondary full-width" disabled>
                                            Agotado
                                        </button>
                                    )}
                                </>
                            )}

                            {/* MercadoLibre Button */}
                            {product.mercadolibre_url && (
                                <a
                                    href={product.mercadolibre_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-mercadolibre full-width"
                                    onMouseEnter={(e) => e.target.style.background = '#FFD700'}
                                    onMouseLeave={(e) => e.target.style.background = '#FFE600'}
                                >
                                    🛒
                                    <span className="desktop-text" style={{ marginLeft: '0.4rem' }}>Ver en MercadoLibre</span>
                                    <span className="mobile-text" style={{ marginLeft: '0.4rem' }}>MercadoLibre</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Mobile Details Drawer */}
                <div className={`product-details-drawer ${showDetails ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
                    <div className="drawer-header">
                        <h3>Detalles del Producto</h3>
                        <button className="close-drawer-btn" onClick={() => setShowDetails(false)}>&times;</button>
                    </div>
                    <div className="drawer-body">
                        <div className="drawer-section">
                            <p className="drawer-description-text">{product.description || "Pieza única creada artesanalmente."}</p>
                        </div>
                        
                        <div className="drawer-footer-actions">
                            <button className="btn-drawer-close" onClick={() => setShowDetails(false)}>
                                Cerrar Detalles
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ProductModal;
