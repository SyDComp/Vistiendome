import { buildWhatsAppMessage } from '../../../../utils/cartUtils';
import { datosDeEntrega, despachoParaMensaje } from './entrega';

/**
 * De lo que se llenó en el formulario de contacto salen dos cosas: el mensaje
 * de WhatsApp y el pedido que queda en el panel. Las dos desde los mismos
 * datos, para que no digan cosas distintas.
 */

/** Una prenda armada, como la lee el mensaje: lo elegido y lo propuesto. */
const prendaParaMensaje = (prenda) => {
    const propuestos = Object.fromEntries(
        Object.entries(prenda.propuestos || {}).map(([clave, valor]) => [clave, `${valor} (a confirmar)`])
    );
    return {
        name: prenda.nombre,
        quantity: prenda.cantidad || 1,
        selections: { ...(prenda.config || {}), ...propuestos },
    };
};

const prendaParaPedido = (prenda) => ({
    sku_id: null,
    cantidad: prenda.cantidad || 1,
    precio_unitario_estimado: 0,
    nombre_custom: prenda.nombre,
    config_custom: prenda.config || null,
    config_propuesta: prenda.propuestos || null,
});

/**
 * @param {'individual'|'grupo'} tipo
 * @param {object} datos    lo llenado en el formulario
 * @param {Array}  prendas  las armadas con el armador
 * @returns {{mensaje: string, pedido: object}}
 */
export const armarSolicitud = ({ tipo, datos, prendas = [] }) => {
    const esGrupo = tipo === 'grupo';
    const nombre = datos.nombre.trim();

    const mensaje = buildWhatsAppMessage({
        tipo: esGrupo ? 'grupo' : 'consulta',
        cliente: { nombre, rut: datos.rut, email: datos.email, telefono: datos.whatsapp },
        despacho: despachoParaMensaje(datos),
        grupo: esGrupo ? { tipo: datos.tipoGrupo, cantidad: datos.cantidad, evento: datos.evento } : undefined,
        productos: prendas.map(prendaParaMensaje),
        mensaje: datos.mensaje,
    });

    const [nombres = '', ...apellidos] = nombre.split(/\s+/);
    const pedido = {
        rut: datos.rut,
        nombres,
        apellidos: apellidos.join(' '),
        email_personal: datos.email,
        telefono: datos.whatsapp,
        ...datosDeEntrega(datos),
        mensaje: datos.mensaje,
        origen: esGrupo ? 'CONTACTO_GRUPAL' : 'CONTACTO_INDIVIDUAL',
        items: prendas.map(prendaParaPedido),
        ...(esGrupo && {
            tipo_grupo: datos.tipoGrupo,
            cantidad_aprox: datos.cantidad ? parseInt(datos.cantidad, 10) : null,
            fecha_evento: datos.evento,
        }),
    };

    return { mensaje, pedido };
};
