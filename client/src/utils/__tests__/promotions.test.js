import { describe, it, expect } from 'vitest';
import { evaluarPromociones } from '../promotions';

// "lleva 2 paga 1" tal como esta configurada en produccion.
const dosPagaUno = { promos: [{ name: '2 paga 1', type: 'cantidad', lleva: 2, paga: 1, descuento: 100, productos: [] }] };

const linea = (cantidad, price = 19490) => ({ productId: 1, price, quantity: cantidad });

describe('evaluarPromociones · lleva X paga Y', () => {
    it('no aplica por debajo del minimo', () => {
        const { descuentos } = evaluarPromociones([linea(1)], dosPagaUno);
        expect(descuentos).toHaveLength(0);
    });

    it('al alcanzar el minimo descuenta una unidad', () => {
        const { descuentos } = evaluarPromociones([linea(2)], dosPagaUno);
        expect(descuentos[0].unidades).toBe(1);
        expect(descuentos[0].monto).toBe(19490);
    });

    // El caso que reporto QA: 4 prendas descontaban DOS ($38.980).
    it('con el doble de prendas NO descuenta el doble', () => {
        const { descuentos } = evaluarPromociones([linea(4)], dosPagaUno);
        expect(descuentos[0].unidades).toBe(1);
        expect(descuentos[0].monto).toBe(19490);
    });

    it('ni con muchas mas', () => {
        const { descuentos } = evaluarPromociones([linea(10)], dosPagaUno);
        expect(descuentos[0].unidades).toBe(1);
    });

    it('descuenta la mas barata del carrito', () => {
        const { descuentos } = evaluarPromociones([linea(1, 30000), linea(1, 12000)], dosPagaUno);
        expect(descuentos[0].monto).toBe(12000);
    });

    // "lleva 3 paga 2" beneficia una unidad; "lleva 3 paga 1", dos.
    it('respeta cuantas unidades beneficia la promocion', () => {
        const tresPagaUno = { promos: [{ name: '3x1', type: 'cantidad', lleva: 3, paga: 1, descuento: 100, productos: [] }] };
        const { descuentos } = evaluarPromociones([linea(6, 10000)], tresPagaUno);
        expect(descuentos[0].unidades).toBe(2);
        expect(descuentos[0].monto).toBe(20000);
    });
});
