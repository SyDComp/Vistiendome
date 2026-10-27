import { describe, it, expect } from 'vitest';
import { fechaLarga, otroDia } from '../fechas';

describe('fechas del cierre', () => {
    it('el día anterior y el siguiente, cruzando meses y años', () => {
        expect(otroDia('2026-11-01', -1)).toBe('2026-10-31');
        expect(otroDia('2026-12-31', 1)).toBe('2027-01-01');
    });

    it('la fecha larga en español', () => {
        expect(fechaLarga('2026-10-26')).toBe('lunes 26-10-2026');
    });
});
