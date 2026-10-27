import { useEffect, useState } from 'react';
import { catalogoCaja } from '../../../../../lib/api/endpoints';

/**
 * Una página del selector, pedida al servidor con los filtros. Mientras llega
 * la siguiente se sigue viendo la anterior (no parpadea); una respuesta vieja
 * no pisa a una nueva.
 */
export default function useCatalogoCaja(filtros, pagina, version) {
    const [datos, setDatos] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        let vigente = true;
        catalogoCaja(filtros, pagina)
            .then(d => { if (vigente) { setDatos(d); setError(null); } })
            .catch(err => { if (vigente) setError(err?.message || 'No se pudo cargar el catálogo'); });
        return () => { vigente = false; };
    }, [filtros, pagina, version]);

    return { datos, error };
}
