import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook declarativo para data fetching.
 * Maneja automáticamente los estados de loading, error y data.
 *
 * @param {Function} fetchFn - Función async que retorna los datos.
 * @param {Array} deps - Dependencias para re-ejecutar el fetch (similar a useEffect).
 * @param {Object} options - Opciones adicionales.
 * @param {boolean} options.enabled - Si es false, no ejecuta el fetch automáticamente.
 * @param {Function} options.onSuccess - Callback al obtener datos exitosamente.
 * @param {Function} options.onError - Callback al obtener un error.
 *
 * @returns {Object} { data, loading, error, refetch }
 *
 * @example
 * const { data: products, loading, error, refetch } = useApiQuery(
 *   () => getProducts(filters),
 *   [filters]
 * );
 */
export const useApiQuery = (fetchFn, deps = [], options = {}) => {
    const { enabled = true, onSuccess, onError } = options;

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(enabled);
    const [error, setError] = useState(null);
    const isMounted = useRef(true);

    const execute = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await fetchFn();
            if (isMounted.current) {
                setData(result);
                if (onSuccess) onSuccess(result);
            }
            return result;
        } catch (err) {
            if (isMounted.current) {
                setError(err);
                if (onError) onError(err);
            }
            throw err;
        } finally {
            if (isMounted.current) {
                setLoading(false);
            }
        }
    }, [fetchFn, onSuccess, onError]);

    useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    useEffect(() => {
        if (!enabled) {
            setLoading(false);
            return;
        }
        execute();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, execute, ...deps]);

    const refetch = useCallback(() => {
        return execute();
    }, [execute]);

    return { data, loading, error, refetch };
};

export default useApiQuery;
