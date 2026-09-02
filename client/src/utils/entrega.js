/**
 * Cómo se describe la entrega de un pedido, en un solo lugar.
 *
 * POR QUÉ EXISTE ESTE ARCHIVO
 * La etiqueta impresa decía "DESPACHO • A DOMICILIO" y "TRANSPORTE: STARKEN"
 * para un pedido que era un retiro en el local. No era un dato mal guardado:
 * la etiqueta preguntaba por `tipo_despacho` —el campo viejo— y cuando venía
 * vacío caía a un valor por defecto de despacho. Tres campos inventados, todos
 * de cara a la clienta:
 *
 *     tipo_despacho === 'SUCURSAL' ? 'RETIRO SUCURSAL' : 'A DOMICILIO'
 *     coti.transporte || 'STARKEN'
 *     coti.direccion  || 'POR CONFIRMAR / SUCURSAL'
 *
 * La lista de esa misma pantalla SÍ sabía que era un retiro y lo decía. El
 * problema no fue el dato: fue que cada vista resolvía por su cuenta qué
 * mostrar, y con el tiempo dejaron de coincidir. Por eso esto vive acá y no
 * dentro de un componente: mientras haya un solo lugar que lo decida, no
 * pueden volver a divergir.
 *
 * LA REGLA QUE NO SE PUEDE ROMPER
 * El modo se lee de `modo_entrega`, que el pedido declara. NUNCA se deduce del
 * nombre del transporte: ese texto lo edita la clienta desde Ajustes y hoy ya
 * conviven "RETIRO EN LOCAL", "RETIRO EN TIENDA" y "RETIRO_LOCAL" — y peor,
 * un despacho a sucursal se guarda como "STARKEN (retiro en sucursal)", que
 * contiene la palabra "retiro" y ES un despacho. Cualquier regla que lea ese
 * nombre se equivoca.
 */

/**
 * @param {object} cotizacion
 * @returns {{
 *   esRetiro: boolean,
 *   titulo: string,
 *   transporte: string|null,
 *   etiquetaDestino: string,
 *   destino: string,
 *   muestraComuna: boolean
 * }}
 */
export const describirEntrega = (cotizacion = {}) => {
    const esRetiro = cotizacion.modo_entrega === 'RETIRO';

    // Un retiro no viaja: no tiene transportista, ni dirección, ni comuna de
    // destino. `transporte` va en null a propósito —rellenarlo es exactamente
    // lo que causó el problema— y quien lo pinte decide qué hacer con la
    // ausencia. Lo que la etiqueta de un retiro sí necesita es identificar la
    // bolsa hasta que la clienta pasa: nombre, teléfono, N° y código de barras.
    if (esRetiro) {
        return {
            esRetiro: true,
            titulo: 'RETIRO EN LOCAL',
            transporte: null,
            etiquetaDestino: 'ENTREGA',
            destino: 'LA CLIENTA RETIRA EN EL LOCAL',
            muestraComuna: false,
        };
    }

    // `modo_entrega` es nullable sólo por los pedidos anteriores a que el campo
    // existiera. Ésos eran despachos, así que caer acá es correcto.
    const aSucursal = cotizacion.tipo_despacho === 'SUCURSAL';

    return {
        esRetiro: false,
        titulo: aSucursal ? 'DESPACHO • RETIRO EN SUCURSAL' : 'DESPACHO • A DOMICILIO',
        transporte: cotizacion.transporte || null,
        etiquetaDestino: 'DIRECCIÓN',
        // Sin dirección se dice que falta, en vez de inventar una sucursal: un
        // despacho sin dirección es un pedido que no se puede enviar, y eso
        // tiene que verse en el papel en vez de disimularse.
        destino: cotizacion.direccion || (aSucursal ? 'SUCURSAL POR CONFIRMAR' : 'FALTA LA DIRECCIÓN'),
        muestraComuna: true,
    };
};
