import React from 'react';
import { X, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

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
    onNext
}) => {
    if (!img) return null;

    return (
        <div className="media-gallery-lightbox-overlay">
            <div className="media-gallery-lightbox-header">
                <div>
                    <span className="media-gallery-lightbox-title-label">Visualización</span>
                    <h4 className="media-gallery-lightbox-title">{img.filename || 'Detalle de imagen'}</h4>
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
                <img 
                    className="media-gallery-lightbox-img" 
                    src={`${(window.location.origin.includes('localhost') ? 'http://localhost:8000' : '')}${img.url}`} 
                    alt={img.filename || ''} 
                />
                <button className="media-gallery-lightbox-arrow-right" onClick={onNext}>
                    <ChevronRight size={64} />
                </button>
            </div>
        </div>
    );
};

export default MediaLightbox;
