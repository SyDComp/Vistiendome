import React from 'react';
import { getImageUrl } from '../../../../../lib/api/endpoints';
import TeclaOpcion from './TeclaOpcion';

/**
 * Un paso: las opciones de una característica. Cada una con su color o su
 * estampado si los tiene, y cuántas quedan libres con lo ya elegido. Las que
 * no tienen libres se ven apagadas y no se pueden elegir.
 */
const OpcionesPaso = ({ opciones, marcada, onElegir }) => (
    <div className="cj-sel-grilla cj-sel-grilla--opciones" role="listbox">
        {opciones.map((o, i) => {
            const sinLibres = o.libres <= 0;
            return (
                <button key={o.valor} type="button" role="option" aria-selected={i === marcada} aria-disabled={sinLibres}
                    className={`cj-sel-opcion${i === marcada ? ' cj-sel-opcion--marcada' : ''}${sinLibres ? ' cj-sel-opcion--sin' : ''}`}
                    onClick={() => !sinLibres && onElegir(i)}>
                    <TeclaOpcion indice={i} />
                    {o.hex && <span className="cj-sel-muestra" style={{ background: o.hex }} aria-hidden="true" />}
                    {o.imagen && <img className="cj-sel-muestra" src={getImageUrl(o.imagen)} alt="" loading="lazy" />}
                    <strong>{o.valor}</strong>
                    <span className="cj-sel-dato">{sinLibres ? 'no queda' : `${o.libres} libres`}</span>
                </button>
            );
        })}
    </div>
);

export default OpcionesPaso;
