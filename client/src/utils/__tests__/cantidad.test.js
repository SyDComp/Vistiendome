import { describe, it, expect } from 'vitest';
import { cantidad } from '../cantidad';

describe('cantidad', () => {
    it('singular solo con uno', () => {
        expect(cantidad(1, 'unidad', 'unidades')).toBe('1 unidad');
        expect(cantidad(0, 'unidad', 'unidades')).toBe('0 unidades');
        expect(cantidad(3, 'pieza', 'piezas')).toBe('3 piezas');
    });
});
