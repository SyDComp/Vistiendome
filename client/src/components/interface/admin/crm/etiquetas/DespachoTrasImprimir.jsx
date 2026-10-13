import React from 'react';
import { formatCurrency } from '../../../../../utils/cartUtils';

/**
 * Después de imprimir: "¿ya salieron?". Imprimir no despacha —una etiqueta se
 * reimprime, se prueba la impresora—, así que despachar es un clic aparte, y
 * solo para los pedidos listos. Los que no lo están se nombran con lo que les
 * falta.
 *
 * `pedidos`: los recién impresos que se despachan (confirmados, no retiros).
 */
const DespachoTrasImprimir = ({ pedidos, onMarcar, onCerrar }) => {
    // Sale lo listo y pagado: un despacho se paga entero antes de mandarlo.
    const sale = (c) => c.produccion?.listo && (c.pago?.saldo || 0) <= 0;
    const listos = pedidos.filter(sale);
    const noListos = pedidos.filter(c => !sale(c));
    const falta = (c) => [
        ...(c.produccion?.falta || []),
        ...((c.pago?.saldo || 0) > 0 ? [`falta pagar ${formatCurrency(c.pago.saldo)}`] : []),
    ].join('; ');
    return (
        <div className="et-despacho et-despacho--pregunta" role="status">
            <div className="et-despacho-texto">
                <strong>¿Ya salieron los paquetes?</strong>
                {listos.length > 0 && (
                    <span> Marca como despachados los que ya entregaste al transporte.</span>
                )}
                {noListos.length > 0 && (
                    <ul className="et-despacho-falta">
                        {noListos.map(c => (
                            <li key={c.id}>
                                N° {c.numero} todavía no sale: {falta(c) || 'revísalo en Cotizaciones'}.
                            </li>
                        ))}
                    </ul>
                )}
            </div>
            {listos.length > 0 && (
                <button type="button" onClick={() => onMarcar(listos)} className="et-boton-morado">
                    Marcar como despachados ({listos.length})
                </button>
            )}
            <button type="button" onClick={onCerrar} className="et-boton-morado-plano">
                Ahora no
            </button>
        </div>
    );
};

export default DespachoTrasImprimir;
