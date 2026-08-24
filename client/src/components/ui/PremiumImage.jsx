import React, { useState, useEffect, useRef } from 'react';

/**
 * @param srcSet   Versiones livianas que manda el servidor ("url 400w, url 800w, ...").
 *                 Vacío = se usa `src` tal cual, así que las fotos sin derivadas
 *                 siguen funcionando igual.
 * @param sizes    Cuánto espacio ocupará la imagen, para que el navegador elija
 *                 bien ANTES de conocer el layout. Sin esto asume el ancho de la
 *                 pantalla completa y baja una versión más grande de la necesaria.
 * @param priority true para la imagen principal visible al entrar: esa no se
 *                 difiere, porque diferirla es justo lo que se ve tardar.
 */
const PremiumImage = ({
    src,
    srcSet = '',
    sizes = '(max-width: 768px) 50vw, 300px',
    priority = false,
    alt,
    className = '',
    skeletonClassName = '',
    aspectRatio = '3/4',
    objectFit = 'cover',
    style = {},
    ...props
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const imgRef = useRef(null);

    // Resetear el estado si cambia el src (para galerías)
    useEffect(() => {
        setIsLoaded(false);
        setHasError(false);
        
        // Si la imagen ya está en caché del navegador, complete será true instantáneamente
        if (imgRef.current && imgRef.current.complete) {
            setIsLoaded(true);
        }
        // También depende de srcSet: si cambian las derivadas sin cambiar el
        // src, la imagen se recarga y el esqueleto tiene que volver a aparecer.
    }, [src, srcSet]);

    // Si no hay src o hubo un error al cargar
    if (!src || hasError) {
        return (
            <div 
                className={`no-image fallback ${className}`}
                style={{ 
                    aspectRatio, 
                    width: '100%', 
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-muted)'
                }}
            >
                <span style={{ fontSize: '0.8rem' }}>Sin Imagen</span>
            </div>
        );
    }

    return (
        <div 
            className={`premium-image-container ${className}`} 
            style={{ 
                position: 'relative', 
                overflow: 'hidden',
                aspectRatio,
                width: '100%',
                height: '100%',
                display: 'block',
                ...style
            }}
        >
            {/* Esqueleto de Carga */}
            {!isLoaded && (
                <div 
                    className={`skeleton-box ${skeletonClassName}`} 
                    style={{ 
                        position: 'absolute', 
                        top: 0, left: 0, right: 0, bottom: 0,
                        width: '100%', height: '100%',
                        zIndex: 1
                    }} 
                />
            )}
            
            {/* Imagen Real (Oculta hasta cargar, fade-in suave) */}
            <img
                ref={imgRef}
                src={src}
                srcSet={srcSet || undefined}
                sizes={srcSet ? sizes : undefined}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                fetchPriority={priority ? 'high' : undefined}
                alt={alt}
                onLoad={() => setIsLoaded(true)}
                onError={() => setHasError(true)}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: objectFit,
                    opacity: isLoaded ? 1 : 0,
                    transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                    position: 'absolute',
                    top: 0, left: 0,
                    zIndex: 2,
                    display: 'block'
                }}
                {...props}
            />
        </div>
    );
};

export default PremiumImage;
