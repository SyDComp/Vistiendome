/**
 * ¿Está en oferta? Vale para una variante y para una línea del carrito, que
 * guarda los mismos campos: marcada como oferta y con un precio de antes
 * mayor al que rige.
 */
export const enOferta = (x) => !!x?.on_sale && Number(x.original_price) > Number(x.price);
