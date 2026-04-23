import React from 'react';
import { Trash2, AlertCircle, Image as ImageIcon, Plus, Tag, Box } from 'lucide-react';

/**
 * VariantList — Visualización de Combinaciones en formato de tarjetas.
 * Proporciona un entorno claro, espacioso y preciso para Paola.
 */
const VariantMatrix = ({ variants, onUpdate, onDelete, productImages = [], basePrice = 0 }) => {
    
    const handleChange = (index, field, value) => {
        const updated = [...variants];
        updated[index] = { ...updated[index], [field]: value };
        onUpdate(updated);
    };

    const handleToggleImageToVariant = (variantIdx, imageUrl) => {
        const updated = [...variants];
        const currentImages = updated[variantIdx].image_urls || [];
        
        let nextImages;
        if (currentImages.includes(imageUrl)) {
            nextImages = currentImages.filter(url => url !== imageUrl);
        } else {
            nextImages = [...currentImages, imageUrl];
        }
        
        updated[variantIdx] = { ...updated[variantIdx], image_urls: nextImages };
        onUpdate(updated);
    };

    if (variants.length === 0) return null;

    return (
        <div style={{ 
            marginTop: '32px', 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '24px' 
        }}>
            {variants.map((v, idx) => {
                const isPriceSuggested = v.price === basePrice;

                return (
                    <div key={idx} style={{ 
                        background: '#fff', 
                        borderRadius: '24px', 
                        border: '1px solid #e2e8f0', 
                        padding: '24px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                        position: 'relative',
                        transition: 'transform 0.2s',
                        animation: 'fadeIn 0.4s ease forwards'
                    }}>
                        {/* HEADER DE TARJETA: Combinación */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {Object.entries(v.config).map(([k, val]) => (
                                    <span key={k} style={{ 
                                        padding: '4px 10px', background: '#fdf2f8', color: '#8f0653',
                                        borderRadius: '8px', fontSize: '12px', fontWeight: '800',
                                        textTransform: 'uppercase'
                                    }}>
                                        {val}
                                    </span>
                                ))}
                            </div>
                            <button 
                                onClick={() => onDelete(idx)}
                                style={{ background: '#fef2f2', border: 'none', color: '#ef4444', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        {/* CUERPO: Campos de Entrada */}
                        <div style={{ display: 'grid', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Código identificación</label>
                                <input 
                                    type="text" 
                                    value={v.sku} 
                                    onChange={(e) => handleChange(idx, 'sku', e.target.value)}
                                    placeholder="Ej: PRIS-BLANCO-S"
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600', outline: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                                        Precio ($)
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            type="number" 
                                            value={v.price} 
                                            onChange={(e) => handleChange(idx, 'price', parseFloat(e.target.value))}
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '800', color: '#1e1b4b', outline: 'none' }}
                                        />
                                        {isPriceSuggested && (
                                            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', background: '#fffbeb', padding: '4px 8px', borderRadius: '6px', border: '1px solid #fef3c7' }}>
                                                <AlertCircle size={12} />
                                                <span style={{ fontSize: '10px', fontWeight: '700' }}>Precio sugerido: revisar o ajustar</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Unidades</label>
                                    <input 
                                        type="number" 
                                        value={v.stock} 
                                        onChange={(e) => handleChange(idx, 'stock', parseInt(e.target.value))}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '800', textAlign: 'center', outline: 'none' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* FOTOS DE ESTA VARIANTE */}
                        <div style={{ marginTop: '20px', borderTop: '1px solid #f1f5f9', paddingTop: '16px' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px' }}>Fotos del modelo</label>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {v.image_urls && v.image_urls.map((url, iIndex) => (
                                    <div key={iIndex} style={{ width: '40px', height: '40px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #8f0653' }}>
                                        <img src={`http://localhost:8000${url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                ))}
                                
                                <div style={{ position: 'relative' }}>
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            const p = e.currentTarget.nextSibling;
                                            p.style.display = p.style.display === 'none' ? 'grid' : 'none';
                                        }}
                                        style={{ width: '40px', height: '40px', borderRadius: '8px', border: '1px dashed #cbd5e1', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#8f0653' }}
                                    >
                                        <Plus size={16} />
                                    </button>
                                    <div style={{ 
                                        display: 'none', position: 'absolute', bottom: '100%', left: 0, marginBottom: '10px',
                                        background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px',
                                        boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 100, padding: '12px',
                                        gridTemplateColumns: 'repeat(4, 44px)', gap: '8px', minWidth: '220px'
                                    }}>
                                        {productImages.length === 0 && <span style={{ fontSize: '10px', color: '#94a3b8', gridColumn: 'span 4' }}>Sube fotos primero</span>}
                                        {productImages.map((img, iIdx) => (
                                            <div 
                                                key={iIdx} 
                                                onClick={() => handleToggleImageToVariant(idx, img.url)}
                                                style={{ 
                                                    width: '44px', height: '44px', borderRadius: '8px', 
                                                    overflow: 'hidden', cursor: 'pointer',
                                                    border: v.image_urls?.includes(img.url) ? '3px solid #8f0653' : '1px solid #e2e8f0'
                                                }}
                                            >
                                                <img src={`http://localhost:8000${img.url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default VariantMatrix;
