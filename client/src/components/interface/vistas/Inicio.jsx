import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import HomeRenderer from '../cms/HomeRenderer';

const Inicio = () => {
    const location = useLocation();

    // Efecto para manejar el scroll automático al ancla (cuando se vuelve de una colección específica)
    useEffect(() => {
        if (location.hash) {
            const elementId = location.hash.slice(1); // Quitamos el '#'
            // Esperamos un momento a que las secciones se carguen/rendericen
            setTimeout(() => {
                const element = document.getElementById(elementId);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 500); // Un poco más de tiempo para asegurar que el fetch del Renderer terminó
        }
    }, [location]);

    return (
        <div className="inicio-view fade-in">
            <HomeRenderer />
        </div>
    );
}

export default Inicio;
