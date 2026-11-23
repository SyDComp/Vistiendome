/**
 * El modo "solo caja": una cortina, no una cerradura. Marca este navegador para
 * que solo muestre la caja; para volver al panel se pide la contraseña de admin.
 * Es contra errores y curiosidad de quien vende, no contra alguien que sepa
 * sacar la sesión del navegador: eso necesita cuentas con permisos propios en
 * el servidor (decisión del usuario 2026-11-23).
 *
 * Se guarda en el navegador, igual que la sesión: sobrevive a cerrar la
 * ventana y a apagar el equipo, y no afecta a otros equipos.
 */
import { RUTA_CAJA } from '../rutaCaja';

const CLAVE = 'vistiendome_solo_caja';

// Quién quiere enterarse cuando la marca cambia (useSoloCaja). Activar o quitar
// en esta ventana avisa aquí; en otra ventana del mismo navegador, por 'storage'.
const oyentes = new Set();
const avisar = () => oyentes.forEach(o => o());

export const suscribir = (oyente) => {
    oyentes.add(oyente);
    const deOtraVentana = (e) => { if (e.key === CLAVE) oyente(); };
    window.addEventListener('storage', deOtraVentana);
    return () => { oyentes.delete(oyente); window.removeEventListener('storage', deOtraVentana); };
};
export const RUTA_SALIR = `${RUTA_CAJA}/salir`;

export const estaActivo = () => {
    try { return localStorage.getItem(CLAVE) === '1'; } catch { return false; }
};

export const activar = () => {
    try { localStorage.setItem(CLAVE, '1'); } catch { /* sin almacenamiento: no queda activo */ }
    avisar();
};

export const desactivar = () => {
    try { localStorage.removeItem(CLAVE); } catch { /* nada que quitar */ }
    avisar();
};

/** Con el modo activo, solo la caja y el ingreso (para cuando vence la sesión). */
export const rutaPermitida = (ruta) =>
    !ruta.startsWith('/admin') || ruta === RUTA_CAJA || ruta.startsWith(`${RUTA_CAJA}/`)
    || ruta.startsWith('/admin/login');

/** La pantalla que pide la contraseña, recordando a dónde se quería ir. */
export const salidaHacia = (ruta) =>
    ruta && ruta !== RUTA_CAJA ? `${RUTA_SALIR}?volver=${encodeURIComponent(ruta)}` : RUTA_SALIR;
