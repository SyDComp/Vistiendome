import React, { useEffect, useState } from 'react';
import { CalendarClock, Scissors } from 'lucide-react';
import { obtenerPoliticaCambios } from '../../../lib/api/endpoints';
import { FRASE_HECHO_A_MEDIDA, frasePlazo, textoPlazo } from '../../../utils/politicaCambios';
import './PoliticaCambiosBlock.css';

/**
 * La política de cambios, como bloque fijo de la página "Cambios y
 * Devoluciones". No es texto libre: sale del ajuste (Ajustes del negocio ›
 * Política de cambios), el mismo que imprime el comprobante de la caja. Aquí
 * solo se elige dónde va y su título.
 */
const PoliticaCambiosBlock = ({ title, previewMode = false }) => {
    const [politica, setPolitica] = useState(null);

    useEffect(() => {
        obtenerPoliticaCambios().then(setPolitica).catch(() => setPolitica(null));
    }, []);

    if (!politica) return null;
    const conCambio = Number(politica.plazo) > 0;
    return (
        <section className={`cms-politica${previewMode ? ' cms-politica--previa' : ''}`}>
            {title && <h2 className="cms-titulo-bloque">{title}</h2>}
            <div className="cms-politica-tarjetas">
                <div className="cms-politica-tarjeta">
                    <CalendarClock size={22} aria-hidden="true" />
                    <span className="cms-politica-etiqueta">Plazo para cambios</span>
                    <strong className="cms-politica-cifra">{conCambio ? textoPlazo(politica) : 'Sin cambios'}</strong>
                    <p>{frasePlazo(politica)}</p>
                </div>
                {conCambio && politica.personalizadas_sin_cambio && (
                    <div className="cms-politica-tarjeta">
                        <Scissors size={22} aria-hidden="true" />
                        <span className="cms-politica-etiqueta">Pedidos especiales</span>
                        <strong className="cms-politica-cifra">Sin cambio</strong>
                        <p>{FRASE_HECHO_A_MEDIDA}</p>
                    </div>
                )}
            </div>
        </section>
    );
};

export default PoliticaCambiosBlock;
