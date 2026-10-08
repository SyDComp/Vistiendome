/**
 * Cómo se dicen los ajustes de una categoría y qué pasa al borrarla.
 *
 * El servidor manda lo que vale en efecto y de quién se hereda (ver
 * core/categorias); acá se arma la frase, en un solo lugar para que la tabla,
 * el detalle y el aviso de borrado digan lo mismo.
 */

const deQuien = (de) => (de ? ` (igual que ${de})` : '');

/** "Se confecciona en el taller (igual que Vestimenta)" */
export const textoAbastecimiento = (c = {}) =>
    `${c.abastecimiento_texto || 'Se decide al confirmar'}${deQuien(c.abastecimiento_heredado_de)}`;

/** "Sí (igual que Vestimenta)" / "No" */
export const textoPersonalizacion = (c = {}) =>
    `${c.acepta_personalizacion_efectiva ? 'Sí' : 'No'}${deQuien(c.acepta_heredado_de)}`;

/** El aviso antes de borrar, a partir del plan que calcula el servidor. */
export const mensajeBorrado = (plan) => {
    const partes = [`¿Eliminar la categoría "${plan.categoria}"?`];
    if (plan.subcategorias) {
        const n = plan.subcategorias === 1 ? 'Su subcategoría' : `Sus ${plan.subcategorias} subcategorías`;
        partes.push(plan.subcategorias_pasan_a
            ? `${n} ${plan.subcategorias === 1 ? 'pasa' : 'pasan'} a "${plan.subcategorias_pasan_a}".`
            : `${n} ${plan.subcategorias === 1 ? 'pasa a ser categoría principal' : 'pasan a ser categorías principales'}.`);
    }
    if (plan.productos) {
        const n = plan.productos === 1 ? 'Su producto pasa' : `Sus ${plan.productos} productos pasan`;
        partes.push(`${n} a "${plan.productos_pasan_a}".`);
        if (plan.abastecimiento_de_productos) {
            const { de, a } = plan.abastecimiento_de_productos;
            partes.push(`Ojo: cuando no haya en bodega, ${plan.productos === 1 ? 'ese producto' : 'esos productos'} dejarán de ser "${de}" y pasarán a "${a}".`);
        }
    }
    if (!plan.subcategorias && !plan.productos) partes.push('No tiene subcategorías ni productos.');
    return partes.join(' ');
};
