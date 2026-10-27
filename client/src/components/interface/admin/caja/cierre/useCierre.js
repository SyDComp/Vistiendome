import { useCallback, useEffect, useState } from 'react';
import { cierreDeCaja } from '../../../../../lib/api/endpoints';
import { mensajeDeError } from '../../../../../utils/errorServidor';

/**
 * El cierre de caja de un día: `fecha` null es hoy (el servidor sabe qué día
 * es en Chile). Una respuesta vieja no pisa a una nueva.
 */
export default function useCierre(fecha) {
    const [estado, setEstado] = useState({ cierre: null, error: null, de: undefined });
    const [vuelta, setVuelta] = useState(0);
    const recargar = useCallback(() => setVuelta(n => n + 1), []);

    useEffect(() => {
        let vigente = true;
        cierreDeCaja(fecha)
            .then(c => { if (vigente) setEstado({ cierre: c, error: null, de: fecha }); })
            .catch(err => { if (vigente) setEstado({ cierre: null, error: mensajeDeError(err?.message, 'No se pudo cargar el cierre'), de: fecha }); });
        return () => { vigente = false; };
    }, [fecha, vuelta]);

    const listo = estado.de === fecha;
    return { cierre: listo ? estado.cierre : null, error: listo ? estado.error : null, cargando: !listo, recargar };
}
