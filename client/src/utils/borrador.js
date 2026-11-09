/**
 * El borrador de un formulario del sitio (Contacto, el carrito): lo escrito
 * sobrevive si se recarga la página, y nada más.
 *
 * Vive en sessionStorage: se va al cerrar la pestaña. Antes estaba en
 * localStorage, que no vence nunca: una consulta escrita y no enviada hace
 * semanas volvía a aparecer en la próxima (reportado por QA 2026-11-09). Lo
 * que quedó guardado así se borra la primera vez que se lee.
 *
 * Sin almacenamiento (modo privado, bloqueado) se sigue igual: no hay borrador.
 */

const almacen = () => {
    try { return window.sessionStorage; } catch { return null; }
};

export const leerBorrador = (clave) => {
    try { window.localStorage.removeItem(clave); } catch { /* nada que limpiar */ }
    try {
        const guardado = almacen()?.getItem(clave);
        return guardado ? JSON.parse(guardado) : null;
    } catch {
        return null;
    }
};

export const guardarBorrador = (clave, datos) => {
    try { almacen()?.setItem(clave, JSON.stringify(datos)); } catch { /* sin almacenamiento */ }
};

export const olvidarBorrador = (clave) => {
    try { almacen()?.removeItem(clave); } catch { /* nada que borrar */ }
};
