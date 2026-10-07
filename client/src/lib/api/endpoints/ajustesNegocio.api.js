import { get, put } from '../client.js';

/** Ajustes del negocio: privados, solo con sesión del panel. */
export const obtenerAjustesNegocio = () => get('/api/v1/ajustes-negocio');

export const guardarAjusteNegocio = (clave, valor) => put(`/api/v1/ajustes-negocio/${clave}`, { valor });
