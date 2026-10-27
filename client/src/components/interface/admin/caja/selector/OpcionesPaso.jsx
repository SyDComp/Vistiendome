import React from 'react';
import { Check } from 'lucide-react';
import { getImageUrl } from '../../../../../lib/api/endpoints';
import TeclaOpcion from './TeclaOpcion';

/**
 * Una página de opciones: las de una característica al elegir una prenda, los
 * filtros, o sus valores. Cada una con su color o su estampado si los tiene y
 * un detalle (cuántas quedan). Las apagadas se ven pero no se eligen; las
 * marcadas (un filtro puesto) llevan su ✓.
 *
 * @param opciones [{clave, titulo, detalle, hex, imagen, apagada, marcada}]
 */
const OpcionesPaso = ({ opciones, marcada, onElegir }) => (
    <div className="cj-sel-grilla cj-sel-grilla--opciones" role="listbox">
        {opciones.map((o, i) => (
            <button key={o.clave} type="button" role="option" aria-selected={i === marcada} aria-disabled={o.apagada}
                className={`cj-sel-opcion${i === marcada ? ' cj-sel-opcion--marcada' : ''}${o.apagada ? ' cj-sel-opcion--sin' : ''}${o.marcada ? ' cj-sel-opcion--puesta' : ''}`}
                onClick={() => !o.apagada && onElegir(i)}>
                <TeclaOpcion indice={i} />
                {o.hex && <span className="cj-sel-muestra" style={{ background: o.hex }} aria-hidden="true" />}
                {o.imagen && <img className="cj-sel-muestra" src={getImageUrl(o.imagen)} alt="" loading="lazy" />}
                <strong>{o.marcada && <Check size={15} aria-label="Puesto" />} {o.titulo}</strong>
                {o.detalle && <span className="cj-sel-dato">{o.detalle}</span>}
            </button>
        ))}
    </div>
);

export default OpcionesPaso;
