import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useScrollLock } from '../../../hooks/useScrollLock';
import './ProductLightbox.css';

const ProductLightbox = ({ images = [], currentIndex = 0, isOpen, onClose, onPrev, onNext }) => {
    // Touch swipe state
    const touchStartX = useRef(null);
    const touchStartY = useRef(null);

    useScrollLock(isOpen);

    // Teclado (flechas + Escape)
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => {
            if (e.key === 'ArrowLeft') onPrev();
            else if (e.key === 'ArrowRight') onNext();
            else if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onPrev, onNext, onClose]);

    const handleTouchStart = useCallback((e) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    }, []);

    const handleTouchEnd = useCallback((e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = e.changedTouches[0].clientY - touchStartY.current;
        // Solo considerar swipe si fue más horizontal que vertical
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
            if (dx < 0) onNext();   // swipe izquierda → siguiente
            else onPrev();           // swipe derecha → anterior
        }
        touchStartX.current = null;
        touchStartY.current = null;
    }, [onNext, onPrev]);

    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('lightbox-backdrop')) {
            onClose();
        }
    };

    const lightboxContent = (
        <div
            className="lightbox-backdrop fade-in"
            onClick={handleBackdropClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <button className="lightbox-close" onClick={onClose}>
                <X size={32} />
            </button>

            <div className="lightbox-content">
                {images.length > 1 && (
                    <button className="lightbox-nav prev" onClick={onPrev}>
                        <ChevronLeft size={48} />
                    </button>
                )}

                <div className="lightbox-image-wrapper">
                    <img 
                        src={images[currentIndex]} 
                        alt={`Vista ampliada ${currentIndex + 1}`} 
                        className="lightbox-image"
                        draggable={false}
                    />
                </div>

                {images.length > 1 && (
                    <button className="lightbox-nav next" onClick={onNext}>
                        <ChevronRight size={48} />
                    </button>
                )}
            </div>

            <div className="lightbox-counter">
                {currentIndex + 1} / {images.length}
            </div>

            {/* Indicador visual de swipe en móvil */}
            {images.length > 1 && (
                <div className="lightbox-swipe-hint">
                    ← desliza →
                </div>
            )}


        </div>
    );

    return createPortal(lightboxContent, document.body);
};

export default ProductLightbox;
