import { useEffect, useState } from 'react';
import { variantesDeProducto } from '../../../../../lib/api/endpoints';

/** Las variantes libres del producto elegido en el selector; null mientras llegan. */
export default function useVariantesProducto(productoId) {
    const [variantes, setVariantes] = useState({ de: null, lista: null });

    useEffect(() => {
        if (!productoId) return undefined;
        let vigente = true;
        variantesDeProducto(productoId)
            .then(lista => { if (vigente) setVariantes({ de: productoId, lista: lista || [] }); })
            .catch(() => { if (vigente) setVariantes({ de: productoId, lista: [] }); });
        return () => { vigente = false; };
    }, [productoId]);

    return variantes.de === productoId ? variantes.lista : null;
}
