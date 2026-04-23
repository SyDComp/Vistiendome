import React, { useState, useEffect } from 'react';
import { Maximize2 } from 'lucide-react';
import ProductLightbox from './ProductLightbox';

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

            <style>{`
                .product-gallery-container {
                    width: 100%;
                }
                .main-image-container {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 4/5;
                    border-radius: 24px;
                    overflow: hidden;
                    background: #f8fafc;
                    cursor: zoom-in;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                }
                .main-image {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.5s ease;
                }
                .main-image-container:hover .main-image {
                    transform: scale(1.02);
                }
                .zoom-indicator {
                    position: absolute;
                    bottom: 20px;
                    right: 20px;
                    background: rgba(255, 255, 255, 0.8);
                    backdrop-filter: blur(10px);
                    width: 44px;
                    height: 44px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #1e1b4b;
                    opacity: 0;
                    transform: translateY(10px);
                    transition: all 0.3s ease;
                }
                .main-image-container:hover .zoom-indicator {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                .thumbnails-wrapper {
                    margin-top: 20px;
                    width: 100%;
                    overflow-x: auto;
                    scrollbar-width: none;
                }
                .thumbnails-wrapper::-webkit-scrollbar { display: none; }
                
                .thumbnails-grid {
                    display: flex;
                    gap: 12px;
                    padding: 4px 0;
                }
                
                .thumbnail-item {
                    position: relative;
                    flex: 0 0 80px;
                    height: 80px;
                    border-radius: 12px;
                    overflow: hidden;
                    cursor: pointer;
                    border: 2px solid transparent;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    background: #f1f5f9;
                }
                
                /* Lógica de Opacidad Refinada */
                .thumbnail-item.other-variant {
                    opacity: 0.4;
                    filter: grayscale(0.5);
                }
                .thumbnail-item.other-variant:hover {
                    opacity: 0.8;
                    filter: grayscale(0);
                }

                .thumbnail-item img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                .thumbnail-item.active {
                    opacity: 1 !important;
                    filter: grayscale(0) !important;
                    border-color: #8f0653;
                    transform: translateY(-4px);
                    box-shadow: 0 4px 12px rgba(143, 6, 83, 0.2);
                }

                .variant-indicator {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    background: white;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 10px;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                @media (min-width: 1024px) {
                    .thumbnail-item { flex: 0 0 100px; height: 100px; }
                }
            `}</style>
        </div>
    );
};

export default ProductGallery;
