import React from 'react';
import PrecioInput from '../../../../ui/PrecioInput';
import './pedido.css';

const OPCIONES = [
    { tipo: 'monto', etiqueta: 'Monto' },
    { tipo: 'por_cotizar', etiqueta: 'Por cotizar' },
    { tipo: 'sin_costo', etiqueta: 'Sin costo' },
];

/**
 * El precio de una prenda en sus tres estados: un monto, por cotizar o sin
 * costo. Se elige uno a propósito; el monto se escribe solo si es un monto.
 *
 * Controlado: `valor` es {tipo, monto} (ver utils/precioPrenda: valorDesde).
 */
const SelectorPrecio = ({ id, valor, onChange, disabled = false }) => (
    <div className="sp-precio">
        <div className="sp-precio-opciones" role="radiogroup" aria-label="Precio">
            {OPCIONES.map(o => (
                <button
                    key={o.tipo}
                    type="button"
                    role="radio"
                    aria-checked={valor.tipo === o.tipo}
                    className={valor.tipo === o.tipo ? 'sp-precio-opcion sp-precio-opcion--activa' : 'sp-precio-opcion'}
                    onClick={() => onChange({ ...valor, tipo: o.tipo })}
                    disabled={disabled}
                >
                    {o.etiqueta}
                </button>
            ))}
        </div>
        {valor.tipo === 'monto' && (
            <>
                <label htmlFor={id} className="sp-oculto">Monto en pesos</label>
                {/* En pesos chilenos: "21.990" son veintiún mil novecientos noventa (ui/PrecioInput). */}
                <PrecioInput
                    id={id}
                    className="sp-precio-monto"
                    placeholder="$ monto"
                    value={valor.monto}
                    onChange={monto => onChange({ ...valor, monto })}
                    disabled={disabled}
                />
            </>
        )}
    </div>
);

export default SelectorPrecio;
