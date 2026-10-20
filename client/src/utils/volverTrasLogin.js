/**
 * A dónde se vuelve después de iniciar sesión. La caja se abre desde un acceso
 * directo: si la sesión venció, tras entrar se vuelve a la caja y no al
 * escritorio del panel.
 *
 * Solo rutas del panel: `?volver=` lo puede escribir cualquiera en un enlace,
 * y no puede mandar a otro sitio (`//otro.com`, `https://...`).
 */
export const PANEL = '/admin/dashboard';

export const loginQueVuelve = (ruta) => `/admin/login?volver=${encodeURIComponent(ruta)}`;

export const destinoTrasLogin = (search) => {
    const volver = new URLSearchParams(search).get('volver') || '';
    const valido = volver.startsWith('/admin/') && !volver.startsWith('//') && !volver.includes('\\')
        && !volver.startsWith('/admin/login');
    return valido ? volver : PANEL;
};
