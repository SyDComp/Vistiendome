import { useCallback, useEffect, useState } from 'react';
import { obtenerAjustesNegocio, guardarAjusteNegocio } from '../lib/api/endpoints';

/** Los ajustes del negocio: leerlos y guardar uno. */
export default function useAjustesNegocio() {
    const [ajustes, setAjustes] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);

    const recargar = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            setAjustes(await obtenerAjustesNegocio());
        } catch (err) {
            setError(err?.message || 'No se pudieron cargar los ajustes.');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { recargar(); }, [recargar]);

    /** Guarda y devuelve el valor tal como quedó (el servidor lo limpia). Lanza si no sirve. */
    const guardar = useCallback(async (clave, valor) => {
        const { valor: guardado } = await guardarAjusteNegocio(clave, valor);
        setAjustes(prev => ({ ...prev, [clave]: guardado }));
        return guardado;
    }, []);

    return { ajustes, cargando, error, recargar, guardar };
}
