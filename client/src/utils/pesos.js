/**
 * Montos en pesos chilenos, como se escriben en Chile: "52.990".
 *
 * Una casilla type="number" lee el punto como coma decimal: "52.990" quedaba
 * en 52,99 y la tienda mostraba "$52,99" (visto 2026-11-24). El peso no tiene
 * centavos, así que aquí cuentan solo los dígitos: puntos, comas, espacios y
 * el signo $ se ignoran. El servidor rechaza igual un monto con decimales
 * (server/app/core/pesos.py).
 */

/** Lo escrito → monto entero, o '' si no hay ningún dígito. */
export const leerPesos = (texto) => {
    const digitos = String(texto ?? '').replace(/\D/g, '');
    return digitos === '' ? '' : Number(digitos);
};

/**
 * Monto → "52.990" para mostrar en la casilla. Un monto que ya quedó guardado
 * con decimales se muestra tal cual ("52,99"), para que se note que está mal
 * y no se redondee en silencio.
 */
export const mostrarPesos = (monto) => {
    if (monto === '' || monto == null || Number.isNaN(Number(monto))) return '';
    const n = Number(monto);
    return n.toLocaleString('es-CL', { maximumFractionDigits: Number.isInteger(n) ? 0 : 2 });
};
