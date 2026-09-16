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
                <div>
                    <span className="media-gallery-lightbox-title-label">Nombre amigable</span>
                    {onUpdateAlias ? (
                        <div className="adm-visor-fila">
                            <input
                                value={aliasDraft}
                                onChange={(e) => setAliasDraft(e.target.value)}
                                placeholder="Ej: Vestido Noemi Azul"
                                className="adm-visor-campo"
                            />
                            <button
                                onClick={(e) => { e.stopPropagation(); onUpdateAlias(img.id, aliasDraft); }}
                                title="Guardar nombre"
                                className="adm-visor-boton"
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
                <button className="flecha-nav flecha-nav--oscura flecha-nav--al-medio media-gallery-lightbox-arrow-left" onClick={onPrev}>
                    <ChevronLeft size={64} />
                </button>
                <Imagen
                    className="media-gallery-lightbox-img"
                    url={img.url}
                    alt={img.filename || ''}
                    sizes="90vw"
                />
                <button className="flecha-nav flecha-nav--oscura flecha-nav--al-medio media-gallery-lightbox-arrow-right" onClick={onNext}>
                    <ChevronRight size={64} />
                </button>
            </div>
        </div>
    );
};

export default MediaLightbox;
