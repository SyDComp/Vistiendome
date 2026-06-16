import React, { useState, useEffect } from 'react'

const ElementoColeccion = ({ tipo, nombre, descripcion, vistaDestino, onRedirigir, imagenes = [], intervalo = 3000, isPaused = false, ...props }) => {
    const [indexActual, setIndexActual] = useState(0);
    const [indexSiguiente, setIndexSiguiente] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Lógica del carrusel automático con Cross-Fade
    useEffect(() => {
        if (imagenes.length <= 1 || isPaused) return;

        const timer = setInterval(() => {
            const nextIdx = (indexActual + 1) % imagenes.length;
            setIndexSiguiente(nextIdx);
            setIsTransitioning(true);

            // Después de la animación, estabilizamos el índice actual
            setTimeout(() => {
                setIndexActual(nextIdx);
                setIsTransitioning(false);
            }, 800); // Duración de la transición un poco más larga para elegancia
        }, intervalo);

        return () => clearInterval(timer);
    }, [imagenes, intervalo, indexActual, isPaused]);

    const handleClick = () => {
        if (props.onClick) {
            props.onClick(indexActual);
        } else if (onRedirigir) {
            onRedirigir(vistaDestino, indexActual);
        }
    };

    const estiloLink = {
        cursor: onRedirigir ? 'pointer' : 'default',
        backgroundColor: props.fondoColor || '#f8fafc',
        position: 'relative',
        overflow: 'hidden'
    };

    const listaImagenes = imagenes.length > 0 ? imagenes : [props.imagen];
    const imagenActual = listaImagenes[indexActual];
    const imagenSiguiente = listaImagenes[indexSiguiente];

    return (
        <div
            className={`elementoColeccion ${tipo}`}
            onClick={handleClick}
            style={estiloLink}
        >
            {tipo !== 'post' && (
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
                    <div className="image-wrapper" style={{ position: 'relative', width: '100%', aspectRatio: '3/4', overflow: 'hidden', backgroundColor: '#f1f5f9' }}>
                        {/* Imagen de Fondo (La que se queda) */}
                        <img 
                            src={imagenActual} 
                            alt={nombre} 
                            style={{ 
                                width: '100%', height: '100%', objectFit: 'cover',
                                position: 'absolute', top: 0, left: 0, zIndex: 1,
                                imageRendering: '-webkit-optimize-contrast'
                            }}
                        />
                        
                        {/* Imagen de Frente (La que aparece con Fade) */}
                        {isTransitioning && (
                            <img 
                                src={imagenSiguiente} 
                                alt={nombre} 
                                style={{ 
                                    width: '100%', height: '100%', objectFit: 'cover',
                                    position: 'absolute', top: 0, left: 0, zIndex: 2,
                                    opacity: isTransitioning ? 1 : 0,
                                    transition: 'opacity 0.8s ease-in-out',
                                    animation: 'fadeIn 0.8s ease-in-out',
                                    imageRendering: '-webkit-optimize-contrast'
                                }}
                            />
                        )}
                    </div>

                    <div className="info-bottom" style={{ padding: '16px 4px', textAlign: 'center', backgroundColor: '#fff', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <h3 style={{ 
                            color: '#1e293b', 
                            margin: 0, 
                            fontFamily: "'Outfit', sans-serif", /* El reference usa sans-serif en el título también */
                            fontSize: '1rem',
                            fontWeight: '400',
                            lineHeight: '1.4'
                        }}>{nombre}</h3>
                        {props.precio && (
                            <span className="precio" style={{ 
                                color: '#8f0653', 
                                display: 'block', 
                                marginTop: '8px', 
                                fontFamily: "'Outfit', sans-serif", 
                                fontWeight: '600',
                                fontSize: '1rem' 
                            }}>
                                {props.precio}
                            </span>
                        )}
                    </div>
                </div>
            )}
            {tipo === 'post' && (
                <div className="post-content">
                    <h3>{nombre}</h3>
                    <p>{descripcion}</p>
                </div>
            )}
        </div>
    );
};

export default ElementoColeccion