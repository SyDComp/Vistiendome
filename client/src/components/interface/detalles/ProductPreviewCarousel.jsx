import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Maximize2, ChevronRight, ChevronLeft } from 'lucide-react';
import ProductLightbox from './ProductLightbox';
import { getImageUrl } from '../../../services/api';

/**
 * ProductPreviewCarousel - Componente de galería premium aislado
 * Implementa ordenamiento dinámico por packs de variantes y UX optimizada
 * para facilitar el uso a personas mayores (Scroll horizontal intuitivo).
 */
const ProductPreviewCarousel = ({ 
    skus = [], 
    coverImage = '', 
    skuActual = null, 
    onJumpToVariant,
    imgIndex,
    onImageSelected
}) => {
    // 1. Estados de Selección de Imagen
    const [selectedImageUrl, setSelectedImageUrl] = useState('');
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const thumbnailScrollRef = useRef(null);

    // Ayudante para normalizar nombres de archivo (Detección de portada)
    const getFileName = (path) => path?.split(/[?#]/)[0].split(/[\\/]/).pop()?.toLowerCase();
    const coverFileName = getFileName(coverImage);

    // 2. MOTOR DE ORDENAMIENTO (ESTÁTICO Y ESTABLE)
    // El orden de las miniaturas NO cambia dinámicamente. La portada va primero,
    // y el resto se agrupa por variante. Solo cambia la opacidad visual (CSS).
    const finalImages = useMemo(() => {
        if (!skus.length) return [];

        const uniqueThumbnails = [];
        const seenUrls = new Set();

        const collectImage = (url, skuConfig) => {
            if (!url) return;
            const normalizedUrl = url.split(/[?#]/)[0].toLowerCase();
            if (seenUrls.has(normalizedUrl)) return;
            
            seenUrls.add(normalizedUrl);
            uniqueThumbnails.push({
                url,
                is_main_cover: getFileName(url) === coverFileName,
                skuConfig: skuConfig,
                skuId: skuConfig?.sku || 'generic'
            });
        };

        // 1. Forzar SIEMPRE la portada global primero
        if (coverImage) {
            const coverSku = skus.find(s => s.image_urls?.some(u => getFileName(u) === coverFileName));
            collectImage(coverImage, coverSku?.config || null);
        }

        // 2. Recolectar el resto del universo de SKUs
        // Agrupados por naturaleza, el orden en el que se iteran forma "packs" estáticos
        skus.forEach(s => {
            s.image_urls?.forEach(url => collectImage(url, s.config));
        });

        // Calculamos la propiedad dinámica isFromActiveSku fuera del ordenamiento
        // para afectar solo a los estilos CSS (opacidad), no la posición en el DOM.
        return uniqueThumbnails.map(img => {
            let isActive = false;
            if (skuActual && skuActual.image_urls) {
                const imgNorm = getFileName(img.url);
                isActive = skuActual.image_urls.some(u => getFileName(u) === imgNorm);
            }
            return {
                ...img,
                isFromActiveSku: isActive
            };
        });
    }, [skus, coverImage, skuActual, coverFileName]);

    // 3. Fuente de Verdad para la Imagen a mostrar
    // Derivamos la URL directamente para evitar estados intermedios vacíos
    const displayUrl = useMemo(() => {
        // 1. Si hay un índice en la URL, siempre mandamos esa
        if (imgIndex !== undefined) {
            const parsedIndex = parseInt(imgIndex, 10);
            if (!isNaN(parsedIndex) && parsedIndex >= 0 && parsedIndex < finalImages.length) {
                return finalImages[parsedIndex].url;
            }
        }

        // 2. Si no hay índice pero hay una seleccionada por estado local
        if (selectedImageUrl) return selectedImageUrl;

        // 3. Fallback: Primera imagen de la variante actual
        if (skuActual && skuActual.image_urls?.length) return skuActual.image_urls[0];

        // 4. Fallback final: Portada global o primera de la lista
        return coverImage || (finalImages.length > 0 ? finalImages[0].url : '');
    }, [imgIndex, finalImages, selectedImageUrl, skuActual, coverImage]);

    // 4. Sincronización de Scroll y Variantes
    // Nota: El useEffect ahora solo se encarga de efectos secundarios (scroll)
    // y de sincronizar el estado local cuando la variante cambia externamente.
    useEffect(() => {
        if (!finalImages.length) return;

        let targetIndex = -1;

        // Comportamiento "Zara": Al cambiar de SKU, saltamos a su primera foto
        if (skuActual && skuActual.image_urls?.length) {
            const firstUrlOfSku = skuActual.image_urls[0];
            const currentNorm = getFileName(selectedImageUrl);
            const isCurrentInNewPack = skuActual.image_urls.some(u => getFileName(u) === currentNorm);

            // Si el SKU actual cambió y la foto que estoy viendo NO ES de ese SKU, forzamos cambio
            if (!isCurrentInNewPack && firstUrlOfSku !== selectedImageUrl) {
                setSelectedImageUrl(firstUrlOfSku);
                targetIndex = finalImages.findIndex(i => i.url === firstUrlOfSku);
            }
        }

        // Si no forzamos cambio arriba, buscamos el índice actual para hacer scroll
        if (targetIndex === -1) {
            targetIndex = finalImages.findIndex(i => i.url === (displayUrl || selectedImageUrl));
        }

        // Ejecutar Scroll estable
        if (targetIndex !== -1 && thumbnailScrollRef.current) {
            const reel = thumbnailScrollRef.current;
            const track = reel.children[0];
            const activeThumb = track.children[targetIndex];

            if (activeThumb) {
                const reelRect = reel.getBoundingClientRect();
                const thumbRect = activeThumb.getBoundingClientRect();
                const scrollLeft = activeThumb.offsetLeft - (reelRect.width / 2) + (thumbRect.width / 2);
                reel.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }
        }
    }, [skuActual, finalImages, displayUrl]); // Eliminamos imgIndex para evitar loops con navigate

    // Inicialización de estado si está vacío
    useEffect(() => {
        if (!selectedImageUrl && displayUrl) {
            setSelectedImageUrl(displayUrl);
        }
    }, [displayUrl, selectedImageUrl]);

    // Lógica de Navegación Circular (Imágenes)
    const navigateImage = (direction) => {
        const currentUrl = displayUrl || selectedImageUrl;
        const currentIndex = finalImages.findIndex(img => img.url === currentUrl);
        if (currentIndex === -1) return;

        let newIndex;
        if (direction === 'right') {
            newIndex = (currentIndex + 1) % finalImages.length;
        } else {
            newIndex = (currentIndex - 1 + finalImages.length) % finalImages.length;
        }
        
        const nextImage = finalImages[newIndex];
        
        // Al cambiar de imagen con las flechas, saltamos a su variante 
        if (!nextImage.isFromActiveSku && onJumpToVariant && nextImage.skuConfig) {
            onJumpToVariant(nextImage.skuConfig);
        }
        
        setSelectedImageUrl(nextImage.url);
        if (onImageSelected) onImageSelected(newIndex);
    };

    const handleThumbnailClick = (imgObj) => {
        const newIndex = finalImages.findIndex(i => i.url === imgObj.url);
        
        if (!imgObj.isFromActiveSku && onJumpToVariant && imgObj.skuConfig) {
            onJumpToVariant(imgObj.skuConfig);
        }
        
        setSelectedImageUrl(imgObj.url);
        if (onImageSelected && newIndex !== -1) {
            onImageSelected(newIndex);
        }
    };

    const openLightbox = (url) => {
        const targetUrl = url || displayUrl;
        const idx = finalImages.findIndex(i => i.url === targetUrl);
        setLightboxIndex(idx >= 0 ? idx : 0);
        setIsLightboxOpen(true);
    };

    if (finalImages.length === 0 && !displayUrl) return null;

    return (
        <div className="product-carousel-system">
            <div className="main-display-area" onClick={() => openLightbox(displayUrl)}>
                <img 
                    src={getImageUrl(displayUrl)} 
                    alt="Vista del producto" 
                    className="main-large-image"
                    style={{ 
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                    }}
                    onError={(e) => {
                        e.target.src = getImageUrl(coverImage);
                    }}
                />
                <div className="glass-magnifier">
                    <Maximize2 size={22} />
                </div>
            </div>

            <div className="carousel-controls-wrapper">
                <button className="scroll-btn left" onClick={() => navigateImage('left')} title="Imagen anterior">
                    <ChevronLeft size={24} />
                </button>

                <div className="thumbnails-scroll-container" ref={thumbnailScrollRef}>
                    <div className="thumbnails-track">
                        {finalImages.map((img, idx) => (
                            <div 
                                key={img.url}
                                className={`carousel-thumb-item ${selectedImageUrl === img.url ? 'active' : ''} ${!img.isFromActiveSku ? 'secondary-pack' : ''}`}
                                onClick={() => handleThumbnailClick(img)}
                            >
                                <img src={getImageUrl(img.url)} alt={`Previsualización ${idx + 1}`} />
                                {!img.isFromActiveSku && (
                                    <div className="pack-indicator" title="Ver esta variante">✨</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <button className="scroll-btn right" onClick={() => navigateImage('right')} title="Siguiente imagen">
                    <ChevronRight size={24} />
                </button>

                <div className="carousel-fade-edge"></div>
            </div>

            <ProductLightbox 
                images={finalImages.map(i => getImageUrl(i.url))}
                currentIndex={lightboxIndex}
                isOpen={isLightboxOpen}
                onClose={() => setIsLightboxOpen(false)}
                onPrev={() => setLightboxIndex(p => (p - 1 + finalImages.length) % finalImages.length)}
                onNext={() => setLightboxIndex(p => (p + 1) % finalImages.length)}
            />

            <style>{`
                .product-carousel-system {
                    width: 100%;
                    max-width: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    overflow: hidden;
                    box-sizing: border-box;
                }

                @media (max-width: 768px) {
                    .product-carousel-system { gap: 8px; }
                }

                .main-display-area {
                    position: relative;
                    width: 100%;
                    max-width: 600px;
                    margin: 0 auto;
                    aspect-ratio: 3/4;
                    min-height: 300px; /* Garantiza visibilidad en cualquier reflow */
                    border-radius: 20px;
                    overflow: hidden;
                    background: #f1f5f9; /* Color base más suave */
                    cursor: zoom-in;
                    box-shadow: 0 8px 30px rgba(0,0,0,0.08);
                    border: 1px solid rgba(0,0,0,0.04);
                }

                @media (min-width: 1024px) {
                    .main-display-area {
                        max-width: 100%;
                        border-radius: 24px;
                    }
                }

                .main-large-image {
                    background: #f1f5f9;
                    transition: opacity 0.3s ease;
                }

                @media (max-width: 768px) {
                    .main-display-area {
                        min-height: 400px; /* Más espacio en móviles */
                    }
                }

                .glass-magnifier {
                    position: absolute;
                    bottom: 24px;
                    right: 24px;
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(12px);
                    color: #1e1b4b;
                    padding: 12px;
                    border-radius: 18px;
                    opacity: 0;
                    transform: translateY(10px);
                    transition: all 0.3s ease;
                    border: 1px solid rgba(255,255,255,0.5);
                }

                .main-display-area:hover .glass-magnifier { opacity: 1; transform: translateY(0); }

                .carousel-controls-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    width: 100%;
                    min-width: 0; /* CRÍTICO: Permite que el contenedor flex se encoja */
                }

                .thumbnails-scroll-container {
                    flex: 1;
                    min-width: 0; /* CRÍTICO: Previene que el scroll estire al padre */
                    overflow-x: auto;
                    overflow-y: hidden;
                    white-space: nowrap;
                    scroll-behavior: smooth;
                    padding: 4px 0 10px;
                    -webkit-overflow-scrolling: touch;
                }

                .thumbnails-scroll-container::-webkit-scrollbar { height: 4px; }
                .thumbnails-scroll-container::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }

                .thumbnails-track {
                    display: inline-flex;
                    gap: 12px;
                    min-width: min-content;
                }

                .carousel-thumb-item {
                    width: 70px;
                    height: 70px;
                    flex: 0 0 70px;
                    border-radius: 12px;
                    overflow: hidden;
                    cursor: pointer;
                    background: #f1f5f9;
                    border: 2px solid transparent;
                    transition: all 0.2s ease;
                }

                .carousel-thumb-item img { width: 100%; height: 100%; object-fit: cover; }
                .carousel-thumb-item.active { border-color: #8f0653; transform: scale(1.05); }

                .carousel-thumb-item.secondary-pack { opacity: 0.4; }
                .carousel-thumb-item.secondary-pack:hover { opacity: 1; }

                .scroll-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    border: 1px solid #f1f5f9;
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #475569;
                    cursor: pointer;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
                    flex-shrink: 0;
                }

                .carousel-fade-edge {
                    position: absolute;
                    right: 40px;
                    top: 0;
                    bottom: 0;
                    width: 40px;
                    background: linear-gradient(to right, transparent, rgba(255,255,255,0.8));
                    pointer-events: none;
                }

                @media (max-width: 768px) {
                    .scroll-btn, .carousel-fade-edge { display: none; }
                    .carousel-thumb-item { width: 64px; height: 64px; flex-basis: 64px; }
                    .main-display-area { border-radius: 16px; }
                }
            `}</style>
        </div>
    );
};

export default ProductPreviewCarousel;
