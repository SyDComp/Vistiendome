import { describe, it, expect } from 'vitest';
import { agrupar } from '../prendas';

const pieza = (cliente, pedido, talla, extra = {}) => ({
    cliente,
    pedido_numero: pedido,
    cotizacion_id: pedido != null ? `cot-${pedido}` : null,
    cantidad: 1,
    sku_name: 'Vestido Noemi',
    config: { TALLA: talla },
    ...extra,
});

describe('agrupar por pedido', () => {
    it('una clienta con dos pedidos sale en dos grupos, cada prenda bajo el suyo', () => {
        const grupos = agrupar([
            pieza('Allan', 27, 'M'),
            pieza('Allan', 31, 'L'),
        ], { por: 'pedido' });
        expect(grupos.map(g => [g.titulo, g.pedido, g.filas.map(f => f.config.TALLA)])).toEqual([
            ['Allan', 27, ['M']],
            ['Allan', 31, ['L']],
        ]);
    });

    it('dos clientas con el mismo nombre no se mezclan', () => {
        const grupos = agrupar([pieza('María', 10, 'S'), pieza('María', 11, 'M')], { por: 'pedido' });
        expect(grupos).toHaveLength(2);
    });

    it('las piezas del mismo pedido van juntas y suman sus unidades', () => {
        const [grupo] = agrupar([pieza('Camila', 30, '2xl'), pieza('Camila', 30, '6xl', { cantidad: 6 })], { por: 'pedido' });
        expect(grupo.unidades).toBe(7);
        expect(grupo.conColumnaProducto).toBe(true);
    });

    it('lo cortado para stock va aparte y sin pedido', () => {
        const [grupo] = agrupar([pieza(null, null, 'M', { para_stock: true })], { por: 'pedido' });
        expect(grupo.titulo).toBe('Para stock');
        expect(grupo.pedido).toBeNull();
    });
});

describe('agrupar por modelo', () => {
    it('junta todas las tallas de un modelo sin importar el pedido', () => {
        const grupos = agrupar([pieza('Allan', 27, 'M'), pieza('Camila', 30, 'L')], { por: 'producto' });
        expect(grupos).toHaveLength(1);
        expect(grupos[0].pedido).toBeNull();
        expect(grupos[0].conColumnaProducto).toBe(false);
    });
});
