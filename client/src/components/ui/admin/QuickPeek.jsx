import React, { useState, useEffect } from 'react';
import { Package, Tag, Layers, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getImageUrl } from '../../../lib/api/endpoints';

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
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            pointerEvents: isVisible ? 'auto' : 'none',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}>
            {/* Backdrop */}
            <div 
                onClick={onClose}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(8px)',
                    opacity: isVisible ? 1 : 0,
                    transition: 'opacity 0.4s ease'
                }} 
            />

            {/* Card */}
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '440px',
                background: '#fff',
                borderRadius: '32px',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)',
                opacity: isVisible ? 1 : 0,
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        zIndex: 10,
                        width: '36px',
                        height: '36px',
                        borderRadius: '12px',
                        background: 'rgba(255,255,255,0.8)',
                        backdropFilter: 'blur(8px)',
                        border: 'none',
                        color: '#1e293b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                >
                    <X size={18} />
                </button>

                {/* Image Section */}
                <div style={{ position: 'relative', aspectRatio: '1/1', background: '#f8fafc' }}>
                    {images.length > 0 ? (
                        <>
                            <img 
                                src={getImageUrl(images[activeImg]?.url || images[activeImg])} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                alt={name}
                            />
                            {images.length > 1 && (
                                <>
                                    <button onClick={() => go(-1)} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}><ChevronLeft size={16} /></button>
                                    <button onClick={() => go(1)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}><ChevronRight size={16} /></button>
                                    
                                    {/* Indicators */}
                                    <div style={{ position: 'absolute', bottom: '16px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px' }}>
                                        {images.map((_, i) => (
                                            <div key={i} style={{ width: i === activeImg ? '20px' : '6px', height: '6px', borderRadius: '3px', background: i === activeImg ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'all 0.3s ease' }} />
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                            <Package size={64} />
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div style={{ padding: '24px' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#8f0653', textTransform: 'uppercase', letterSpacing: '1px' }}>{type === 'variant' ? 'Variante SKU' : 'Producto Base'}</span>
                        <h2 style={{ margin: '4px 0 0 0', fontSize: '20px', fontWeight: '900', color: '#1e1b4b' }}>{name}</h2>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '16px' }}>
                            <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>Precio</div>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: '#16a34a' }}>{priceDisplay}</div>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '16px' }}>
                            <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>{type === 'variant' ? 'Stock Disponible' : 'Stock Total'}</div>
                            <div style={{ fontSize: '18px', fontWeight: '800', color: stock === 0 ? '#ef4444' : '#1e1b4b' }}>{stock} <span style={{ fontSize: '12px', fontWeight: '600', color: '#94a3b8' }}>und.</span></div>
                        </div>
                    </div>

                    {data?.config && (
                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Configuración</div>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {Object.entries(data.config).map(([key, val], i) => (
                                    <span key={i} style={{ padding: '4px 10px', background: '#f1f5f9', color: '#475569', borderRadius: '8px', fontSize: '12px', fontWeight: '700' }}>
                                        {key}: {val}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button 
                            onClick={onClose}
                            style={{ 
                                flex: 1, 
                                height: '48px', 
                                borderRadius: '14px', 
                                background: '#1e1b4b', 
                                color: '#fff', 
                                border: 'none', 
                                fontWeight: '800', 
                                fontSize: '14px', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px'
                            }}
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
