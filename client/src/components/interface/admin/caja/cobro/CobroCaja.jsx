import React from 'react';
import { formatCurrency } from '../../../../../utils/cartUtils';
import ClientaVenta from './ClientaVenta';
import { pesos } from '../../../../../utils/ventaLocal';
import PagosVenta from './PagosVenta';

const EFECTIVO = 'Efectivo';

/**
 * El cobro: el total, quién compra (sin datos, si no los quiere dar), cómo
 * paga y, si paga en efectivo, con cuánto, para calcular el vuelto. El vuelto
 * no se registra: lo que entra a la caja es el monto del pago.
 */
const CobroCaja = ({
    total, sinDatos, clienta, onSinDatos, onClienta, pagos, medios, falta, onPagos,
    recibido, onRecibido, puedeCobrar, onCobrar, enviando,
}) => {
    const efectivo = pagos.filter(p => p.medio === EFECTIVO).reduce((t, p) => t + pesos(p.monto), 0);
    const vuelto = pesos(recibido) - efectivo;
    return (
        <aside className="cj-cobro" aria-label="Cobro">
            <div className="cj-total">
                <span>Total</span>
                <strong>{formatCurrency(total)}</strong>
            </div>
            <ClientaVenta sinDatos={sinDatos} clienta={clienta} onSinDatos={onSinDatos} onCambiar={onClienta} disabled={enviando} />
            {total > 0 && <PagosVenta pagos={pagos} medios={medios} falta={falta} onCambiar={onPagos} disabled={enviando} />}
            {efectivo > 0 && (
                <div className="cj-vuelto">
                    <label className="sp-pago-campo">
                        Paga con (efectivo)
                        <input type="text" inputMode="numeric" className="sp-select" value={recibido} disabled={enviando}
                            placeholder={String(efectivo)} onChange={e => onRecibido(e.target.value)} />
                    </label>
                    {pesos(recibido) > 0 && (
                        <p className={vuelto >= 0 ? 'cj-vuelto-monto' : 'vl-falta'}>
                            {vuelto >= 0 ? `Vuelto ${formatCurrency(vuelto)}` : `Faltan ${formatCurrency(-vuelto)} en efectivo`}
                        </p>
                    )}
                </div>
            )}
            <button type="button" className="cj-cobrar" onClick={onCobrar} disabled={!puedeCobrar || enviando}>
                {enviando ? 'Registrando…' : `Cobrar e imprimir${total ? ` · ${formatCurrency(total)}` : ''}`}
                <kbd>F9</kbd>
            </button>
        </aside>
    );
};

export default CobroCaja;
