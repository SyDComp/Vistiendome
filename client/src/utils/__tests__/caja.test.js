import { describe, it, expect } from 'vitest';
import { agregarALaVenta, buscarDisponible } from '../caja';

const cinturon = { tipo: 'variante', sku_id: 7, nombre: 'Cinturón', codigo: 'CIN-M', barcode: '780001', config: { TALLA: 'M' }, disponible: 2, precio: 9000 };

describe('caja', () => {
    it('escanear algo nuevo lo agrega; escanearlo de nuevo suma uno', () => {
        let { lineas } = agregarALaVenta([], cinturon);
        expect(lineas).toHaveLength(1);
        ({ lineas } = agregarALaVenta(lineas, cinturon));
        expect(lineas).toHaveLength(1);
        expect(lineas[0].cantidad).toBe(2);
    });

    it('no se suma más de lo que hay libre, y se dice', () => {
        const dos = agregarALaVenta(agregarALaVenta([], cinturon).lineas, cinturon).lineas;
        const { lineas, aviso } = agregarALaVenta(dos, cinturon);
        expect(lineas).toBe(dos);
        expect(aviso).toMatch(/No quedan más libres de Cinturón/);
    });

    it('se busca por nombre, talla o código de barras', () => {
        expect(buscarDisponible([cinturon], 'cint m')).toHaveLength(1);
        expect(buscarDisponible([cinturon], '780001')).toHaveLength(1);
        expect(buscarDisponible([cinturon], 'vestido')).toHaveLength(0);
        expect(buscarDisponible([cinturon], '  ')).toHaveLength(0);
    });
});
