import { useCallback, useEffect, useRef, useState } from 'react';

const esCampo = (el) => Boolean(el) && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable);

/** El nombre que se lee de un campo: su aria-label, o el texto de su etiqueta. */
const nombreDe = (el) => (el.getAttribute('aria-label') || el.labels?.[0]?.textContent || el.placeholder || 'un campo')
    .replace(/\s+/g, ' ').trim();

/**
 * Los dos modos de la caja, como el chat de un juego:
 *   atajos     el normal: cada letra es una orden (B buscar, C cobrar…);
 *   escribir   con el foco en un campo: las letras escriben.
 * El modo sale de dónde está el foco; Esc pasa de uno a otro y, al volver a
 * escribir, devuelve al campo donde se estaba (decisión del usuario 2026-10-26).
 */
export default function useModoCaja(campoPorOmision) {
    const [campo, setCampo] = useState(null);     // el elemento con foco, si es un campo
    const ultimo = useRef(null);

    useEffect(() => {
        const alEnfocar = () => {
            const el = document.activeElement;
            if (esCampo(el)) { ultimo.current = el; setCampo(el); } else setCampo(null);
        };
        // focusout llega antes de que cambie el foco: se mira en el siguiente tick.
        const alSalir = () => setTimeout(alEnfocar, 0);
        document.addEventListener('focusin', alEnfocar);
        document.addEventListener('focusout', alSalir);
        return () => {
            document.removeEventListener('focusin', alEnfocar);
            document.removeEventListener('focusout', alSalir);
        };
    }, []);

    const alternar = useCallback(() => {
        if (esCampo(document.activeElement)) return document.activeElement.blur();
        const destino = ultimo.current?.isConnected ? ultimo.current : campoPorOmision.current;
        destino?.focus();
    }, [campoPorOmision]);

    return { modo: campo ? 'escribir' : 'atajos', nombreCampo: campo ? nombreDe(campo) : null, alternar };
}
