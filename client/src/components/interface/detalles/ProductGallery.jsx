import React, { useState, useEffect } from 'react';
import { Maximize2 } from 'lucide-react';
import ProductLightbox from './ProductLightbox';
import './ProductGallery.css';

const ProductGallery = ({ images = [], mainImage = '', onJumpToVariant }) => {
    // La prop 'images' ahora llega como un array de objetos { url, isCurrentVariant, skuConfig }
    const [selectedImageUrl, setSelectedImageUrl] = useState(mainImage || (images.length > 0 ? images[0].url : ''));
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const allImageUrls = React.useMemo(() => images.map(img => img.url), [images]);

    // Sincronizar imagen seleccionada si cambian las imágenes (ej: al cargar el componente)
    useEffect(() => {
        if (mainImage) {
            setSelectedImageUrl(mainImage);
        } else if (images.length > 0) {
            setSelectedImageUrl(images[0].url);
        }
    }, [mainImage, images]);

    const handleThumbnailClick = (imgObj) => {
        if (!imgObj.isCurrentVariant && onJumpToVariant && imgObj.skuConfig) {
            // "SALTO MÁGICO": Cambiar variante desde la galería
            onJumpToVariant(imgObj.skuConfig);
        }
        setSelectedImageUrl(imgObj.url);
    };

    const openLightbox = (imgUrl) => {
        const idx = allImageUrls.indexOf(imgUrl);
        setLightboxIndex(idx >= 0 ? idx : 0);
        setIsLightboxOpen(true);
    };

    if (!selectedImageUrl && images.length === 0) {
        return <div className="gallery-placeholder">Sin imagen disponible</div>;
    }

    return (
        <div className="product-gallery-container">
            <div className="product-gallery">
                {/* Imagen Principal */}
                <div className="main-image-container" onClick={() => openLightbox(selectedImageUrl)}>
                    <img 
                        src={selectedImageUrl} 
                        alt="Vista principal" 
                        className="main-image fade-in"
                    />
                    <div className="zoom-indicator">
                        <Maximize2 size={20} />
                    </div>
                </div>

                {/* Miniaturas con Opacidad Diferenciada */}
                {images.length > 1 && (
                    <div className="thumbnails-wrapper">
                        <div className="thumbnails-grid">
                            {images.map((imgObj, idx) => (
                                <div 
                                    key={idx}
                                    className={`thumbnail-item ${selectedImageUrl === imgObj.url ? 'active' : ''} ${!imgObj.isCurrentVariant ? 'other-variant' : ''}`}
                                    onClick={() => handleThumbnailClick(imgObj)}
                                    title={!imgObj.isCurrentVariant ? 'Ver esta variante' : ''}
                                >
                                    <img src={imgObj.url} alt={`Miniatura ${idx + 1}`} />
                                    {!imgObj.isCurrentVariant && <div className="variant-indicator">✨</div>}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <ProductLightbox 
                images={allImageUrls}
                currentIndex={lightboxIndex}
                isOpen={isLightboxOpen}
                onClose={() => setIsLightboxOpen(false)}
                onPrev={() => setLightboxIndex(prev => (prev - 1 + allImageUrls.length) % allImageUrls.length)}
                onNext={() => setLightboxIndex(prev => (prev + 1) % allImageUrls.length)}
            />


        </div>
    );
};

export default ProductGallery;
