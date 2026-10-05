import { describe, it, expect } from 'vitest';
import { agrupar, describirPedidos } from '../prendas';

const pieza = (cliente, pedido_numero, extra = {}) => ({
    cliente, pedido_numero, cantidad: 1, sku_name: 'Vestido', config: { TALLA: 'M' }, ...extra,
});

describe('agrupar por clienta', () => {
    it('cada clienta trae los numeros de sus pedidos, sin repetir y en orden', () => {
        const grupos = agrupar([
            pieza('Camila Flores', 30),
            pieza('Allan', 31),
            pieza('Camila Flores', 27),
            pieza('Camila Flores', 30),
        ], { por: 'cliente' });
        const porTitulo = Object.fromEntries(grupos.map(g => [g.titulo, g.pedidos]));
        expect(porTitulo['Camila Flores']).toEqual([27, 30]);
        expect(porTitulo['Allan']).toEqual([31]);
    });

    it('lo cortado para stock no tiene pedido', () => {
        const [grupo] = agrupar([pieza(null, null, { para_stock: true })], { por: 'cliente' });
        expect(grupo.titulo).toBe('Para stock');
        expect(grupo.pedidos).toEqual([]);
    });
});

describe('describirPedidos', () => {
    it('uno, varios o ninguno', () => {
        expect(describirPedidos([30])).toBe('Pedido N° 30');
        expect(describirPedidos([27, 30])).toBe('Pedidos N° 27, 30');
        expect(describirPedidos([])).toBe('');
    });
});
