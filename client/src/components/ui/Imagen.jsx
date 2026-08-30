import React from 'react';
import { getImageUrl } from '../../lib/api/endpoints/index.js';
import useSrcSet from '../../hooks/useSrcSet.js';

/**
 * Una imagen de la biblioteca de medios, con sus derivadas resueltas sola.
 *
 * La forma corta es la correcta: `<Imagen url={...} sizes="90px" />` baja la
 * derivada que corresponde aunque el endpoint que sirvió esa URL no haya
 * mandado nada. Toda la lógica de resolución vive en `useSrcSet`.
 *
 * Para tarjetas con esqueleto de carga y transición, usar `PremiumImage`, que
 * resuelve el srcset por el mismo camino.
 */
const Imagen = ({
    url,
    srcset = '',
    // Cuánto espacio ocupa la imagen en pantalla. El navegador elige la
    // derivada con este dato ANTES de conocer el layout: sin él supone el ancho
    // completo de la ventana y baja de más.
    // El valor por omisión asume una miniatura, que es lo que son casi todas
    // las de esta aplicación. Una imagen grande TIENE que pasar el suyo.
    sizes = '200px',
    alt = '',
    lazy = true,
    ...props
}) => {
    const { srcSet, listo } = useSrcSet(url, srcset);

    if (!url) return null;
    // Mientras no se sepa qué derivadas tiene, no se pinta: pintar ahora es
    // mandar al navegador a buscar el original. El hueco conserva la clase y el
    // estilo del que llama para que la caja no cambie de tamaño después.
    if (!listo) return <span {...props} aria-hidden="true" />;

    return (
        <img
            src={getImageUrl(url)}
            srcSet={srcSet || undefined}
            sizes={srcSet ? sizes : undefined}
            loading={lazy ? 'lazy' : 'eager'}
            decoding="async"
            alt={alt}
            {...props}
        />
    );
};

export default Imagen;
