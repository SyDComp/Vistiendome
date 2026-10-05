import React from 'react';
import Barcode from 'react-barcode';
import { describirEntrega } from '../../../../../utils/entrega';
import { getShippingColor } from '../../../../../utils/shippingColors';
import { formatearTelefono } from '../../../../../utils/telefono';
import { nombreDelPedido } from '../../../../../utils/nombreDelPedido';
import './EtiquetaEnvio.css';

/**
 * La etiqueta que se pega al paquete. La misma pieza se usa en la vista
 * previa y en la hoja que se imprime, así que lo que se ve es lo que sale.
 *
 * No decide su tamaño de letra: lo toma de `--ee-escala`, que ajusta quien
 * la acomoda en la hoja (ver useAjusteAlEspacio).
 */
const EtiquetaEnvio = ({
    cotizacion,
    persona,
    tinta = 'eco',
    conCorte = true,
    continua = false,
    codigo = 'compact',
    conColorTransporte = true,
    coloresTransporte = {},
}) => {
    const entrega = describirEntrega(cotizacion);
    const nombre = nombreDelPedido(cotizacion, persona) || 'Destinatario';
    const colorTransporte = entrega.transporte
        ? getShippingColor(entrega.transporte, coloresTransporte)
        : null;
    const numero = cotizacion.numero != null ? `N° ${cotizacion.numero}` : `#${cotizacion.id}`;

    const clases = [
        'ee-etiqueta',
        `ee-etiqueta--${tinta}`,
        conCorte && 'ee-etiqueta--corte',
        continua && 'ee-etiqueta--continua',
    ].filter(Boolean).join(' ');

    return (
        <div className={clases}>
            <div className="ee-contenido">
                <div className="ee-marca">
                    <div className="ee-marca-nombre">VISTIENDOMÉ CHILE</div>
                    <div className="ee-marca-lema">TIENDA DE MODA CRISTIANA</div>
                </div>

                <div className="ee-bloque">
                    <div className="ee-rotulo">Destinatario</div>
                    <div className="ee-nombre">{nombre.toUpperCase()}</div>
                    {persona?.rut && <div className="ee-dato"><strong>RUT:</strong> {persona.rut}</div>}
                    {persona?.telefono && <div className="ee-dato"><strong>TEL:</strong> {formatearTelefono(persona.telefono)}</div>}
                    {persona?.email_personal && <div className="ee-dato">{persona.email_personal}</div>}
                </div>

                <div className="ee-bloque ee-bloque--entrega">
                    <div className="ee-rotulo">{entrega.titulo}</div>
                    {entrega.transporte && (
                        <div
                            className={`ee-transporte${conColorTransporte ? ' ee-transporte--color' : ''}`}
                            style={conColorTransporte ? { '--ee-transporte': colorTransporte } : undefined}
                        >
                            TRANSPORTE: {entrega.transporte.toUpperCase()}
                        </div>
                    )}
                    <div className="ee-rotulo">{entrega.etiquetaDestino}</div>
                    <div className="ee-destino">{entrega.destino.toUpperCase()}</div>
                    {entrega.muestraComuna && (
                        <div className="ee-lugar">
                            <div>
                                <div className="ee-lugar-rotulo">Comuna</div>
                                <div>{(cotizacion.comuna || '---').toUpperCase()}</div>
                            </div>
                            <div className="ee-lugar-region">
                                <div className="ee-lugar-rotulo">Región</div>
                                <div>{(cotizacion.region || '---').toUpperCase()}</div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="ee-pie">
                    {codigo && (
                        <div className={`ee-codigo-barras ee-codigo-barras--${codigo}`}>
                            <Barcode
                                value={`COTI-${cotizacion.id}`}
                                format="CODE128"
                                width={2}
                                height={60}
                                margin={0}
                                displayValue={false}
                                background="transparent"
                                lineColor="#000000"
                            />
                        </div>
                    )}
                    <div className="ee-pedido">PEDIDO {numero}</div>
                </div>
            </div>
        </div>
    );
};

export default EtiquetaEnvio;
