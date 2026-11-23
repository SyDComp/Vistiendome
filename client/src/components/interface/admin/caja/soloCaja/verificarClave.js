import { get, post } from '../../../../../lib/api/client.js';

/**
 * ¿Es la contraseña de la cuenta que abrió la caja? Se comprueba con el mismo
 * ingreso de siempre (el servidor no cambia), y el token nuevo reemplaza al
 * anterior: salir del modo caja renueva la sesión.
 */
export const verificarClave = async (clave) => {
    const yo = await get('/api/v1/auth/me');
    const { access_token } = await post('/api/v1/auth/login', {
        identificador: yo.apodo || yo.email_corporativo,
        password: clave,
    });
    localStorage.setItem('admin_token', access_token);
};
