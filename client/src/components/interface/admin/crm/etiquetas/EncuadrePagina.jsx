import React, { useLayoutEffect, useRef, useState } from 'react';

/**
 * Muestra una página en la vista previa, achicada si no cabe en el panel.
 *
 * Se achica con `transform`, que solo cambia cómo se ve: por dentro la página
 * sigue midiendo lo que mide el papel, y por eso el ajuste de letra que se
 * calcula sobre ella vale también para la impresión.
 */
const EncuadrePagina = ({ children }) => {
    const marcoRef = useRef(null);
    const paginaRef = useRef(null);
    const [vista, setVista] = useState({ escala: 1, alto: null, corrimiento: 0 });

    useLayoutEffect(() => {
        const marco = marcoRef.current;
        const pagina = paginaRef.current;
        if (!marco || !pagina) return undefined;
        const medir = () => {
            const ancho = pagina.offsetWidth;
            const disponible = marco.clientWidth;
            const escala = ancho ? Math.min(1, disponible / ancho) : 1;
            setVista({
                escala,
                alto: pagina.offsetHeight * escala,
                corrimiento: Math.max(0, (disponible - ancho * escala) / 2),
            });
        };
        medir();
        const observador = new ResizeObserver(medir);
        observador.observe(marco);
        observador.observe(pagina);
        return () => observador.disconnect();
    }, []);

    return (
        <div ref={marcoRef} className="et-encuadre" style={{ height: vista.alto ?? undefined }}>
            <div
                ref={paginaRef}
                className="et-encuadre-pagina"
                style={{ transform: `translateX(${vista.corrimiento}px) scale(${vista.escala})` }}
            >
                {children}
            </div>
        </div>
    );
};

export default EncuadrePagina;
