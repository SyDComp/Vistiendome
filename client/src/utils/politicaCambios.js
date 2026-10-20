/**
 * Cómo se dice la política de cambios: en la página "Cambios y Devoluciones"
 * y en el comprobante de la caja. Es un dato (Ajustes del negocio › Política
 * de cambios: plazo, unidad y si lo hecho a medida tiene cambio), así los dos
 * dicen siempre lo mismo. Ver core/politica_cambios.py en el servidor.
 */

export const UNIDADES = [
    { valor: 'dias', singular: 'día', plural: 'días' },
    { valor: 'semanas', singular: 'semana', plural: 'semanas' },
    { valor: 'meses', singular: 'mes', plural: 'meses' },
];

/** "15 días", "1 mes". */
export const textoPlazo = ({ plazo, unidad }) => {
    const u = UNIDADES.find(x => x.valor === unidad) || UNIDADES[0];
    return `${plazo} ${Number(plazo) === 1 ? u.singular : u.plural}`;
};

/** La frase del plazo. Con plazo 0, no hay cambios. */
export const frasePlazo = (politica) => (Number(politica.plazo) > 0
    ? `Tienes ${textoPlazo(politica)} desde que recibes tu compra para solicitar un cambio de talla o modelo.`
    : 'Las compras no tienen cambio.');

export const FRASE_HECHO_A_MEDIDA =
    'Las prendas confeccionadas a medida o con modificaciones personalizadas no admiten cambios ni devoluciones.';

/** Lo que dice la política, frase por frase. */
export const frasesPolitica = (politica) => [
    frasePlazo(politica),
    ...(politica.personalizadas_sin_cambio && Number(politica.plazo) > 0 ? [FRASE_HECHO_A_MEDIDA] : []),
];

/**
 * Una prenda hecha a medida: no es una variante del catálogo (personalizada,
 * escrita a mano o una pieza única, que se hizo para las medidas de otra
 * persona).
 */
export const esHechaAMedida = (item) => !item.sku_id;

/** Si esta prenda queda sin cambio por la política. */
export const sinCambio = (politica, item) =>
    Boolean(politica) && (Number(politica.plazo) === 0 || (politica.personalizadas_sin_cambio && esHechaAMedida(item)));
