import { get, post } from '../client.js';

/** Venta rápida en el local (core/pedidos/venta_rapida.py en el servidor). */

const BASE = '/api/v1/crm/venta-local';

/** Lo que se puede vender ahora: variantes con disponible y piezas únicas disponibles. */
export const disponibleParaVenta = () => get(`${BASE}/disponible`);

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

/** Los productos con algo libre, con su foto y lo vendido en 30 días; lo más vendido primero. */
export const productosParaCaja = () => get(`${BASE}/productos`);
