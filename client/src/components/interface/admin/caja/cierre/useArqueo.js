import { useCallback, useEffect, useState } from 'react';
import { arqueoDeCaja } from '../../../../../lib/api/endpoints';
import { mensajeDeError } from '../../../../../utils/errorServidor';

/**
 * El arqueo del cajón de un día (`fecha` null es hoy): fondo, debería haber,
 * contado y diferencia (server/app/core/caja/arqueo.py). Una respuesta vieja
 * no pisa a una nueva. `poner` deja la respuesta de un guardado sin volver a pedir.
 */
export default function useArqueo(fecha) {
    const [estado, setEstado] = useState({ arqueo: null, error: null, de: undefined });
    const [vuelta, setVuelta] = useState(0);
    const recargar = useCallback(() => setVuelta(n => n + 1), []);

    useEffect(() => {
        let vigente = true;
        arqueoDeCaja(fecha)
            .then(a => { if (vigente) setEstado({ arqueo: a, error: null, de: fecha }); })
            .catch(err => { if (vigente) setEstado({ arqueo: null, error: mensajeDeError(err?.message, 'No se pudo cargar el arqueo'), de: fecha }); });
        return () => { vigente = false; };
    }, [fecha, vuelta]);

    const poner = useCallback((a) => setEstado({ arqueo: a, error: null, de: fecha }), [fecha]);
    const listo = estado.de === fecha;
    return { arqueo: listo ? estado.arqueo : null, error: listo ? estado.error : null, recargar, poner };
}
