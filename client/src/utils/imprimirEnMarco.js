import { armarHoja } from './impresion';

/**
 * Imprimir una hoja sin abrir otra ventana: se arma en un marco oculto de la
 * misma página y se imprime desde ahí.
 *
 * Existe por la caja. `window.open` solo funciona en respuesta directa a un
 * clic: el comprobante se imprime después de registrar la venta en el
 * servidor, y para entonces el navegador ya bloquea la ventana emergente.
 * Un marco no es una ventana emergente, así que no hay nada que bloquear. Con
 * Chrome abierto en `--kiosk-printing`, sale directo a la impresora.
 *
 * El marco se quita cuando terminó de imprimir (o al minuto, por si el
 * navegador no avisa).
 */
const ESPERA_ANTES_DE_IMPRIMIR = 300;
const QUITAR_A_MAS_TARDAR = 60000;

/** @param {{titulo: string, cuerpo: string, estilos: string|string[]}} doc */
export const imprimirEnMarco = (doc) => new Promise((resolve) => {
    const marco = document.createElement('iframe');
    marco.setAttribute('aria-hidden', 'true');
    marco.tabIndex = -1;
    Object.assign(marco.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });

    const quitar = () => marco.remove();
    marco.onload = () => {
        const ventana = marco.contentWindow;
        ventana.addEventListener('afterprint', quitar, { once: true });
        setTimeout(quitar, QUITAR_A_MAS_TARDAR);
        setTimeout(() => {
            ventana.focus();
            ventana.print();
            resolve(true);
        }, ESPERA_ANTES_DE_IMPRIMIR);
    };
    marco.srcdoc = armarHoja(doc);
    document.body.appendChild(marco);
});
