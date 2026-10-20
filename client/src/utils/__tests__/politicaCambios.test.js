import { describe, it, expect } from 'vitest';
import { frasesPolitica, sinCambio, textoPlazo } from '../politicaCambios';

const quince = { plazo: 15, unidad: 'dias', personalizadas_sin_cambio: true };

describe('política de cambios', () => {
    it('el plazo con su unidad, en singular cuando es uno', () => {
        expect(textoPlazo(quince)).toBe('15 días');
        expect(textoPlazo({ plazo: 1, unidad: 'meses' })).toBe('1 mes');
        expect(textoPlazo({ plazo: '2', unidad: 'semanas' })).toBe('2 semanas');
    });

    it('la regla de lo hecho a medida se dice solo si está activa', () => {
        expect(frasesPolitica(quince)).toHaveLength(2);
        expect(frasesPolitica({ ...quince, personalizadas_sin_cambio: false })).toHaveLength(1);
        expect(frasesPolitica({ ...quince, plazo: 0 })).toEqual(['Las compras no tienen cambio.']);
    });

    it('queda sin cambio lo que no es una variante del catálogo, si la regla está activa', () => {
        expect(sinCambio(quince, { sku_id: 7 })).toBe(false);
        expect(sinCambio(quince, { sku_id: null })).toBe(true);
        expect(sinCambio({ ...quince, personalizadas_sin_cambio: false }, { sku_id: null })).toBe(false);
        expect(sinCambio({ ...quince, plazo: 0 }, { sku_id: 7 })).toBe(true);
        expect(sinCambio(null, { sku_id: null })).toBe(false);
    });
});
