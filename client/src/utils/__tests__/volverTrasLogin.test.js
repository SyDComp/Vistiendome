import { describe, it, expect } from 'vitest';
import { destinoTrasLogin, loginQueVuelve } from '../volverTrasLogin';

describe('volver tras iniciar sesión', () => {
    it('vuelve a la ruta del panel de donde venía', () => {
        expect(destinoTrasLogin(loginQueVuelve('/admin/caja').split('?')[1])).toBe('/admin/caja');
    });

    it('sin ruta, o con una que no es del panel, va al escritorio', () => {
        for (const search of ['', '?volver=https://otro.com', '?volver=//otro.com/admin/', '?volver=/catalogo',
            '?volver=/admin/login', '?volver=/admin/\\otro']) {
            expect(destinoTrasLogin(search)).toBe('/admin/dashboard');
        }
    });
});
