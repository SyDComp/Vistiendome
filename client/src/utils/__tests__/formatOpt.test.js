import { describe, expect, it } from 'vitest';
import { formatOpt } from '../formatters';

// La misma regla que el servidor (catalog_admin.normalize_opt).
describe('formatOpt', () => {
    it('deja en mayúscula las siglas y las palabras con números', () => {
        expect(formatOpt('5xl')).toBe('5XL');
        expect(formatOpt(' xs ')).toBe('XS');
        expect(formatOpt('talla 2xl')).toBe('Talla 2XL');
    });

    it('lo demás, Mayúscula Cada Palabra', () => {
        expect(formatOpt('AZUL marino')).toBe('Azul Marino');
        expect(formatOpt('bajo  rodilla')).toBe('Bajo Rodilla');
        expect(formatOpt('')).toBe('');
    });
});
