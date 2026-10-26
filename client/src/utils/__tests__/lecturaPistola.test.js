import { describe, it, expect } from 'vitest';
import { crearDetector } from '../lecturaPistola';

const teclear = (detector, texto, desde, paso) =>
    [...texto, 'Enter'].map((t, i) => detector(t === 'Enter' ? 'Enter' : t, desde + i * paso));

describe('lectura de la pistola', () => {
    it('trece dígitos seguidos y Enter son una lectura; las tres primeras alcanzan a pasar', () => {
        const r = teclear(crearDetector(), '7800000000017', 1000, 5);
        expect(r.slice(0, 3).every(x => x.accion === 'pasar')).toBe(true);
        expect(r.slice(3, 13).every(x => x.accion === 'tragar')).toBe(true);
        expect(r[13]).toEqual({ accion: 'leido', codigo: '7800000000017', escapadas: 3 });
    });

    it('una persona tecleando no es una lectura', () => {
        const r = teclear(crearDetector(), 'vestido', 1000, 180);
        expect(r.every(x => x.accion === 'pasar')).toBe(true);
    });

    it('con prefijo se reconoce aunque llegue lento, y no escapa nada', () => {
        const d = crearDetector({ prefijo: '~' });
        expect(d('~', 0).accion).toBe('tragar');
        expect(d('1', 500).accion).toBe('tragar');
        expect(d('2', 900).accion).toBe('tragar');
        expect(d('Enter', 1200)).toEqual({ accion: 'leido', codigo: '12', escapadas: 0 });
    });

    it('dos o tres teclas rápidas de una persona no se pierden ni son una lectura', () => {
        const r = teclear(crearDetector(), 'abc', 0, 5);
        expect(r.every(x => x.accion === 'pasar')).toBe(true);
    });
});
