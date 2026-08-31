import { useState, useEffect } from 'react';
import { getAdminAttributes } from '../lib/api/endpoints';

/**
 * Qué características eligió la clienta que salgan en la orden de corte.
 *
 * Devuelve un `Set` con sus nombres, o `null` mientras no se sabe. `null` NO
 * significa "ninguna": significa "todavía no llegó la respuesta", y quien lo
 * use debe mostrar todas hasta entonces. Si se tratara como lista vacía, la
 * hoja aparecería sin columnas por un instante en cada carga.
 *
 * Se pide una vez por sesión: son siete características que casi nunca cambian.
 */
let enMemoria = null;

export const useCaracteristicasCorte = () => {
    const [permitidas, setPermitidas] = useState(enMemoria);

    useEffect(() => {
        if (enMemoria) return;
        let vigente = true;
        getAdminAttributes()
            .then(lista => {
                const set = new Set(
                    (lista || [])
                        .filter(c => c.en_orden_corte !== false)
                        .map(c => String(c.name || '').toUpperCase())
                );
                enMemoria = set;
                if (vigente) setPermitidas(set);
            })
            // Si no se puede saber, se muestran todas: una hoja de más es
            // molesta; una hoja a la que le falta la talla manda a cortar mal.
            .catch(() => { if (vigente) setPermitidas(null); });
        return () => { vigente = false; };
    }, []);

    return permitidas;
};

export default useCaracteristicasCorte;
