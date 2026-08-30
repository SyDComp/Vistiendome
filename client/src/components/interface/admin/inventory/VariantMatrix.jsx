import React from 'react';
import { Trash2, AlertCircle, Image as ImageIcon, Plus, Tag, Box } from 'lucide-react';
import Imagen from '../../../ui/Imagen';

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

    const handleToggleImageToVariant = (variantIdx, asset) => {
        const updated = [...variants];
        const currentAssets = updated[variantIdx].media_assets || [];
        
        let nextAssets;
        const exists = currentAssets.find(a => a.id === asset.id);
        
        if (exists) {
            nextAssets = currentAssets.filter(a => a.id !== asset.id);
        } else {
            nextAssets = [...currentAssets, asset];
        }
        
        updated[variantIdx] = { 
            ...updated[variantIdx], 
            media_assets: nextAssets,
            media_ids: nextAssets.map(a => a.id)
        };
        onUpdate(updated);
    };

    if (variants.length === 0) return null;

    return (
        <div className="vmatrix-layout">
            {variants.map((v, idx) => {
                const isPriceSuggested = v.price === basePrice;

                return (
                    <div key={idx} className="vmatrix-card">
                        {/* HEADER DE TARJETA: Combinación */}
                        <div className="vmatrix-header">
                            <div className="vmatrix-tags-wrapper">
                                {Object.entries(v.config).map(([k, val]) => (
                                    <span key={k} className="vmatrix-tag">
                                        {val}
                                    </span>
                                ))}
                            </div>
                            <button 
                                onClick={() => onDelete(idx)}
                                className="vmatrix-btn-delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        {/* CUERPO: Campos de Entrada */}
                        <div className="vmatrix-body">
                            <div>
                                <label className="vmatrix-label">Código identificación</label>
                                <input 
                                    type="text" 
                                    value={v.sku} 
                                    onChange={(e) => handleChange(idx, 'sku', e.target.value)}
                                    placeholder="Ej: PRIS-BLANCO-S"
                                    className="vmatrix-input"
                                />
                            </div>

                            <div className="vmatrix-grid-2">
                                <div>
                                    <label className="vmatrix-label">
                                        Precio ($)
                                    </label>
                                    <div style={{ position: 'relative' }}>
                                        <input 
                                            type="number" 
                                            value={v.price} 
                                            onChange={(e) => handleChange(idx, 'price', parseFloat(e.target.value))}
                                            className="vmatrix-input-price"
                                        />
                                        {isPriceSuggested && (
                                            <div className="vmatrix-suggested-alert">
                                                <AlertCircle size={12} />
                                                <span style={{ fontSize: '10px', fontWeight: '700' }}>Precio sugerido: revisar o ajustar</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label className="vmatrix-label">Unidades</label>
                                    <input 
                                        type="number" 
                                        value={v.stock} 
                                        onChange={(e) => handleChange(idx, 'stock', parseInt(e.target.value))}
                                        className="vmatrix-input-stock"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* FOTOS DE ESTA VARIANTE */}
                        <div className="vmatrix-photos-section">
                            <label className="vmatrix-label">Fotos del modelo</label>
                            <div className="vmatrix-photos-wrapper">
                                {(v.media_assets || []).map((asset, iIndex) => (
                                    <div key={asset.id || iIndex} className="vmatrix-photo-thumb">
                                        <Imagen url={asset.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} sizes="120px" alt="" />
                                    </div>
                                ))}
                                
                                <div style={{ position: 'relative' }}>
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            const p = e.currentTarget.nextSibling;
                                            p.style.display = p.style.display === 'none' ? 'grid' : 'none';
                                        }}
                                        className="vmatrix-btn-add-photo"
                                    >
                                        <Plus size={16} />
                                    </button>
                                    <div className="vmatrix-photo-picker" style={{ display: 'none' }}>
                                        {productImages.length === 0 && <span className="vmatrix-picker-empty">Sube fotos primero</span>}
                                        {productImages.map((img, iIdx) => {
                                            const assetId = img.media_asset_id || img.id;
                                            const isSelected = v.media_assets?.some(a => a.id === assetId);

                                            return (
                                                <div
                                                    key={iIdx}
                                                    onClick={() => handleToggleImageToVariant(idx, { id: assetId, url: img.url })}
                                                    className={`vmatrix-picker-thumb ${isSelected ? 'selected' : ''}`}
                                                >
                                                    <Imagen url={img.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} sizes="120px" alt="" />
                                                </div>
                                            );
                                        })}
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
