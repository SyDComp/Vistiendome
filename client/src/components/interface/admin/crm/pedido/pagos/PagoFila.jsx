import React from 'react';
import { formatCurrency } from '../../../../../../utils/cartUtils';

const FECHA = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' });

// Lo que no es un pago: sale del pedido.
const TIPOS = { DEVOLUCION: 'Devolución', A_FAVOR: 'Quedó a favor de la clienta' };

/** Un pago de la lista. Anulado se ve tachado, con su motivo: no desaparece. */
const PagoFila = ({ pago, onAnular }) => {
    const anulado = Boolean(pago.anulado_en);
    return (
        <li className={anulado ? 'sp-pago sp-pago--anulado' : 'sp-pago'}>
            <div className="sp-prenda-fila">
                <div>
                    <p className="sp-prenda-nombre">
                        {TIPOS[pago.tipo] && <span className="sp-pago-tipo">{TIPOS[pago.tipo]}: </span>}
                        <span className="sp-pago-monto">{TIPOS[pago.tipo] ? '−' : ''}{formatCurrency(pago.monto)}</span>
                        {pago.tipo !== 'A_FAVOR' && ` · ${pago.medio}`}
                    </p>
                    <p className="sp-prenda-detalle">
                        {FECHA.format(new Date(pago.registrado_en))}{pago.registrado_por ? ` · ${pago.registrado_por}` : ''}
                    </p>
                    {pago.nota && <p className="sp-prenda-detalle">“{pago.nota}”</p>}
                    {anulado && (
                        <p className="sp-pago-anulado">
                            Anulado{pago.anulado_por ? ` por ${pago.anulado_por}` : ''}: {pago.anulado_motivo}
                        </p>
                    )}
                </div>
                {!anulado && (
                    <button type="button" className="sp-boton" onClick={() => onAnular(pago)}>Anular</button>
                )}
            </div>
        </li>
    );
};

export default PagoFila;
