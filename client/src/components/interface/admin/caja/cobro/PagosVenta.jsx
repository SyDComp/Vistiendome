import React from 'react';
import { formatCurrency } from '../../../../../utils/cartUtils';

/**
 * Cómo paga: uno o más pagos (parte en efectivo, parte con débito…) que
 * tienen que sumar justo el total. "Agregar otro medio" propone lo que falta.
 */
const PagosVenta = ({ pagos, medios, falta, onCambiar, disabled }) => {
    const cambiar = (i, cambio) => onCambiar(pagos.map((p, j) => (j === i ? { ...p, ...cambio } : p)));
    return (
        <fieldset className="vl-bloque" disabled={disabled}>
            <legend className="vl-titulo">Pago</legend>
            {pagos.map((p, i) => (
                <div key={i} className="vl-pago">
                    <label className="sp-pago-campo">
                        Medio
                        <select className="sp-select" value={p.medio} onChange={e => cambiar(i, { medio: e.target.value })}>
                            {medios.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </label>
                    <label className="sp-pago-campo">
                        Monto
                        <input type="text" inputMode="numeric" className="sp-select" value={p.monto}
                            onChange={e => cambiar(i, { monto: e.target.value })} />
                    </label>
                    {pagos.length > 1 && (
                        <button type="button" className="sp-boton" onClick={() => onCambiar(pagos.filter((_, j) => j !== i))}>
                            Quitar
                        </button>
                    )}
                </div>
            ))}
            <div className="vl-pago-pie">
                {falta !== 0 && (
                    <span className={falta > 0 ? 'vl-falta' : 'vl-sobra'}>
                        {falta > 0 ? `Falta ${formatCurrency(falta)}` : `Sobra ${formatCurrency(-falta)}`}
                    </span>
                )}
                {falta > 0 && (
                    <button type="button" className="sp-boton"
                        onClick={() => onCambiar([...pagos, { medio: medios[0] || '', monto: String(falta) }])}>
                        Agregar otro medio
                    </button>
                )}
            </div>
        </fieldset>
    );
};

export default PagosVenta;
