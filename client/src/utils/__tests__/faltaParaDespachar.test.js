import { describe, it, expect } from 'vitest';
import { faltaParaDespachar } from '../entrega';

describe('lo que le falta a un despacho', () => {
    it('un retiro no necesita nada', () => {
        expect(faltaParaDespachar({ modo_entrega: 'RETIRO' })).toEqual([]);
    });

    it('a domicilio: región, comuna y dirección', () => {
        expect(faltaParaDespachar({ modo_entrega: 'DESPACHO', tipo_despacho: 'DOMICILIO', direccion: '  ' }))
            .toEqual(['región', 'comuna', 'dirección']);
        expect(faltaParaDespachar({ modo_entrega: 'DESPACHO', tipo_despacho: 'DOMICILIO',
            region: 'Maule', comuna: 'Curicó', direccion: 'Calle 1' })).toEqual([]);
    });

    it('a sucursal, lo que falta es el nombre de la sucursal', () => {
        expect(faltaParaDespachar({ modo_entrega: 'DESPACHO', tipo_despacho: 'SUCURSAL', region: 'Maule', comuna: 'Curicó' }))
            .toEqual(['sucursal']);
    });
});
