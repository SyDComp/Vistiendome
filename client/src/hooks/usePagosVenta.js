import { useCallback, useMemo, useState } from 'react';

const INICIAL = [{ medio: '', monto: '', auto: true }];

/**
 * Los pagos de una venta de la caja mientras se arma. El
 * primer monto sigue al total mientras sea el único pago y nadie lo haya
 * escrito a mano (`auto`); un pago sin medio elegido usa el primero de los
 * ajustes. Se calcula al leer, no se copia con un efecto.
 */
export default function usePagosVenta(total, medios) {
    const [escritos, setEscritos] = useState(INICIAL);

    const pagos = useMemo(() => escritos.map((p, i) => ({
        ...p,
        medio: p.medio || medios[0] || '',
        monto: i === 0 && p.auto && escritos.length === 1 ? (total ? String(total) : '') : p.monto,
    })), [escritos, total, medios]);

    const cambiarPagos = useCallback((nuevos) => setEscritos(nuevos.map((p, i) => ({
        ...p, auto: Boolean(p.auto) && pagos[i]?.monto === p.monto,
    }))), [pagos]);

    const reiniciar = useCallback(() => setEscritos(INICIAL), []);

    return { pagos, cambiarPagos, reiniciar };
}
