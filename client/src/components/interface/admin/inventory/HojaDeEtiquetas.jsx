import React, { useRef } from 'react';
import PaginaEtiquetas from '../../../ui/impresion/PaginaEtiquetas';
import EncuadrePagina from '../../../ui/impresion/EncuadrePagina';
import { useAjusteAlEspacio } from '../../../ui/impresion/ajusteAlEspacio';
import EtiquetaCodigo from './codigos/EtiquetaCodigo';

/**
 * Las hojas de códigos de barra, tal como saldrán impresas.
 *
 * Cada página mide lo que mide el papel elegido; en pantalla solo se achica
 * para mirarla (EncuadrePagina). Por eso la impresión copia estas mismas
 * páginas: lo que se ve es lo que sale, con la misma letra ya ajustada.
 *
 * @param geometria  la página en milímetros (ver ui/impresion/pagina.js)
 */

/** Reparte las etiquetas en hojas del tamaño que entre en el papel. */
const enPaginas = (etiquetas, porPagina) =>
    Array.from(
        { length: Math.ceil(etiquetas.length / porPagina) },
        (_, i) => etiquetas.slice(i * porPagina, i * porPagina + porPagina)
    );

const HojaDeEtiquetas = ({ etiquetas, geometria, colorMap, svgMap, estilo, mostrarTexto }) => {
    const hojasRef = useRef(null);
    const clasica = estilo === 'classic';
    const paginas = enPaginas(etiquetas, geometria.cols * geometria.filas);

    useAjusteAlEspacio(hojasRef, [etiquetas, geometria, svgMap, estilo, mostrarTexto]);

    return (
        <div ref={hojasRef} className="barcode-printer-pages">
            {paginas.map((pagina, nPagina) => (
                <EncuadrePagina key={nPagina}>
                    <PaginaEtiquetas geometria={geometria}>
                        {pagina.map((etiqueta, i) => (
                            <EtiquetaCodigo
                                key={i}
                                etiqueta={etiqueta}
                                svg={svgMap[etiqueta.barcode]}
                                color={colorMap[etiqueta.sku]}
                                clasica={clasica}
                                mostrarTexto={mostrarTexto}
                            />
                        ))}
                    </PaginaEtiquetas>
                </EncuadrePagina>
            ))}
        </div>
    );
};

export default HojaDeEtiquetas;
