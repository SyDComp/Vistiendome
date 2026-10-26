/**
 * Ir a la caja desde el panel, y volver. La caja entra subiendo desde abajo
 * cuando viene del panel (no cuando se abre desde el acceso directo del
 * escritorio), y al volver baja y deja ver la pantalla de donde se vino.
 */
export const RUTA_CAJA = '/admin/caja';
export const PANEL_POR_OMISION = '/admin/dashboard/crm/cotizaciones';

/** El `state` de la navegación: viene del panel, y a qué pantalla volver. */
export const desdeElPanel = (volverA) => ({ desdePanel: true, volverA });
