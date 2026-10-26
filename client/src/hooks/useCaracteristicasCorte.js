import { useMemo } from 'react';
import useCaracteristicas from './useCaracteristicas';

/**
 * Qué características eligió la clienta que salgan en la orden de corte.
 *
 * Devuelve un `Set` con sus nombres, o `null` mientras no se sabe. `null` NO
 * significa "ninguna": significa "todavía no llegó la respuesta" (o no se pudo
 * saber), y quien lo use debe mostrar todas hasta entonces. Si se tratara como
 * lista vacía, la hoja aparecería sin columnas por un instante en cada carga;
 * y una hoja a la que le falta la talla manda a cortar mal.
 */
export const useCaracteristicasCorte = () => {
    const caracteristicas = useCaracteristicas();
    return useMemo(() => (caracteristicas
        ? new Set(caracteristicas.filter(c => c.en_orden_corte !== false).map(c => String(c.name || '').toUpperCase()))
        : null), [caracteristicas]);
};

export default useCaracteristicasCorte;
