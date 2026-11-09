import { describe, it, expect } from 'vitest';
import { codigoDe } from '../codigoVariante';

// Los mismos casos que server/tests/test_codigos_variante.py: la vista previa
// tiene que dar lo mismo que el servidor al guardar.
describe('vista previa del código de variante', () => {
    it('la dirección tal cual y los valores por nombre de característica', () => {
        expect(codigoDe('pr-vestido_perla', { TALLA: '12', MANGAS: '3/4', Estampado: 'Floral Primavera' }))
            .toBe('PR-VESTIDO_PERLA-FLORAL_PRIMAVERA-34-12');
        expect(codigoDe('pr-vestido_perla', { MANGAS: '3/4', Estampado: 'Floral Primavera', TALLA: '12' }))
            .toBe('PR-VESTIDO_PERLA-FLORAL_PRIMAVERA-34-12');
        expect(codigoDe('pr-vestido_noemi', { COLOR: 'Uva' })).toBe('PR-VESTIDO_NOEMI-UVA');
        expect(codigoDe('pr-biblia', {})).toBe('PR-BIBLIA');
    });
});
