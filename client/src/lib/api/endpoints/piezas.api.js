import { get, post } from '../client.js';

/**
 * Bodega › Piezas únicas: prendas hechas que no son una variante del catálogo
 * (personalizadas de un pedido cancelado).
 */

const BASE = '/api/v1/admin/piezas-unicas';

/** Todas: disponibles primero, dadas de baja al final. */
export const listarPiezasUnicas = () => get(`${BASE}/`);

/**
 * La pieza entra como prenda de ese pedido (nuevo o en conversación), apartada.
 * @param {{cotizacion_id: string, precio?: number|null, sin_costo?: boolean}} destino
 */
export const asignarPiezaUnica = (piezaId, destino) => post(`${BASE}/${piezaId}/asignar`, destino);

/** Se regaló, se desarmó o se perdió. La nota es obligatoria. */
export const darDeBajaPiezaUnica = (piezaId, nota) => post(`${BASE}/${piezaId}/baja`, { nota });
