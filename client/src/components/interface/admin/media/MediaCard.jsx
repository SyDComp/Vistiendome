import React from 'react';
import { Check, Star } from 'lucide-react';

/**
 * MediaCard Component (Presentational)
 * Renders a single image file card in the grid with selection indicators and set-main actions.
 */
const MediaCard = ({
    img,
    idx,
    isSelected,
    isSelectMode,
    mainId,
    onSetMain,
    onToggleSelection,
    onOpenPreview
}) => {
    return (
        <div 
            onClick={(e) => {
                e.stopPropagation();
                if (isSelectMode) onToggleSelection(img.id);
                else onOpenPreview(idx);
            }}
            className={`media-gallery-card ${isSelected ? 'is-selected' : ''}`}
        >
            <div className="media-gallery-card-img-wrapper">
                <img 
                    src={`${(window.location.origin.includes('localhost') ? 'http://localhost:8000' : '')}${img.url}`} 
                    className="media-gallery-card-img"
                    alt={img.filename || img.url || 'Imagen'}
                />
                {isSelectMode && (
                    <div className={`media-gallery-card-selection-indicator ${isSelected ? 'is-selected' : 'is-unselected'}`}>
                        {isSelected && <Check size={20} strokeWidth={4} />}
                    </div>
                )}
                {img.id === mainId ? (
                    <div className="media-gallery-card-main-badge">
                        <Star size={12} fill="#fff" /> PORTADA PR
                    </div>
                ) : (
                    onSetMain && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onSetMain(img);
                            }}
                            className="media-gallery-card-set-main-btn"
                            title="Marcar como Portada Principal"
                        >
                            <Star size={16} />
                        </button>
                    )
                )}
            </div>
            <div className="media-gallery-card-footer">
                <span className="media-gallery-card-filename">
                    {img.filename || img.url || 'Sin nombre'}
                </span>
            </div>
        </div>
    );
};

export default MediaCard;
