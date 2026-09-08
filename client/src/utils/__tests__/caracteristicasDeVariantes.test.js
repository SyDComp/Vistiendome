import { describe, it, expect } from 'vitest';
import { caracteristicasDe } from '../caracteristicasDeVariantes';

describe('caracteristicasDe', () => {
    it('un producto nuevo no tiene ninguna', () => {
        expect(caracteristicasDe([])).toEqual([]);
        expect(caracteristicasDe()).toEqual([]);
    });

    // El caso real: el editor tiene que poder mostrar lo que el producto ya
    // tiene para que se le pueda agregar una caracteristica mas.
    it('reune los valores de todas las variantes, sin repetir', () => {
        const skus = [
            { config: { TALLA: 'XS', COLOR: 'Negro' } },
            { config: { TALLA: 'S', COLOR: 'Negro' } },
            { config: { TALLA: 'XS', COLOR: 'Blanco' } },
        ];
        expect(caracteristicasDe(skus)).toEqual([
            { name: 'TALLA', values: 'XS, S' },
            { name: 'COLOR', values: 'Negro, Blanco' },
        ]);
    });

    it('respeta el orden en que aparecen', () => {
        const skus = [{ config: { CUELLO: 'En V', TALLA: 'M' } }];
        expect(caracteristicasDe(skus).map(a => a.name)).toEqual(['CUELLO', 'TALLA']);
    });

    it('ignora valores vacios', () => {
        const skus = [{ config: { TALLA: 'M', COLOR: '' } }, { config: { TALLA: 'L', COLOR: null } }];
        const r = caracteristicasDe(skus);
        expect(r.find(a => a.name === 'TALLA').values).toBe('M, L');
        expect(r.find(a => a.name === 'COLOR').values).toBe('');
    });
});
