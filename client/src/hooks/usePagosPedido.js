import { useCallback, useEffect, useRef, useState } from 'react';
import { verPagos } from '../lib/api/endpoints';

/**
 * Las cuentas y los pagos de un pedido, pedidos de nuevo cada vez que `activo`
 * pasa a verdadero (el panel lateral no se desmonta) y al llamar a `recargar`.
 * `reemplazar` deja lo que devolvió el servidor al registrar o anular.
 */
export default function usePagosPedido(pedidoId, activo = true) {
    const [datos, setDatos] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const vigente = useRef(0);

    const recargar = useCallback(async () => {
        if (!pedidoId) return;
        const turno = ++vigente.current;
        setCargando(true);
        setError(null);
        try {
            const r = await verPagos(pedidoId);
            if (turno === vigente.current) setDatos(r);
        } catch (err) {
            if (turno === vigente.current) setError(err?.message || 'No se pudieron cargar los pagos.');
        } finally {
            if (turno === vigente.current) setCargando(false);
        }
    }, [pedidoId]);

    useEffect(() => { if (activo) recargar(); }, [recargar, activo]);

    const reemplazar = useCallback((r) => { vigente.current += 1; setDatos(r); setCargando(false); }, []);

    return { datos, cargando, error, recargar, reemplazar };
}
