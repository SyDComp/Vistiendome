import { useEffect, useState } from 'react';
import { obtenerAjustesNegocio } from '../lib/api/endpoints';

/**
 * Las opciones de "¿Cómo llegó?", tal como están en Ajustes del negocio.
 * Se leen cada vez que se monta quien las usa: si se editaron en otra
 * pestaña, el formulario siguiente ya trae la lista nueva.
 */
export default function useCanalesPedido() {
    const [canales, setCanales] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let vigente = true;
        obtenerAjustesNegocio()
            .then(ajustes => { if (vigente) setCanales(ajustes?.canales_pedido || []); })
            .catch(err => { if (vigente) setError(err?.message || 'No se pudieron cargar las opciones.'); })
            .finally(() => { if (vigente) setCargando(false); });
        return () => { vigente = false; };
    }, []);

    return { canales, cargando, error };
}
