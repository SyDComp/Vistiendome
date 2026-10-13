import { describe, it, expect } from 'vitest';
import { textoDisponible, textoApartado } from '../apartado';

describe('textoDisponible', () => {
    it('negativo dice cuántas faltan', () => {
        expect(textoDisponible(-2)).toEqual({ texto: 'Faltan 2', tono: 'empty' });
    });

    it('cero, poco y bastante', () => {
        expect(textoDisponible(0).tono).toBe('empty');
        expect(textoDisponible(3).tono).toBe('low');
        expect(textoDisponible(8)).toEqual({ texto: '8', tono: 'good' });
    });
});

describe('textoApartado', () => {
    it('distingue la que espera', () => {
        expect(textoApartado('ESPERANDO')).toBe('Esperando que llegue');
        expect(textoApartado('APARTADA')).toBe('Apartada');
    });
});
