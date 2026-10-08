import { useEffect, useState } from 'react';
import { get } from '../lib/api/client.js';

/** Las formas de abastecerse que se pueden elegir hoy, tal como las define el servidor. */
export default function useOpcionesAbastecimiento() {
    const [opciones, setOpciones] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        let vigente = true;
        get('/api/v1/admin/catalog/categories/opciones-abastecimiento')
            .then(datos => { if (vigente) setOpciones(datos || []); })
            .catch(err => { if (vigente) setError(err?.message || 'No se pudieron cargar las opciones.'); });
        return () => { vigente = false; };
    }, []);

    return { opciones, error };
}
