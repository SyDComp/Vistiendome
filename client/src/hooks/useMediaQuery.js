import { useState, useEffect } from 'react';

/**
 * Hook para detectar si el viewport coincide con un media query.
 *
 * @param {string|number} query - Media query string (ej: '(max-width: 768px)') o número para breakpoint (ej: 768)
 * @returns {boolean}
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 * const isMobile = useMediaQuery(768); // Atajo para max-width
 */
export const useMediaQuery = (query) => {
    const mediaQuery = typeof query === 'number'
        ? `(max-width: ${query}px)`
        : query;

    const [matches, setMatches] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(mediaQuery).matches;
        }
        return false;
    });

    useEffect(() => {
        const media = window.matchMedia(mediaQuery);
        const handler = (e) => setMatches(e.matches);

        // Modern API
        if (media.addEventListener) {
            media.addEventListener('change', handler);
            return () => media.removeEventListener('change', handler);
        }

        // Legacy API
        media.addListener(handler);
        return () => media.removeListener(handler);
    }, [mediaQuery]);

    return matches;
};

export default useMediaQuery;
