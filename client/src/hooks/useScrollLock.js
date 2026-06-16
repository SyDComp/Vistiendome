import { useEffect } from 'react';

/**
 * Hook para bloquear/desbloquear el scroll del body y html.
 * Útil para modales, drawers y rutas admin.
 *
 * @param {boolean} isLocked - Si es true, bloquea el scroll.
 */
export const useScrollLock = (isLocked) => {
    useEffect(() => {
        if (!isLocked) return;

        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
        document.body.classList.add('no-scroll');
        document.documentElement.classList.add('no-scroll');

        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
            document.body.classList.remove('no-scroll');
            document.documentElement.classList.remove('no-scroll');
        };
    }, [isLocked]);
};

export default useScrollLock;
