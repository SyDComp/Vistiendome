import { useCallback, useEffect, useRef, useState } from 'react';
import { propuestaConfirmacion } from '../lib/api/endpoints';

/**
 * La propuesta para confirmar un pedido, recalculada cada vez que la persona
 * cambia el camino de una prenda: lo que toma una deja de estar libre para
 * las demás, y eso lo sabe el servidor.
 *
 * `reemplazar` deja una propuesta que llegó por otro lado (la nueva que manda
 * el servidor cuando la bodega cambió mientras se decidía).
 */
export default function usePropuestaConfirmacion(pedidoId, caminos, activo = true) {
    const [propuesta, setPropuesta] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const vigente = useRef(0);

    const recargar = useCallback(async () => {
        if (!pedidoId) return;
        const turno = ++vigente.current;
        setCargando(true);
        setError(null);
        try {
            const datos = await propuestaConfirmacion(pedidoId, { caminos });
            if (turno === vigente.current) setPropuesta(datos);
        } catch (err) {
            if (turno === vigente.current) setError(err?.message || 'No se pudo calcular la propuesta.');
        } finally {
            if (turno === vigente.current) setCargando(false);
        }
    }, [pedidoId, caminos]);

    useEffect(() => { if (activo) recargar(); }, [recargar, activo]);

    const reemplazar = useCallback((nueva) => {
        vigente.current += 1;
        setPropuesta(nueva);
        setCargando(false);
    }, []);

    return { propuesta, cargando, error, recargar, reemplazar };
}
