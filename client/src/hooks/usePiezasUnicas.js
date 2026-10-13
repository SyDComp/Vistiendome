import { useCallback, useEffect, useRef, useState } from 'react';
import { listarPiezasUnicas } from '../lib/api/endpoints';

/** Las piezas únicas de la bodega, y `recargar` para después de asignar o dar de baja. */
export default function usePiezasUnicas() {
    const [piezas, setPiezas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const vigente = useRef(0);

    const recargar = useCallback(async () => {
        const turno = ++vigente.current;
        setCargando(true);
        setError(null);
        try {
            const datos = await listarPiezasUnicas();
            if (turno === vigente.current) setPiezas(datos || []);
        } catch (err) {
            if (turno === vigente.current) setError(err?.message || 'No se pudieron cargar las piezas únicas.');
        } finally {
            if (turno === vigente.current) setCargando(false);
        }
    }, []);

    useEffect(() => { recargar(); }, [recargar]);

    return { piezas, cargando, error, recargar };
}
