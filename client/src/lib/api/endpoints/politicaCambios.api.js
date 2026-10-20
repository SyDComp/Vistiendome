import { get } from '../client.js';

/** La política de cambios de la tienda, pública (core/politica_cambios.py en el servidor). */
export const obtenerPoliticaCambios = () => get('/api/v1/politica-cambios');
