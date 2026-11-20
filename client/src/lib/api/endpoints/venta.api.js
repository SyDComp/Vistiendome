import { get, post, put } from '../client.js';
import { aParametros } from '../../../utils/filtrosCaja';

/**
 * Venta en el local, desde la caja (core/pedidos/venta_rapida.py y core/caja
 * en el servidor). El catálogo se filtra y pagina en el servidor: con cientos
 * de productos, la caja no descarga todo.
 */

const BASE = '/api/v1/crm/venta-local';

/**
 * La venta completa en un paso: queda entera o no queda nada. Devuelve el pedido.
 * @param {{clienta: object|null, prendas: object[], pagos: object[]}} venta  clienta null: sin datos.
 */
export const registrarVenta = (venta) => post(BASE, venta);

/**
 * Lo que leyó la pistola (el código de barras de la etiqueta) o el código de
 * la variante. Error 404: no existe; 409: existe pero no queda libre.
 */
export const buscarPorCodigo = (codigo) => get(`${BASE}/codigo/${encodeURIComponent(codigo)}`);

/** Lo libre que cumple los filtros (utils/filtrosCaja.js): {resultados, total}. */
export const buscarEnCaja = (filtros, cuantos = 8) => get(`${BASE}/buscar?${aParametros(filtros, { cuantos })}`);

/** Una página del selector: {productos, total, pagina, paginas, piezas, facetas}. */
export const catalogoCaja = (filtros, pagina = 1) => get(`${BASE}/catalogo?${aParametros(filtros, { pagina })}`);

/** Las variantes libres de un producto, para elegir característica por característica. */
export const variantesDeProducto = (productoId) => get(`${BASE}/productos/${productoId}/variantes`);

/** El arqueo del cajón de un día (hoy si no se dice): fondo, debería haber, contado, diferencia. */
export const arqueoDeCaja = (fecha) => get(`${BASE}/arqueo${fecha ? `?fecha=${encodeURIComponent(fecha)}` : ''}`);

/** Con cuánto partió el cajón ese día. Devuelve el arqueo. */
export const anotarFondo = (fecha, monto) => put(`${BASE}/arqueo/${fecha}/fondo`, { monto });

/** Lo contado al cerrar, lo que se deja para mañana y una nota. Devuelve el arqueo. */
export const cerrarArqueo = (fecha, { contado, deja, nota }) => put(`${BASE}/arqueo/${fecha}/cierre`, { contado, deja, nota });

/** El cierre de caja de un día ('2026-10-26'; hoy si no se dice), calculado del libro de pagos. */
export const cierreDeCaja = (fecha) => get(`${BASE}/cierre${fecha ? `?fecha=${encodeURIComponent(fecha)}` : ''}`);
