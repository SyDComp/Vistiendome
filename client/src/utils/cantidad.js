/**
 * Un número con su palabra en singular o plural: "1 unidad", "3 unidades".
 * El plural se escribe entero porque en castellano no siempre es agregar "s"
 * (unidad → unidades).
 */
export const cantidad = (n, singular, plural) => `${n} ${Number(n) === 1 ? singular : plural}`;
