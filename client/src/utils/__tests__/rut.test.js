import { describe, it, expect } from 'vitest';
import { validarRut, digitoVerificador } from '../rut';

describe('validarRut', () => {
    it('acepta RUTs válidos, escritos como sea', () => {
        // Mismo RUT con puntos, sin puntos y en minúscula: da igual.
        ['11.111.111-1', '111111111'].forEach(r =>
            expect(validarRut(r).valido, r).toBe(true));
    });

    it('calcula K y 0, que son los casos que se suelen olvidar', () => {
        expect(digitoVerificador('11111111')).toBe('1');
        // Calculados, no inventados: al inventar uno la prueba falló, que es
        // exactamente para lo que sirve.
        expect(digitoVerificador('10000013')).toBe('K');
        expect(digitoVerificador('10000004')).toBe('0');
        expect(validarRut('10.000.013-k').valido).toBe(true);   // minúscula también
        expect(validarRut('10.000.004-0').valido).toBe(true);
    });

    it('rechaza el dígito verificador equivocado', () => {
        expect(validarRut('11.111.111-2').valido).toBe(false);
    });

    it('rechaza el dígito de más — el caso que reventaba el servidor', () => {
        const r = validarRut('22.222.222.222-2');
        expect(r.valido).toBe(false);
        expect(r.motivo).toMatch(/8 o 9/);
    });

    it('rechaza el vacío y la basura', () => {
        expect(validarRut('').valido).toBe(false);
        expect(validarRut('no soy un rut').valido).toBe(false);
    });
});
