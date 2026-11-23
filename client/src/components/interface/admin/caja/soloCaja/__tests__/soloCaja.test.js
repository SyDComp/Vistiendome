import { afterEach, describe, expect, it } from 'vitest';
import { activar, desactivar, estaActivo, rutaPermitida, salidaHacia, suscribir, RUTA_SALIR } from '../soloCaja';

describe('modo solo caja', () => {
    afterEach(() => desactivar());

    it('queda activo en el navegador hasta que se quita', () => {
        expect(estaActivo()).toBe(false);
        activar();
        expect(estaActivo()).toBe(true);
        desactivar();
        expect(estaActivo()).toBe(false);
    });

    it('avisa al activar y al quitar, para que la pantalla cambie sin recargar', () => {
        let avisos = 0;
        const soltar = suscribir(() => { avisos += 1; });
        activar();
        desactivar();
        soltar();
        activar();
        expect(avisos).toBe(2);
    });

    it('deja la caja, su salida, el ingreso y el sitio; el panel no', () => {
        expect(rutaPermitida('/admin/caja')).toBe(true);
        expect(rutaPermitida(RUTA_SALIR)).toBe(true);
        expect(rutaPermitida('/admin/login')).toBe(true);
        expect(rutaPermitida('/catalogo')).toBe(true);
        expect(rutaPermitida('/admin/dashboard')).toBe(false);
        expect(rutaPermitida('/admin/dashboard/crm/cotizaciones')).toBe(false);
        expect(rutaPermitida('/admin/cajas')).toBe(false);
        expect(rutaPermitida('/admin/print/pedido/3')).toBe(false);
    });

    it('la salida recuerda a dónde se quería ir', () => {
        expect(salidaHacia('/admin/dashboard/crm')).toBe(`${RUTA_SALIR}?volver=%2Fadmin%2Fdashboard%2Fcrm`);
        expect(salidaHacia('/admin/caja')).toBe(RUTA_SALIR);
    });
});
