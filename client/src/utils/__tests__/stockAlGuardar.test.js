import { describe, it, expect } from 'vitest';
import { conStockEditado, paraGuardar, trasGuardar } from '../stockAlGuardar';
import { sumarVersiones } from '../conservarVariantes';

describe('stock al guardar un producto', () => {
    it('una variante que ya existe y nadie tocó no manda su stock', () => {
        expect(paraGuardar({ id: 7, sku: 'A', stock: 10 }).stock).toBeNull();
    });

    it('si se editó, lo manda', () => {
        const v = conStockEditado({ id: 7, sku: 'A', stock: 10 }, 12);
        expect(paraGuardar(v)).toEqual({ id: 7, sku: 'A', stock: 12 });
    });

    it('poner el mismo número no cuenta como editar', () => {
        expect(conStockEditado({ id: 7, stock: 10 }, '10').stockEditado).toBe(false);
    });

    it('una nueva manda su stock inicial, y después de guardar ya no', () => {
        const nueva = { sku: 'B', stock: 3 };
        expect(paraGuardar(nueva).stock).toBe(3);
        const [guardada] = trasGuardar([nueva]);
        expect(paraGuardar(guardada).stock).toBeNull();
    });

    it('lo editado y luego guardado no se vuelve a mandar', () => {
        const [v] = trasGuardar([conStockEditado({ id: 7, stock: 10 }, 12)]);
        expect(paraGuardar(v).stock).toBeNull();
    });
});

describe('sumarVersiones', () => {
    it('una versión que ya existe no se pisa (ni su stock ni su id)', () => {
        const existentes = [{ id: 1, sku: 'A', stock: 9, price: 100 }];
        const { variantes, yaExistian } = sumarVersiones(existentes, [{ sku: 'A', stock: 0, price: 120 }, { sku: 'B', stock: 0, price: 120 }]);
        expect(yaExistian).toBe(1);
        expect(variantes).toEqual([{ id: 1, sku: 'A', stock: 9, price: 100 }, { sku: 'B', stock: 0, price: 120 }]);
    });
});
