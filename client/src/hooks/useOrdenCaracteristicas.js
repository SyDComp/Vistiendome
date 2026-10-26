import { useMemo } from 'react';
import useCaracteristicas from './useCaracteristicas';

const NINGUNO = [];

/**
 * Los nombres de las características en el orden de la tienda (Características
 * › flechas de orden). Mientras no llegan, una lista vacía: se ordena por nombre.
 */
export default function useOrdenCaracteristicas() {
    const caracteristicas = useCaracteristicas();
    return useMemo(
        () => (caracteristicas ? caracteristicas.map(c => String(c.name || '').toUpperCase()) : NINGUNO),
        [caracteristicas],
    );
}
