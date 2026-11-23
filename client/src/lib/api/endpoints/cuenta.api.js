import { put } from '../client.js';

/**
 * La cuenta que entró al panel (core/clave.py en el servidor).
 */

/** Cambia la propia contraseña; el servidor pide la actual. */
export const cambiarMiClave = (actual, nueva) => put('/api/v1/auth/me/clave', { actual, nueva });

/** El mismo mínimo que el servidor (core/clave.py LARGO_MINIMO). */
export const LARGO_MINIMO_CLAVE = 8;
