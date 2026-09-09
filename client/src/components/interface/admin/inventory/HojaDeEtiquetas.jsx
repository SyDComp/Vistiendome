import React from 'react';
import DOMPurify from 'dompurify';
import { formatCurrency } from '../../../../utils/cartUtils';

/**
 * La vista previa de una hoja de codigos de barra, tal como saldra impresa.
 *
 * POR QUE EXISTE ESTE ARCHIVO
 * Este bloque estaba escrito DOS VECES dentro de `BarcodePrinter`, palabra por
 * palabra: una para el panel lateral y otra para la ventana ampliada. Cincuenta
 * lineas repetidas, y la unica diferencia entre las dos copias era el ancho de
 * la hoja. Cualquier arreglo habia que hacerlo dos veces, y bastaba olvidar una
 * para que las dos vistas previas dejaran de coincidir entre si.
 *
 * QUIEN CALCULA EL TAMANO
 * Antes lo hacia JavaScript: media `window.innerWidth`, le restaba los
 * margenes, sacaba el alto por regla de tres y dividia el resto entre las
 * columnas para dar a cada etiqueta su ancho en pixeles. Todo eso obligaba a
 * escuchar el `resize` de la ventana y a redibujar la hoja entera en cada pixel
 * que se arrastraba el borde.
 *
 * Ahora lo hace el CSS, que es quien sabe de esto:
 *
 *     el ancho de la hoja   `clamp()` sobre el ancho disponible
 *     el alto               `aspect-ratio`, con la proporcion del papel real
 *     cada etiqueta         `1fr` dentro de la rejilla
 *     el texto              `cqh`, proporcional a la altura de su etiqueta
 *
 * De aqui solo salen los datos que el CSS no puede saber: cuantas columnas y
 * filas tiene el papel elegido, y de que color es cada etiqueta.
 */

/** Reparte las etiquetas en hojas del tamano que entre en el papel. */
const enPaginas = (etiquetas, porPagina) =>
    Array.from(
        { length: Math.ceil(etiquetas.length / porPagina) },
        (_, i) => etiquetas.slice(i * porPagina, i * porPagina + porPagina)
    );

const LIMPIEZA_SVG = { ADD_TAGS: ['svg', 'g', 'rect', 'text', 'path'] };

const HojaDeEtiquetas = ({
    etiquetas,
    grid,
    colorMap,
    svgMap,
    paleta,
    estilo,
    mostrarTexto,
    amplia = false,
}) => {
    const clasica = estilo === 'classic';

    return (
        <div className="barcode-printer-pages">
            {enPaginas(etiquetas, grid.total).map((pagina, nPagina) => (
                <div
                    key={nPagina}
                    className={`barcode-printer-page${amplia ? ' barcode-printer-page--amplia' : ''}`}
                    style={{
                        '--columnas': grid.cols,
                        '--filas': grid.rows,
                        '--papel-ancho': grid.paperW,
                        '--papel-alto': grid.paperH,
                    }}
                >
                    {pagina.map((etiqueta, i) => {
                        const color = colorMap[etiqueta.sku] || paleta[0];
                        const detalle = Object.values(etiqueta.config || {}).join(' / ');
                        const nombre = detalle
                            ? `${etiqueta.productName} – ${detalle}`
                            : etiqueta.productName || etiqueta.sku;

                        return (
                            <div
                                key={i}
                                title={`${etiqueta.productName}\n${etiqueta.sku}`}
                                className={`barcode-printer-label${clasica ? ' barcode-printer-label--clasica' : ''}`}
                                // Solo el color viaja por el estilo, porque es un
                                // dato: cada variante tiene el suyo. El resto es
                                // igual para todas y vive en la hoja.
                                style={clasica ? undefined : {
                                    '--etiqueta-fondo': color.bg,
                                    '--etiqueta-borde': color.border,
                                    '--etiqueta-texto': color.text,
                                }}
                            >
                                <div className="barcode-printer-label-svg">
                                    {svgMap[etiqueta.barcode] ? (
                                        <div
                                            className="barcode-printer-label-svg-inner"
                                            dangerouslySetInnerHTML={{
                                                __html: DOMPurify.sanitize(svgMap[etiqueta.barcode], LIMPIEZA_SVG),
                                            }}
                                        />
                                    ) : (
                                        <span className="barcode-printer-label-loading">Generando...</span>
                                    )}
                                </div>

                                {mostrarTexto && (
                                    <span className="barcode-printer-label-text">{nombre}</span>
                                )}

                                {etiqueta.price != null && (
                                    <span className="barcode-printer-label-text">
                                        <strong>{formatCurrency(etiqueta.price)}</strong> · Vistiendomé
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export default HojaDeEtiquetas;
