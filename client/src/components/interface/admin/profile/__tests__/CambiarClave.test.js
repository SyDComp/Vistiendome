import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../../../lib/api/endpoints', () => ({ cambiarMiClave: vi.fn(), LARGO_MINIMO_CLAVE: 8 }));
vi.mock('../../../../../context/NotificationContext', () => ({ useNotification: () => ({ toast: {} }) }));

const { faltaParaCambiar } = await import('../CambiarClave');

describe('faltaParaCambiar', () => {
    it('pide la actual, el largo, que coincidan y que sea distinta', () => {
        expect(faltaParaCambiar({ actual: '', nueva: 'abcdefgh', repetida: 'abcdefgh' })).toMatch(/actual/);
        expect(faltaParaCambiar({ actual: 'x', nueva: 'corta', repetida: 'corta' })).toMatch(/8/);
        expect(faltaParaCambiar({ actual: 'x', nueva: 'abcdefgh', repetida: 'abcdefgi' })).toMatch(/coinciden/);
        expect(faltaParaCambiar({ actual: 'abcdefgh', nueva: 'abcdefgh', repetida: 'abcdefgh' })).toMatch(/distinta/);
        expect(faltaParaCambiar({ actual: 'x', nueva: 'abcdefgh', repetida: 'abcdefgh' })).toBeNull();
    });
});
