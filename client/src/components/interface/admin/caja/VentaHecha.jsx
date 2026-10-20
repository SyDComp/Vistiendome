import React from 'react';
import { CheckCircle2, Printer } from 'lucide-react';
import { formatCurrency } from '../../../../utils/cartUtils';

/**
 * La venta quedó registrada (y entregada). El comprobante ya salió; si no
 * salió, se reimprime desde aquí. Enter o Esc empiezan la siguiente.
 */
const VentaHecha = ({ pedido, vuelto, onReimprimir, imprimiendo, onNueva }) => (
    <div className="cj-hecha" role="status">
        <CheckCircle2 size={56} aria-hidden="true" />
        <h2>Venta N° {pedido.numero} registrada</h2>
        <p className="cj-hecha-total">{formatCurrency(pedido.pago?.total ?? 0)}</p>
        {vuelto > 0 && <p className="cj-hecha-vuelto">Vuelto: {formatCurrency(vuelto)}</p>}
        <div className="cj-hecha-acciones">
            <button type="button" className="sp-boton" onClick={onReimprimir} disabled={imprimiendo}>
                <Printer size={16} /> {imprimiendo ? 'Imprimiendo…' : 'Reimprimir comprobante'}
            </button>
            <button type="button" className="cj-cobrar" onClick={onNueva} autoFocus>
                Nueva venta <kbd>Enter</kbd>
            </button>
        </div>
    </div>
);

export default VentaHecha;
