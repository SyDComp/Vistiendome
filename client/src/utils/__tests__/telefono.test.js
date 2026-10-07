import { describe, it, expect } from 'vitest';
import { digitosDeCelular } from '../telefono';

describe('digitosDeCelular', () => {
    it('lo que se escribe después del +569', () => {
        expect(digitosDeCelular('+5691')).toBe('1');
        expect(digitosDeCelular('+56912345678')).toBe('12345678');
    });

    it('el número completo escrito o pegado detrás del prefijo no se duplica', () => {
        expect(digitosDeCelular('+569+56912345678')).toBe('12345678');
        expect(digitosDeCelular('+569 +569 1234 5678')).toBe('12345678');
        expect(digitosDeCelular('+56956912345678')).toBe('12345678');
    });

    it('pegado sin el +56, o con el 9 adelante', () => {
        expect(digitosDeCelular('+569912345678')).toBe('12345678');
        expect(digitosDeCelular('912345678')).toBe('12345678');
    });

    it('un número que empieza con 569 después del prefijo es válido y se respeta', () => {
        expect(digitosDeCelular('+56956912345')).toBe('56912345');
    });

    it('nunca más de ocho dígitos', () => {
        expect(digitosDeCelular('+569123456789999')).toHaveLength(8);
    });
});
