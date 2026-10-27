import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import CierreDelDia from './CierreDelDia';

/**
 * El cierre de caja dentro de la caja (tecla D). Mientras está abierto, Esc lo
 * cierra y las teclas de la caja no se activan.
 */
const CierreCaja = ({ onCerrar }) => {
    useEffect(() => {
        const teclas = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onCerrar(); }
        };
        window.addEventListener('keydown', teclas, true);
        return () => window.removeEventListener('keydown', teclas, true);
    }, [onCerrar]);

    return createPortal(
        <div className="cj-sel-capa" role="dialog" aria-modal="true" aria-labelledby="cc-titulo">
            <div className="cj-sel">
                <div className="cj-sel-cabecera">
                    <div className="cj-sel-ruta"><h3 id="cc-titulo">Cierre de caja</h3></div>
                    <span className="cj-ayuda"><kbd>←</kbd> <kbd>→</kbd> otro día · <kbd>I</kbd> imprimir · <kbd>Esc</kbd> volver</span>
                    <button type="button" className="cj-icono" onClick={onCerrar} aria-label="Cerrar"><X size={16} /></button>
                </div>
                <CierreDelDia />
            </div>
        </div>,
        document.body,
    );
};

export default CierreCaja;
