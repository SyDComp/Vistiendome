import { describe, it, expect } from 'vitest';
import { leerPesos, mostrarPesos, agregaComa } from '../pesos';

describe('pesos chilenos en las casillas de precio', () => {
    it('"52.990" vale cincuenta y dos mil novecientos noventa, no 52,99', () => {
        expect(leerPesos('52.990')).toBe(52990);
        expect(leerPesos('$ 1.250.000')).toBe(1250000);
        expect(leerPesos('42990')).toBe(42990);
    });

    it('una casilla vacía o sin dígitos queda vacía', () => {
        expect(leerPesos('')).toBe('');
        expect(leerPesos('$')).toBe('');
    });

    it('se muestra con puntos de miles', () => {
        expect(mostrarPesos(52990)).toBe('52.990');
        expect(mostrarPesos('')).toBe('');
        expect(mostrarPesos(null)).toBe('');
    });

    it('un precio que ya quedó con decimales se ve tal cual, sin redondearlo', () => {
        expect(mostrarPesos(52.99)).toBe('52,99');
    });

    // "52,99" se leería 5.299 sin avisar: escribir una coma no se acepta.
    it('escribir o pegar una coma no se acepta', () => {
        expect(agregaComa('52', '52,')).toBe(true);
        expect(agregaComa('', '52,99')).toBe(true);
        expect(agregaComa('52.990', '52.9901')).toBe(false);
    });

    it('un monto viejo que se ve con coma se puede corregir', () => {
        expect(agregaComa('52,99', '52,9')).toBe(false);
        expect(agregaComa('52,99', '52.990')).toBe(false);
    });
});
