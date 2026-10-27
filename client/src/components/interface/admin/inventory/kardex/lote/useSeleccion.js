import { useCallback, useState } from 'react';

/**
 * Qué variantes están elegidas, por sku_id. Lo elegido se mantiene al cambiar
 * el filtro: se puede filtrar "talla 12", elegir, filtrar "talla 14" y sumar.
 */
const useSeleccion = () => {
    const [elegidas, setElegidas] = useState(() => new Set());

    const alternar = useCallback((id) => setElegidas(prev => {
        const nuevo = new Set(prev);
        nuevo.has(id) ? nuevo.delete(id) : nuevo.add(id);
        return nuevo;
    }), []);

    /** Si todas las dadas están elegidas, las quita; si no, las agrega. */
    const alternarTodas = useCallback((ids) => setElegidas(prev => {
        const nuevo = new Set(prev);
        const todas = ids.length > 0 && ids.every(id => prev.has(id));
        ids.forEach(id => (todas ? nuevo.delete(id) : nuevo.add(id)));
        return nuevo;
    }), []);

    const limpiar = useCallback(() => setElegidas(new Set()), []);

    return { elegidas, alternar, alternarTodas, limpiar };
};

export default useSeleccion;
