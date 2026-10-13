import React from 'react';
import { textoPrecio } from '../../../../../../utils/precioPrenda';
import { CAMINOS, textoQueda } from '../../../../../../utils/caminoPrenda';

/**
 * Una prenda en la propuesta de confirmación: de dónde sale, qué pasa si se
 * confirma así, y el aviso si es distinto de lo habitual. Solo pinta.
 */
const PrendaPropuesta = ({ prenda, onCamino, onQuitar, ocupado }) => {
    const id = `camino-${prenda.item_id}`;
    const conAviso = Boolean(prenda.aviso);
    return (
        <li className={conAviso ? 'cfp-prenda cfp-prenda--aviso' : 'cfp-prenda'}>
            <div className="cfp-prenda-fila">
                <div>
                    <p className="cfp-prenda-nombre">{prenda.cantidad}× {prenda.nombre}</p>
                    <p className="cfp-prenda-detalle">
                        {prenda.precio === null ? 'Por cotizar' : `${textoPrecio(prenda.precio)} c/u`}
                    </p>
                </div>
                <div className="cfp-camino">
                    <label htmlFor={id} className="cfp-oculto">De dónde sale</label>
                    <select id={id} className="sp-select" value={prenda.camino || ''} disabled={ocupado}
                        onChange={e => onCamino(prenda.item_id, e.target.value)}>
                        {!prenda.camino && <option value="" disabled>— Elige —</option>}
                        {prenda.opciones.map(c => <option key={c} value={c}>{CAMINOS[c]}</option>)}
                    </select>
                </div>
            </div>
            <p className={prenda.queda === 'ESPERANDO' || !prenda.camino ? 'cfp-queda cfp-queda--espera' : 'cfp-queda'}>
                {textoQueda(prenda)}
            </p>
            {conAviso && (
                <div className="cfp-aviso">
                    <p>{prenda.aviso}</p>
                    <button type="button" className="sp-boton" onClick={() => onQuitar(prenda)} disabled={ocupado}>
                        Quitar del pedido
                    </button>
                </div>
            )}
        </li>
    );
};

export default PrendaPropuesta;
