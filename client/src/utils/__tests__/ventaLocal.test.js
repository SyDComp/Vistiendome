import { describe, it, expect } from 'vitest';
import { lineaDesde, paraServidor, restante, sePuedeVender, totalVenta } from '../ventaLocal';

const cinturon = lineaDesde({ sku_id: 7, nombre: 'Cinturón', codigo: 'CIN-M', disponible: 3, precio: 9000 });

describe('venta en el local', () => {
    it('una línea parte con el precio del catálogo y cantidad 1', () => {
        expect(cinturon).toMatchObject({ clave: 'v-7', cantidad: 1, precio: '9000', disponible: 3 });
    });

    it('el total y lo que falta o sobra en los pagos', () => {
        const lineas = [{ ...cinturon, cantidad: 2 }];
        expect(totalVenta(lineas)).toBe(18000);
        expect(restante(lineas, [{ monto: '10.000' }])).toBe(8000);
        expect(restante(lineas, [{ monto: '10.000' }, { monto: '9000' }])).toBe(-1000);
    });

    it('se vende solo si los pagos suman justo el total y no se pide más de lo que hay', () => {
        expect(sePuedeVender([cinturon], [{ monto: '9000', medio: 'Efectivo' }])).toBe(true);
        expect(sePuedeVender([cinturon], [{ monto: '5000', medio: 'Efectivo' }])).toBe(false);
        expect(sePuedeVender([{ ...cinturon, cantidad: 4 }], [{ monto: '36000', medio: 'Efectivo' }])).toBe(false);
        expect(sePuedeVender([{ ...cinturon, precio: '' }], [])).toBe(false);
    });

    it('lo que va al servidor: montos como enteros, sin pagos vacíos', () => {
        const venta = paraServidor({ clienta: null, lineas: [cinturon], pagos: [{ monto: '9.000', medio: 'Débito' }, { monto: '', medio: 'Efectivo' }] });
        expect(venta).toEqual({
            clienta: null,
            prendas: [{ sku_id: 7, pieza_id: null, cantidad: 1, precio: 9000 }],
            pagos: [{ monto: 9000, medio: 'Débito', nota: null }],
        });
    });
});
