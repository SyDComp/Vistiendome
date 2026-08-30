import React, { useState, useEffect } from 'react';
import { X, Sparkles, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import Imagen from '../../../ui/Imagen';

/**
 * MediaLightbox Component (Presentational)
 * Renders the full screen immersive viewer with navigation controls and portada management.
 */
const MediaLightbox = ({
    img,
    mainId,
    onSetMain,
    onClose,
    onPrev,
    onNext,
    onUpdateAlias
}) => {
    const [aliasDraft, setAliasDraft] = useState('');

    useEffect(() => {
        setAliasDraft(img?.alias || img?.original_name || '');
    }, [img?.id]);

    if (!img) return null;

    return (
        <div className="media-gallery-lightbox-overlay">
            <div className="media-gallery-lightbox-header">
                <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="media-gallery-lightbox-title-label">Nombre amigable</span>
                    {onUpdateAlias ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                            <input
                                value={aliasDraft}
                                onChange={(e) => setAliasDraft(e.target.value)}
                                placeholder="Ej: Vestido Noemi Azul"
                                style={{ flex: 1, maxWidth: '360px', height: '38px', padding: '0 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px' }}
                            />
                            <button
                                onClick={(e) => { e.stopPropagation(); onUpdateAlias(img.id, aliasDraft); }}
                                title="Guardar nombre"
                                style={{ height: '38px', padding: '0 14px', borderRadius: '10px', border: 'none', background: '#8f0653', color: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                <Check size={16} /> Guardar
                            </button>
                        </div>
                    ) : (
                        <h4 className="media-gallery-lightbox-title">{img.alias || img.original_name || 'Detalle de imagen'}</h4>
                    )}
                </div>
                <div className="media-gallery-lightbox-actions">
                    {onSetMain && img.id !== mainId && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onSetMain(img);
                            }}
                            className="media-gallery-lightbox-set-main-btn"
                        >
                            <Sparkles size={18} /> ESTABLECER PORTADA
                        </button>
                    )}
                    {img.id === mainId && (
                        <div className="media-gallery-lightbox-main-indicator">
                            PORTADA ACTUAL
                        </div>
                    )}
                    <button onClick={onClose} className="media-gallery-lightbox-close-btn">
                        <X size={32} />
                    </button>
                </div>
            </div>
            <div className="media-gallery-lightbox-body">
                <button className="media-gallery-lightbox-arrow-left" onClick={onPrev}>
                    <ChevronLeft size={64} />
                </button>
                <Imagen
                    className="media-gallery-lightbox-img"
                    url={img.url}
                    alt={img.filename || ''}
                    sizes="90vw"
                />
                <button className="media-gallery-lightbox-arrow-right" onClick={onNext}>
                    <ChevronRight size={64} />
                </button>
            </div>
        </div>
    );
};

export default MediaLightbox;
