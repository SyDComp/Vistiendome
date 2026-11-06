import { useEffect } from 'react';

/**
 * Hook para bloquear/desbloquear el scroll del body y html.
 * Útil para modales, drawers y rutas admin.
 * Implementa contador de referencias (reference counting) para que modales anidados
 * o paralelos no desbloqueen el scroll prematuramente.
 *
 * El bloqueo fija el body (styles/base/layout.css), y al fijarlo la ventana
 * vuelve a 0: abrir un modal abajo en la página y cerrarlo dejaba a la clienta
 * arriba de todo. Por eso se guarda dónde estaba: mientras dura, el body muestra
 * esa misma parte (no se mueve nada detrás del modal), y al soltar la ventana
 * vuelve ahí. Si mientras tanto se cambió de página, no se vuelve: esa posición
 * era de la otra.
 *
 * @param {boolean} isLocked - Si es true, bloquea el scroll.
 */
let lockCount = 0;
let posicion = { y: 0, ruta: '' };

export const useScrollLock = (isLocked) => {
    useEffect(() => {
        if (!isLocked) return;

        lockCount++;
        if (lockCount === 1) {
            posicion = { y: window.scrollY, ruta: window.location.pathname };
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
            document.body.classList.add('no-scroll');
            document.documentElement.classList.add('no-scroll');
            document.body.scrollTop = posicion.y;
        }

        return () => {
            lockCount = Math.max(0, lockCount - 1);
            if (lockCount === 0) {
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';
                document.body.classList.remove('no-scroll');
                document.documentElement.classList.remove('no-scroll');
                document.body.scrollTop = 0;
                if (posicion.y && window.location.pathname === posicion.ruta) {
                    window.scrollTo({ top: posicion.y, behavior: 'instant' });
                }
            }
        };
    }, [isLocked]);
};

export default useScrollLock;
