/**
 * Los telefonos, guardados de una sola forma y mostrados de una sola forma.
 *
 * EL PROBLEMA
 * En la base conviven dos formatos: unos numeros con `+56` adelante y otros
 * sin el, porque cada formulario guardo lo que la persona escribio. La misma
 * columna de la misma tabla muestra `+56966205071` en una fila y `922222222`
 * en la de abajo, y ninguna de las dos se lee bien. Hay hasta uno de once
 * digitos, que no es un telefono chileno valido.
 *
 * COMO SE RESUELVE
 * Se separan las dos cosas que estaban mezcladas:
 *
 *   `normalizarTelefono`  lo que se GUARDA. Siempre igual: +56 y nueve digitos.
 *   `formatearTelefono`   lo que se MUESTRA. Agrupado para leerlo de un vistazo.
 *
 * Guardar y mostrar no son lo mismo, y por tratarlos como si lo fueran es que
 * hoy hay dos formatos en la base.
 */

/** Deja solo los digitos. */
const soloDigitos = (valor) => String(valor ?? '').replace(/\D/g, '');

/**
 * El numero nacional de nueve digitos, sin el prefijo del pais.
 *
 * Un movil chileno son nueve digitos y empieza con 9. Los fijos tambien son
 * nueve contando el codigo de area (2 para Santiago, 42 para Chillan...). Lo
 * que llegue con 56 adelante lo trae de mas.
 */
const nueveDigitos = (valor) => {
    let d = soloDigitos(valor);
    if (d.startsWith('56')) d = d.slice(2);
    // Un 0 inicial es de la epoca del discado nacional: 09 en vez de 9.
    if (d.length === 10 && d.startsWith('0')) d = d.slice(1);
    return d;
};

/**
 * Como se GUARDA: +56 y nueve digitos, sin espacios.
 *
 * Devuelve el texto original si no se puede reconocer, en vez de inventar un
 * numero: un telefono mal guardado es peor que uno raro, porque nadie se entera
 * hasta que hay que llamar a la clienta.
 *
 * @param {string} valor
 * @returns {string} `+56966205071`, o el original si no son nueve digitos
 */
export const normalizarTelefono = (valor) => {
    const d = nueveDigitos(valor);
    return d.length === 9 ? `+56${d}` : String(valor ?? '').trim();
};

/**
 * Como se MUESTRA: `(+56) 9 6620 5071`.
 *
 * @param {string} valor
 * @returns {string} vacio si no hay numero; el original si no se reconoce
 */
export const formatearTelefono = (valor) => {
    if (!valor) return '';
    const d = nueveDigitos(valor);
    if (d.length !== 9) return String(valor).trim();
    // 9 6620 5071: el primer digito aparte porque es lo que distingue un movil
    // de un fijo, y el resto de a cuatro, que es como se dicta por telefono.
    return `(+56) ${d[0]} ${d.slice(1, 5)} ${d.slice(5)}`;
};

/** ¿Se puede reconocer como telefono chileno? */
export const esTelefonoValido = (valor) => nueveDigitos(valor).length === 9;
