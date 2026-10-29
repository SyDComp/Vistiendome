import { describe, it, expect } from 'vitest';
import { opcionesDe } from '../opcionesArmador';

describe('opciones al armar una personalizada', () => {
    it('primero las de la prenda, después las demás del catálogo, sin repetir', () => {
        expect(opcionesDe({ deLaPrenda: ['Larga'], delCatalogo: ['Corta', 'larga', '3/4'] }))
            .toEqual({ propias: ['Larga'], otras: ['Corta', '3/4'] });
    });

    it('lo elegido siempre está, aunque no venga de ninguna lista', () => {
        expect(opcionesDe({ deLaPrenda: ['Larga'], delCatalogo: [], elegido: 'Corta' }))
            .toEqual({ propias: ['Larga'], otras: ['Corta'] });
        expect(opcionesDe({ deLaPrenda: ['Larga'], elegido: 'Larga' }).otras).toEqual([]);
    });

    it('si la categoría no acepta personalizaciones, solo las de la prenda', () => {
        expect(opcionesDe({ deLaPrenda: ['Larga'], delCatalogo: ['Corta'], soloCatalogo: true }))
            .toEqual({ propias: ['Larga'], otras: [] });
    });
});
