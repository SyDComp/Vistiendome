import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

const ProductLightbox = ({ images = [], currentIndex = 0, isOpen, onClose, onPrev, onNext }) => {
    // Bloquear scroll del body al estar abierto
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target.classList.contains('lightbox-backdrop')) {
            onClose();
        }
    };

    const lightboxContent = (
        <div className="lightbox-backdrop fade-in" onClick={handleBackdropClick}>
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

            <style>{`
                .lightbox-backdrop {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.95);
                    z-index: 99999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(10px);
                }
                .lightbox-content {
                    position: relative;
                    width: 100%;
                    max-width: 90vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .lightbox-image-wrapper {
                    width: 100%;
                    height: 80vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .lightbox-image {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                    border-radius: 8px;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
                }
                .lightbox-close {
                    position: absolute;
                    top: 30px;
                    right: 30px;
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    z-index: 100000;
                    transition: transform 0.2s;
                    opacity: 0.8;
                }
                .lightbox-close:hover { transform: scale(1.1); opacity: 1; }
                
                .lightbox-nav {
                    background: rgba(255, 255, 255, 0.1);
                    border: none;
                    color: white;
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s;
                    margin: 0 20px;
                    backdrop-filter: blur(5px);
                }
                .lightbox-nav:hover { background: rgba(255, 255, 255, 0.2); }
                
                .lightbox-counter {
                    position: absolute;
                    bottom: 30px;
                    left: 50%;
                    transform: translateX(-50%);
                    color: white;
                    font-size: 14px;
                    font-weight: 700;
                    letter-spacing: 1px;
                    opacity: 0.7;
                }

                @media (max-width: 768px) {
                    .lightbox-nav { display: none; }
                    .lightbox-content { padding: 10px; }
                    .lightbox-close { top: 20px; right: 20px; }
                }
            `}</style>
        </div>
    );

    return createPortal(lightboxContent, document.body);
};

export default ProductLightbox;
