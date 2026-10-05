import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';
import './PanelLateral.css';

/**
 * Un panel que entra por la derecha con un título y lo que se le ponga
 * adentro. No sabe nada de lo que muestra: el contenido lo decide quien lo
 * abre.
 */
const PanelLateral = ({ abierto, onCerrar, titulo, subtitulo, children }) => {
    const idTitulo = useId();

    useEffect(() => {
        if (!abierto) return undefined;
        const alTeclear = (e) => { if (e.key === 'Escape') onCerrar(); };
        window.addEventListener('keydown', alTeclear);
        return () => window.removeEventListener('keydown', alTeclear);
    }, [abierto, onCerrar]);

    if (!abierto) return null;

    return (
        <div className="panel-lateral-fondo" onClick={onCerrar}>
            <aside
                className="panel-lateral"
                role="dialog"
                aria-modal="true"
                aria-labelledby={idTitulo}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="panel-lateral-cabecera">
                    <div className="panel-lateral-titulos">
                        <h2 id={idTitulo} className="panel-lateral-titulo">{titulo}</h2>
                        {subtitulo && <p className="panel-lateral-subtitulo">{subtitulo}</p>}
                    </div>
                    <button type="button" className="panel-lateral-cerrar" onClick={onCerrar} aria-label="Cerrar">
                        <X size={20} />
                    </button>
                </header>
                <div className="panel-lateral-cuerpo">{children}</div>
            </aside>
        </div>
    );
};

export default PanelLateral;
