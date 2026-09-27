import { useEffect } from 'react';

/**
 * Publica cuanto mide el encabezado, para que nadie mas tenga que adivinarlo.
 *
 * EL PROBLEMA
 * La barra promocional y la cabecera van pegadas arriba con `position: fixed`,
 * asi que salen del flujo y no empujan a nadie. Todo lo que viene despues tiene
 * que apartarse a mano, y eso estaba escrito como numeros sueltos repartidos
 * por las hojas: `padding: 100px` en el cajon del menu, `padding-top: 110px` en
 * el cuerpo, `top: 40px` en la cabecera, `top: 100px` en dos barras laterales.
 * Cuatro numeros distintos para la misma medida, y ninguno era el bueno.
 *
 * Medido en la web publicada: la barra mide 40 y la cabecera 71, o sea que el
 * encabezado termina en 111. El cajon del menu reservaba 100, asi que los
 * primeros 11 pixeles del buscador quedaban tapados por el logo. Eso es lo que
 * se veia como el buscador pegado al logo.
 *
 * Y 11 pixeles es el caso bueno: el texto de la barra promocional se edita
 * desde el panel, y en cuanto no cabe en una linea pasa a dos y la barra mide
 * el doble. Ahi ya no son 11 pixeles, es media pantalla corrida.
 *
 * POR QUE ESTO SI VA EN JAVASCRIPT
 * Se saco de aca todo lo que decidia DISEÑO mirando la ventana -si apilar, si
 * ocultar, que tamaño de letra-, porque eso lo hace mejor una consulta de
 * medios. Esto es otra cosa: es MEDIR algo que el CSS no puede saber. Una hoja
 * de estilos no tiene forma de preguntar cuanto mide un elemento; puede
 * reaccionar al ancho de la ventana, pero no a la altura que termino teniendo
 * un texto que escribio otra persona.
 *
 * Asi que se mide una vez, se publica, y las hojas vuelven a decidir todo lo
 * demas.
 *
 * QUE PUBLICA
 *   --alto-banner      lo que mide la barra promocional (0 si no esta)
 *   --alto-encabezado  la barra y la cabecera juntas
 */

/** Las piezas pegadas arriba, en el orden en que se apilan. */
const PIEZAS_FIJAS = ['.top-banner', '.navbar-header'];

const publicar = () => {
    const raiz = document.documentElement;

    const medir = (selector) => {
        const elemento = document.querySelector(selector);
        // `offsetHeight` y no el rectangulo: la cabecera se esconde al bajar
        // con un `transform`, y eso mueve su rectangulo pero no su altura. Si
        // midieramos posiciones, la medida bailaria con cada scroll.
        return elemento ? elemento.offsetHeight : 0;
    };

    const alturas = PIEZAS_FIJAS.map(medir);
    const total = alturas.reduce((suma, alto) => suma + alto, 0);

    raiz.style.setProperty('--alto-banner', `${alturas[0]}px`);
    raiz.style.setProperty('--alto-encabezado', `${total}px`);
};

export const useAltoEncabezado = () => {
    useEffect(() => {
        publicar();

        // Cambia de alto cuando cambia el ancho -el texto de la barra pasa a
        // dos lineas- y tambien cuando el texto mismo cambia desde el panel.
        const observadorDeTamano = new ResizeObserver(publicar);
        PIEZAS_FIJAS.forEach((selector) => {
            const elemento = document.querySelector(selector);
            if (elemento) observadorDeTamano.observe(elemento);
        });

        // La barra aparece y desaparece: al cerrarla, y al entrar a una pagina
        // que no la muestra. Cuando eso pasa hay un elemento nuevo que observar,
        // asi que se vuelve a medir y a enganchar.
        const observadorDelCuerpo = new MutationObserver(() => {
            publicar();
            observadorDeTamano.disconnect();
            PIEZAS_FIJAS.forEach((selector) => {
                const elemento = document.querySelector(selector);
                if (elemento) observadorDeTamano.observe(elemento);
            });
        });
        observadorDelCuerpo.observe(document.body, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => {
            observadorDeTamano.disconnect();
            observadorDelCuerpo.disconnect();
        };
    }, []);
};

export default useAltoEncabezado;
