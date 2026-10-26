import { useEffect, useRef } from 'react';
import { PREFIJO_LECTOR } from '../../../../../constants/lector';
import { crearDetector } from '../../../../../utils/lecturaPistola';

// Cuándo llegó la última tecla, de quien sea. El selector la mira antes de
// tomar un número como elección: si detrás vino otra tecla al instante, era
// la pistola (ver SelectorPrendas).
let ultimaTecla = 0;
export const huboTeclasDespues = (momento) => ultimaTecla > momento;

const esCampo = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');

/** Saca las `n` letras que la pistola alcanzó a escribir en el campo, antes del cursor. */
const deshacer = (campo, n) => {
    if (!esCampo(campo) || n <= 0) return;
    const fin = campo.selectionStart ?? campo.value.length;
    const valor = campo.value.slice(0, Math.max(0, fin - n)) + campo.value.slice(fin);
    // React no se entera de `campo.value = …`: hay que pasar por el setter nativo
    // y avisar con un evento, como si se hubiera tecleado.
    const prototipo = campo.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    Object.getOwnPropertyDescriptor(prototipo, 'value').set.call(campo, valor);
    campo.dispatchEvent(new Event('input', { bubbles: true }));
};

/**
 * Lo que lee la pistola va directo a la venta, esté donde esté el foco: no
 * pasa por ningún campo (utils/lecturaPistola.js dice cómo se reconoce).
 * Escucha antes que nadie (fase de captura) para que sus teclas no lleguen
 * a otro lado.
 */
export default function usePistola(onLeido) {
    const alLeer = useRef(onLeido);
    useEffect(() => { alLeer.current = onLeido; }, [onLeido]);

    useEffect(() => {
        const detector = crearDetector({ prefijo: PREFIJO_LECTOR });
        const teclas = (e) => {
            ultimaTecla = e.timeStamp;
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            const r = detector(e.key, e.timeStamp);
            if (r.accion === 'pasar') return;
            e.preventDefault();
            // Inmediata: el selector también escucha en la ventana, en captura.
            e.stopImmediatePropagation();
            if (r.accion === 'leido') {
                deshacer(document.activeElement, r.escapadas);
                alLeer.current(r.codigo);
            }
        };
        window.addEventListener('keydown', teclas, true);
        return () => window.removeEventListener('keydown', teclas, true);
    }, []);
}
