import React, { useState, useEffect, useRef } from 'react';
import ElementoCarrusel from './ElementoCarrusel';

const Carrusel = ({ elementos, intervalo = 5000, autoplay = true, onElementoClick }) => {
    const [indiceActivo, setIndiceActivo] = useState(0);
    const [pausado, setPausado] = useState(false);
    const containerRef = useRef(null);
    const autoplayRef = useRef(null);

    // Sincronizar puntos con el scroll manual
    const handleScroll = () => {
        if (!containerRef.current) return;
        const scrollLeft = containerRef.current.scrollLeft;
        const width = containerRef.current.offsetWidth;
        const nuevoIndice = Math.round(scrollLeft / width);
        if (nuevoIndice !== indiceActivo) {
            setIndiceActivo(nuevoIndice);
        }
    };

    // Lógica de Autoplay con protección de pausa
    useEffect(() => {
        if (autoplay && elementos.length > 0 && !pausado) {
            startAutoplay();
        }
        return () => stopAutoplay();
    }, [autoplay, elementos.length, indiceActivo, pausado]); 

    const startAutoplay = () => {
        stopAutoplay();
        autoplayRef.current = setInterval(() => {
            if (!containerRef.current || pausado) return;
            const nextIndex = (indiceActivo + 1) % elementos.length;
            irAIndice(nextIndex);
        }, intervalo);
    };

    const stopAutoplay = () => {
        if (autoplayRef.current) {
            clearInterval(autoplayRef.current);
            autoplayRef.current = null;
        }
    };

    const handleInteraccion = () => {
        stopAutoplay();
        setPausado(true);
    };

    const handleResumen = () => {
        setPausado(false);
    };

    const irAIndice = (index) => {
        if (!containerRef.current) return;
        const scrollAmount = containerRef.current.offsetWidth * index;
        containerRef.current.scrollTo({
            left: scrollAmount,
            behavior: 'smooth'
        });
        setIndiceActivo(index);
    };

    return (
        <div className="carrusel-container">
            <div 
                className="carrusel-track" 
                ref={containerRef}
                onScroll={handleScroll}
                onMouseEnter={handleInteraccion}
                onMouseLeave={handleResumen}
                onTouchStart={handleInteraccion}
                onTouchEnd={handleResumen}
                onTouchCancel={handleResumen}
            >
                {elementos.map((item) => (
                    <ElementoCarrusel 
                        key={item.id} 
                        {...item} 
                        onRedirigir={onElementoClick}
                    />
                ))}
            </div>

            {/* Puntos de Navegación (Dots) */}
            <div className="carrusel-dots">
                {elementos.map((_, index) => (
                    <button
                        key={index}
                        className={`dot ${indiceActivo === index ? 'active' : ''}`}
                        onClick={() => irAIndice(index)}
                        aria-label={`Ir a slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default Carrusel;
