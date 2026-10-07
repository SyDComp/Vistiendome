/**
 * Cómo se lee cada anotación de la historia de un pedido.
 *
 * El servidor guarda el tipo y los datos, no la frase: así la frase se puede
 * mejorar sin tocar lo guardado, y los datos sirven para otras cosas (el
 * informe de ventas). Acá se arma lo que lee la persona.
 */
import { etiquetaEstado } from './estadosPedido';
import { estiloEstado } from './estadosOrdenCorte';
import { textoPrecio } from './precioPrenda';

const ORIGENES = {
    CATALOGO: 'el catálogo del sitio',
    CONTACTO_INDIVIDUAL: 'el formulario de contacto',
    CONTACTO_GRUPAL: 'el formulario de pedidos grupales',
};

const prendas = (n) => (n === 1 ? '1 prenda' : `${n} prendas`);

/** "EN CONVERSACIÓN" → "En conversación": se lee dentro de una frase. */
const enFrase = (texto) => (texto ? texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase() : '');

const estadoPedido = (estado, modoEntrega) => enFrase(etiquetaEstado(estado, modoEntrega));
const estadoOrden = (estado) => estiloEstado(estado).label;

const MOTIVOS = {
    etiquetas: 'al imprimir las etiquetas de envío',
    deshacer_etiquetas: 'se deshizo el despacho hecho al imprimir etiquetas',
};

/**
 * @param {{tipo: string, datos: object}} evento
 * @param {string} [modoEntrega]  'RETIRO' o 'DESPACHO': cambia cómo se nombra DESPACHADA.
 * @returns {{texto: string, detalle: string|null}}
 */
export const describirEvento = ({ tipo, datos = {} }, modoEntrega) => {
    switch (tipo) {
        case 'CREADO':
            if (datos.origen !== 'MANUAL') {
                return { texto: `Llegó por ${ORIGENES[datos.origen] || 'el sitio web'}`, detalle: null };
            }
            return {
                texto: 'Creado en el panel',
                detalle: datos.canal ? `Llegó por ${datos.canal}` : null,
            };

        case 'ESTADO':
            return {
                texto: `${estadoPedido(datos.de, modoEntrega)} → ${estadoPedido(datos.a, modoEntrega)}`,
                detalle: MOTIVOS[datos.motivo] ? enFrase(MOTIVOS[datos.motivo]) : null,
            };

        case 'CANAL':
            return datos.de
                ? { texto: `Cómo llegó: ${datos.de} → ${datos.a}`, detalle: null }
                : { texto: `Se indicó cómo llegó: ${datos.a}`, detalle: null };

        case 'PRECIO':
            return {
                texto: `Precio de ${datos.prenda}: ${textoPrecio(datos.de)} → ${textoPrecio(datos.a)}`,
                detalle: null,
            };

        case 'ORDEN_AGREGADA':
            return { texto: `${prendas(datos.prendas)} entraron a la orden de corte N° ${datos.orden}`, detalle: null };

        case 'ORDEN_ESTADO':
            if (datos.a === 'FINALIZADA') {
                return {
                    texto: `Orden de corte N° ${datos.orden} finalizada`,
                    detalle: `${prendas(datos.prendas)} de este pedido ${datos.prendas === 1 ? 'quedó lista' : 'quedaron listas'}`,
                };
            }
            if (datos.de === 'FINALIZADA') {
                return { texto: `Se reabrió la orden de corte N° ${datos.orden}`, detalle: `Ahora: ${estadoOrden(datos.a)}` };
            }
            return { texto: `Orden de corte N° ${datos.orden}: ${estadoOrden(datos.de)} → ${estadoOrden(datos.a)}`, detalle: null };

        case 'ORDEN_ELIMINADA':
            return {
                texto: `Se borró la orden de corte N° ${datos.orden}`,
                detalle: `${prendas(datos.prendas)} de este pedido volvieron a esperar corte`,
            };

        case 'ELIMINADO':
            return { texto: 'Pedido eliminado', detalle: null };

        case 'REGISTRO_INICIADO': {
            const ordenes = (datos.ordenes || []).length
                ? ` · ${datos.ordenes.length === 1 ? 'orden' : 'órdenes'} de corte N° ${datos.ordenes.join(', ')}`
                : '';
            return {
                texto: `Inicio del registro de historia. Estado en ese momento: ${estadoPedido(datos.estado, modoEntrega)}`,
                detalle: `${prendas(datos.piezas || 0)} del catálogo, ${datos.cortadas || 0} listas${ordenes}. Lo anterior no quedó anotado.`,
            };
        }

        default:
            return { texto: tipo, detalle: null };
    }
};

/**
 * "¿Cómo llegó?" según la historia: lo que se dijo al crearlo, o la última
 * corrección. Se lee de ahí y no de una copia del pedido, que en pantalla
 * puede haber quedado vieja. Sin historia todavía, vale `respaldo`.
 */
export const canalSegunHistoria = (eventos, respaldo = null) => {
    let canal = respaldo;
    for (const { tipo, datos = {} } of eventos) {
        if (tipo === 'CREADO' && datos.canal) canal = datos.canal;
        if (tipo === 'CANAL') canal = datos.a;
    }
    return canal || null;
};

/** Quién lo hizo, o por qué no se sabe. Null cuando no corresponde decirlo. */
export const autorDe = ({ tipo, datos = {}, actor_nombre }) => {
    if (actor_nombre) return actor_nombre;
    if (tipo === 'CREADO' && datos.anterior_al_registro) return 'No quedó registrado quién';
    return null;
};
