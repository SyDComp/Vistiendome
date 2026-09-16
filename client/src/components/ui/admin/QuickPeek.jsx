import React, { useState, useEffect } from 'react';
import { Package, Tag, Layers, ChevronLeft, ChevronRight, X } from 'lucide-react';
import Imagen from '../Imagen';
import './QuickPeek.css';

const QuickPeek = ({ isOpen, onClose, data, type = 'product' }) => {
    const [activeImg, setActiveImg] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setActiveImg(0);
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    if (!isOpen && !isVisible) return null;

    const images = data?.media_assets || data?.images || (data?.image_url ? [data.image_url] : []);
    const name = data?.name || data?.sku || 'Sin nombre';
    
    // Logic for price display
    let priceDisplay = '$0';
    if (type === 'product') {
        const min = data?.price_min || 0;
        const max = data?.price_max || 0;
        priceDisplay = min === max ? `$${min.toLocaleString()}` : `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    } else {
        priceDisplay = `$${(data?.price || 0).toLocaleString()}`;
    }

    const stock = data?.stock_total ?? data?.stock ?? 0;

    const go = (dir) => {
        setActiveImg(prev => (prev + dir + images.length) % images.length);
    };

    return (
        <div className="qp-overlay" style={{ pointerEvents: isVisible ? 'auto' : 'none' }}>
            {/* Backdrop */}
            <div 
                onClick={onClose}
                className="qp-fondo"
                style={{ opacity: isVisible ? 1 : 0 }} 
            />

            {/* Card */}
            <div className="qp-tarjeta" style={{
                transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)',
                opacity: isVisible ? 1 : 0,
            }}>
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="qp-cerrar"
                >
                    <X size={18} />
                </button>

                {/* Image Section */}
                <div className="qp-imagen">
                    {images.length > 0 ? (
                        <>
                            <Imagen
                                url={images[activeImg]?.url || images[activeImg]}
                                className="qp-foto"
                                alt={name}
                                sizes="400px"
                            />
                            {images.length > 1 && (
                                <>
                                    <button onClick={() => go(-1)} className="flecha-nav flecha-nav--sobre-foto flecha-nav--al-medio qp-flecha--atras"><ChevronLeft size={16} /></button>
                                    <button onClick={() => go(1)} className="flecha-nav flecha-nav--sobre-foto flecha-nav--al-medio qp-flecha--adelante"><ChevronRight size={16} /></button>
                                    
                                    {/* Indicators */}
                                    <div className="qp-puntos">
                                        {images.map((_, i) => (
                                            <div key={i} className={`qp-punto${i === activeImg ? ' qp-punto--activo' : ''}`} />
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="qp-sin-imagen">
                            <Package size={64} />
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className="qp-datos">
                    <div className="qp-encabezado">
                        <span className="qp-tipo">{type === 'variant' ? 'Variante SKU' : 'Producto Base'}</span>
                        <h2 className="qp-nombre">{name}</h2>
                    </div>

                    <div className="qp-cifras">
                        <div className="qp-cifra">
                            <div className="qp-cifra-nombre">Precio</div>
                            <div className="qp-cifra-valor qp-cifra-valor--precio">{priceDisplay}</div>
                        </div>
                        <div className="qp-cifra">
                            <div className="qp-cifra-nombre">{type === 'variant' ? 'Stock Disponible' : 'Stock Total'}</div>
                            <div className={`qp-cifra-valor${stock === 0 ? ' adm-cifra-en-cero' : ''}`}>{stock} <span className="qp-cifra-unidad">und.</span></div>
                        </div>
                    </div>

                    {data?.config && (
                        <div className="qp-config">
                            <div className="qp-config-titulo">Configuración</div>
                            <div className="qp-config-lista">
                                {Object.entries(data.config).map(([key, val], i) => (
                                    <span key={i} className="qp-config-item">
                                        {key}: {val}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="qp-acciones">
                        <button 
                            onClick={onClose}
                            className="adm-accion-oscura"
                        >
                            Listo
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuickPeek;
