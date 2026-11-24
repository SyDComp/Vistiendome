import { describe, it, expect } from 'vitest';
import { leerPesos, mostrarPesos } from '../pesos';

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
});
