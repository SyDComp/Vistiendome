import React from 'react';

/**
 * Después de imprimir: "¿ya salieron?". Imprimir no despacha —una etiqueta se
 * reimprime, se prueba la impresora—, así que despachar es un clic aparte, y
 * solo para los pedidos listos. Los que no lo están se nombran con lo que les
 * falta.
 *
 * `pedidos`: los recién impresos que se despachan (confirmados, no retiros).
 */
const DespachoTrasImprimir = ({ pedidos, onMarcar, onCerrar }) => {
    const listos = pedidos.filter(c => c.produccion?.listo);
    const noListos = pedidos.filter(c => !c.produccion?.listo);
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
                                N° {c.numero} todavía no está listo: {(c.produccion?.falta || []).join('; ') || 'revísalo en Cotizaciones'}.
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
