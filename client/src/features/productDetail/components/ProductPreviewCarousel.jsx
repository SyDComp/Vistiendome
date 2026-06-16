import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Maximize2, ChevronRight, ChevronLeft } from 'lucide-react';
import ProductLightbox from './ProductLightbox';
import './ProductPreviewCarousel.css';
import { getImageUrl } from '../../../lib/api/endpoints/index.js';

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
    const touchStartX = useRef(null);
    const touchStartY = useRef(null);

    // Ayudante para normalizar nombres de archivo (Detección de portada)
    const getFileName = (path) => path?.split(/[?#]/)[0].split(/[\\/]/).pop()?.toLowerCase();
    const coverFileName = getFileName(coverImage);

    // 2. MOTOR DE ORDENAMIENTO (ESTÁTICO Y ESTABLE)
    // El orden de las miniaturas NO cambia dinámicamente. La portada va primero,
    // y el resto se agrupa por variante. Solo cambia la opacidad visual (CSS).
    const finalImages = useMemo(() => {
        if (!skus.length) return [];

        // 1. Recolectar todas las imágenes únicas con su metadata
        const allUniqueImages = [];
        const seenUrls = new Set();

        const collectImage = (url, sku) => {
            if (!url) return;
            const normalizedUrl = url.split(/[?#]/)[0].toLowerCase();
            if (seenUrls.has(normalizedUrl)) return;
            
            seenUrls.add(normalizedUrl);
            allUniqueImages.push({
                url,
                is_main_cover: getFileName(url) === coverFileName,
                skuConfig: sku?.config || null,
                skuId: sku?.sku || 'generic',
                originalSku: sku // Guardamos referencia para el filtrado
            });
        };

        // Primero recolectamos todo el universo de fotos
        // (Damos prioridad a la variante de la portada para que todas sus fotos vayan juntas al inicio)
        let sortedSkus = [...skus];
        if (coverImage) {
            const coverSku = skus.find(s => s.image_urls?.some(u => getFileName(u) === coverFileName));
            if (coverSku) {
                // Movemos la variante de la portada al principio
                sortedSkus = [coverSku, ...skus.filter(s => s !== coverSku)];
            }
            // Insertamos la portada primero
            collectImage(coverImage, coverSku);
        }
        
        // Ahora recolectamos el resto en orden
        sortedSkus.forEach(s => {
            s.image_urls?.forEach(url => collectImage(url, s));
        });

        // 2. Mapeo final con propiedad isFromActiveSku para UI
        return allUniqueImages.map(img => {
            let isActive = false;
            if (skuActual && skuActual.image_urls) {
                const imgNorm = getFileName(img.url);
                isActive = skuActual.image_urls.some(u => getFileName(u) === imgNorm);
            }
            return { ...img, isFromActiveSku: isActive };
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
    const navigateImage = useCallback((direction) => {
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
        // Ya no enviamos 0, enviamos el índice real porque el orden es estable
        if (onImageSelected) onImageSelected(newIndex);
    }, [displayUrl, selectedImageUrl, finalImages, onJumpToVariant, onImageSelected]);

    // Touch swipe handlers para la imagen principal
    const handleTouchStart = useCallback((e) => {
        touchStartX.current = e.touches[0].clientX;
        touchStartY.current = e.touches[0].clientY;
    }, []);

    const handleTouchEnd = useCallback((e) => {
        if (touchStartX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStartX.current;
        const dy = e.changedTouches[0].clientY - touchStartY.current;
        // Swipe horizontal > 40px y más horizontal que vertical
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
            if (dx < 0) navigateImage('right');  // swipe izquierda → siguiente
            else navigateImage('left');            // swipe derecha → anterior
        }
        touchStartX.current = null;
        touchStartY.current = null;
    }, [navigateImage]);

    const handleThumbnailClick = (imgObj) => {
        if (!imgObj.isFromActiveSku && onJumpToVariant && imgObj.skuConfig) {
            onJumpToVariant(imgObj.skuConfig);
        }
        
        setSelectedImageUrl(imgObj.url);
        if (onImageSelected) {
            const idx = finalImages.findIndex(i => i.url === imgObj.url);
            onImageSelected(idx >= 0 ? idx : 0);
        }
    };

    const openLightbox = (url) => {
        const targetUrl = url || displayUrl;
        const idx = finalImages.findIndex(i => i.url === targetUrl);
        setLightboxIndex(idx >= 0 ? idx : 0);
        setIsLightboxOpen(true);
    };

    // Al cerrar el lightbox, sincronizar el carrusel con la imagen en que quedó el usuario
    const handleLightboxClose = () => {
        setIsLightboxOpen(false);
        const closedAtImage = finalImages[lightboxIndex];
        if (!closedAtImage) return;

        // Si la imagen en que cerró es de una variante distinta, saltar a esa variante
        if (!closedAtImage.isFromActiveSku && onJumpToVariant && closedAtImage.skuConfig) {
            onJumpToVariant(closedAtImage.skuConfig);
        }

        // Actualizar la imagen seleccionada en el carrusel
        setSelectedImageUrl(closedAtImage.url);
        if (onImageSelected) {
            onImageSelected(lightboxIndex);
        }
    };

    if (finalImages.length === 0 && !displayUrl) return null;

    return (
        <div className="product-carousel-system">
            <div
                className="main-display-area"
                onClick={() => openLightbox(displayUrl)}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {displayUrl && (
                    <img src={getImageUrl(displayUrl)} alt="" className="main-blur-bg" aria-hidden="true" />
                )}
                <img 
                    src={getImageUrl(displayUrl)} 
                    alt="Vista del producto" 
                    className="main-large-image"
                    style={{ 
                        display: 'block',
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        position: 'relative',
                        zIndex: 2
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
                                <img 
                                    src={getImageUrl(img.url)} 
                                    alt={`Previsualización ${idx + 1}`} 
                                    onError={(e) => {
                                        e.target.onerror = null; // Prevenir loop infinito
                                        e.target.src = getImageUrl(coverImage);
                                    }}
                                />
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
                onClose={handleLightboxClose}
                onPrev={() => setLightboxIndex(p => (p - 1 + finalImages.length) % finalImages.length)}
                onNext={() => setLightboxIndex(p => (p + 1) % finalImages.length)}
            />


        </div>
    );
};

export default ProductPreviewCarousel;
