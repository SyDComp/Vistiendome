import React from 'react';
import DOMPurify from 'dompurify';
import { formatCurrency } from '../../../../../utils/cartUtils';
import { textoDeEtiqueta } from './textoDeEtiqueta';
import './EtiquetaCodigo.css';

const LIMPIEZA_SVG = { ADD_TAGS: ['svg', 'g', 'rect', 'text', 'path'] };

/**
 * La etiqueta de código de barras de una variante. La misma pieza se usa en
 * la vista previa y en la hoja que se imprime.
 *
 * El texto no se corta con "…": baja a otra línea, y el tamaño de letra lo
 * ajusta quien la acomoda en la hoja (ver ui/impresion/ajusteAlEspacio.js).
 *
 * @param etiqueta      { sku, barcode, productName, config, price }
 * @param svg           el código ya dibujado, como texto SVG
 * @param color         { bg, border, text } en el estilo de color
 * @param mostrarTexto  false = solo barras, talla y precio
 */
const EtiquetaCodigo = ({ etiqueta, svg, color, clasica, mostrarTexto }) => {
    const { talla, descripcion } = textoDeEtiqueta(etiqueta);
    const estiloColor = clasica || !color ? undefined : {
        '--cb-fondo': color.bg,
        '--cb-borde': color.border,
        '--cb-texto': color.text,
    };

    return (
        <div
            className={`cb-etiqueta${clasica ? ' cb-etiqueta--clasica' : ''}`}
            style={estiloColor}
            data-ajuste=""
            data-ajuste-clave={`${etiqueta.sku}|${mostrarTexto ? 'texto' : 'barras'}`}
            title={`${etiqueta.productName}\n${etiqueta.sku}`}
        >
            <div className="cb-contenido">
                <div className="cb-barras">
                    {svg
                        ? <div className="cb-barras-svg" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(svg, LIMPIEZA_SVG) }} />
                        : <span className="cb-cargando">Generando…</span>}
                </div>
                {/* La talla siempre: es lo que se busca en el estante. */}
                {talla && <div className="cb-talla">TALLA {talla}</div>}
                {mostrarTexto && <div className="cb-descripcion">{descripcion}</div>}
                {etiqueta.price != null && (
                    <div className="cb-precio"><strong>{formatCurrency(etiqueta.price)}</strong> · Vistiendomé</div>
                )}
            </div>
        </div>
    );
};

export default EtiquetaCodigo;
