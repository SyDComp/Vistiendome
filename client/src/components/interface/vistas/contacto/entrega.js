/**
 * Cómo recibe la clienta lo que pide, en el formulario de contacto.
 *
 * Es el mismo modelo que el carrito y el servidor: el retiro en el local es su
 * propio modo de entrega, no un "método de envío" más. Antes vivía en la lista
 * de transportistas, y al elegirlo se mandaba un tipo de despacho que el
 * servidor no acepta: la solicitud no llegaba al panel.
 */

export const OPCIONES_ENTREGA = [
    { valor: 'RETIRO', etiqueta: 'Retiro en tienda' },
    { valor: 'DOMICILIO', etiqueta: 'Despacho a domicilio' },
    { valor: 'SUCURSAL', etiqueta: 'Retiro en sucursal de envío' },
];

export const ENTREGA_INICIAL = 'DOMICILIO';

export const esRetiro = (entrega) => entrega === 'RETIRO';

/** Lo que va en el pedido según cómo se entrega. Un retiro no lleva dirección. */
export const datosDeEntrega = (datos) => {
    if (esRetiro(datos.entrega)) {
        return { modo_entrega: 'RETIRO', tipo_despacho: null, transporte: null, region: null, comuna: null, comuna_id: null, direccion: null };
    }
    const aSucursal = datos.entrega === 'SUCURSAL';
    return {
        modo_entrega: 'DESPACHO',
        tipo_despacho: aSucursal ? 'SUCURSAL' : 'DOMICILIO',
        transporte: datos.transporte || null,
        region: datos.region || null,
        comuna: datos.comuna || null,
        comuna_id: datos.comuna_id || null,
        // A sucursal la dirección la pone el transportista, no la clienta.
        direccion: aSucursal ? null : (datos.direccion || null),
    };
};

/** La línea de despacho del mensaje de WhatsApp. */
export const despachoParaMensaje = (datos) => {
    if (esRetiro(datos.entrega)) return { transporte: 'RETIRO EN EL LOCAL' };
    const aSucursal = datos.entrega === 'SUCURSAL';
    return {
        transporte: aSucursal ? `${datos.transporte} (retiro en sucursal)` : datos.transporte,
        direccion: aSucursal ? null : datos.direccion,
        comuna: datos.comuna,
        region: datos.region,
    };
};
