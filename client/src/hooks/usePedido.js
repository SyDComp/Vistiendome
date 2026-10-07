import { useCallback, useEffect, useRef, useState } from 'react';
import { obtenerPedido } from '../lib/api/endpoints';

/**
 * El pedido, pedido de nuevo al servidor cada vez que `activo` pasa a
 * verdadero (el panel lateral no se desmonta al cerrarse) y cuando se llama a
 * `recargar` (después de cotizar). La copia que trae la lista puede estar vieja.
 */
export default function usePedido(id, activo = true) {
    const [pedido, setPedido] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const vigente = useRef(0);

    const recargar = useCallback(async () => {
        if (!id) return;
        const turno = ++vigente.current;
        setCargando(true);
        setError(null);
        try {
            const datos = await obtenerPedido(id);
            if (turno === vigente.current) setPedido(datos);
        } catch (err) {
            if (turno === vigente.current) setError(err?.message || 'No se pudo cargar el pedido.');
        } finally {
            if (turno === vigente.current) setCargando(false);
        }
    }, [id]);

    useEffect(() => { if (activo) recargar(); }, [recargar, activo]);

    return { pedido, cargando, error, recargar };
}
