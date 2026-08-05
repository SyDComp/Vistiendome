import { useEffect } from 'react';

/**
 * Hook para bloquear/desbloquear el scroll del body y html.
 * Útil para modales, drawers y rutas admin.
 * Implementa contador de referencias (reference counting) para que modales anidados
 * o paralelos no desbloqueen el scroll prematuramente.
 *
 * @param {boolean} isLocked - Si es true, bloquea el scroll.
 */
let lockCount = 0;

export const useScrollLock = (isLocked) => {
    useEffect(() => {
        if (!isLocked) return;

        lockCount++;
        if (lockCount === 1) {
            document.body.style.overflow = 'hidden';
            document.documentElement.style.overflow = 'hidden';
            document.body.classList.add('no-scroll');
            document.documentElement.classList.add('no-scroll');
        }

        return () => {
            lockCount = Math.max(0, lockCount - 1);
            if (lockCount === 0) {
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';
                document.body.classList.remove('no-scroll');
                document.documentElement.classList.remove('no-scroll');
            }
        };
    }, [isLocked]);
};

export default useScrollLock;
