/**
 * Validación de RUT chileno.
 *
 * Por qué el dígito verificador y no un largo máximo: un RUT con un dígito de
 * más no es un intento de engañar a nadie, es un dedo que se resbaló. Contar
 * caracteres detecta ese caso y ninguno más; el módulo 11 detecta además el
 * dígito cambiado y el par transpuesto, que son los errores de tipeo más
 * comunes. Y no hay que interpretar la intención de nadie: o el número cuadra
 * consigo mismo, o no.
 *
 * Lo que NO hace: decir si el RUT existe o es de quien dice ser. Eso sólo lo
 * sabe el Registro Civil. Acá alcanza con no dejar pasar un número imposible.
 */

/** Sólo dígitos y K, en mayúscula. */
export const limpiarRut = (rut) => String(rut || '').replace(/[^0-9kK]/g, '').toUpperCase();

/**
 * El dígito verificador que le corresponde a un cuerpo numérico.
 * Módulo 11 con la serie 2,3,4,5,6,7 repetida de derecha a izquierda.
 */
export const digitoVerificador = (cuerpo) => {
    let suma = 0;
    let factor = 2;
    for (let i = String(cuerpo).length - 1; i >= 0; i--) {
        suma += Number(String(cuerpo)[i]) * factor;
        factor = factor === 7 ? 2 : factor + 1;
    }
    const resto = 11 - (suma % 11);
    if (resto === 11) return '0';
    if (resto === 10) return 'K';
    return String(resto);
};

/**
 * @returns {{valido: boolean, motivo?: string}} El motivo va redactado para
 *          que lo lea la clienta, no para el registro de errores.
 */
export const validarRut = (rut) => {
    const limpio = limpiarRut(rut);
    if (!limpio) return { valido: false, motivo: 'El RUT es obligatorio' };

    // 7 dígitos + verificador es el RUT válido más corto en circulación;
    // 8 + verificador, el más largo. Fuera de ahí no hace falta calcular nada.
    if (limpio.length < 8 || limpio.length > 9) {
        return { valido: false, motivo: 'El RUT debe tener 8 o 9 caracteres, incluyendo el dígito verificador' };
    }

    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);
    if (!/^\d+$/.test(cuerpo)) return { valido: false, motivo: 'El RUT sólo puede tener números y, al final, un dígito verificador' };

    if (digitoVerificador(cuerpo) !== dv) {
        return { valido: false, motivo: 'Revisa el RUT: el dígito verificador no corresponde' };
    }
    return { valido: true };
};
