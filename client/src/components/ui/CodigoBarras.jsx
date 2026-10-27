import React from 'react';
import ReactBarcode from 'react-barcode';

/**
 * El código de barras de una variante, dibujado igual en todas partes: la
 * etiqueta impresa, la tabla del panel y la ficha del sitio. Una sola forma
 * de dibujarlo para que el lector de la caja lea lo mismo en cualquiera.
 *
 * Recibe el código de la variante (`sku.barcode`, sus 13 dígitos) y nada más.
 * Sin código no dibuja nada: antes, cada pantalla caía al texto del SKU, y la
 * ficha del sitio mostraba un código de 45 caracteres que no era el de la
 * etiqueta y que la caja no reconocía.
 *
 * El tamaño y los colores los decide quien lo usa (`width`, `height`,
 * `fontSize`, `margin`, `background`...); el formato y el valor, no.
 */
const CodigoBarras = ({ codigo, ...apariencia }) => {
    if (!codigo) return null;
    return <ReactBarcode displayValue={true} {...apariencia} value={codigo} format="CODE128" />;
};

export default CodigoBarras;
