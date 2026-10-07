import { useCallback, useEffect, useRef, useState } from 'react';
import { obtenerHistoriaPedido } from '../lib/api/endpoints';

/**
 * La historia de un pedido, cargada del servidor.
 *
 * Se vuelve a pedir cada vez que `activo` pasa a verdadero: el panel lateral
 * no se desmonta al cerrarse, y sin esto, reabrir el mismo pedido mostraba la
 * historia de la vez anterior aunque en la lista se le hubiera cambiado el
 * estado entremedio.
 *
 * Si se abre otro pedido mientras la anterior todavía llega, la respuesta
 * vieja se descarta: si no, el panel podría mostrar la historia de un pedido
 * bajo el título de otro.
 */
export default function useHistoriaPedido(cotizacionId, activo = true) {
    const [eventos, setEventos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const vigente = useRef(0);

    const recargar = useCallback(async () => {
        if (!cotizacionId) return;
        const pedido = ++vigente.current;
        setCargando(true);
        setError(null);
        try {
            const datos = await obtenerHistoriaPedido(cotizacionId);
            if (pedido === vigente.current) setEventos(datos || []);
        } catch (err) {
            if (pedido === vigente.current) setError(err?.message || 'No se pudo cargar la historia.');
        } finally {
            if (pedido === vigente.current) setCargando(false);
        }
    }, [cotizacionId]);

    useEffect(() => { if (activo) recargar(); }, [recargar, activo]);

    return { eventos, cargando, error, recargar };
}
