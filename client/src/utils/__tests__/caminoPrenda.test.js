import { describe, it, expect } from 'vitest';
import { textoCamino, esperaBodega, textoQueda, esperandoVistas, pideNota, sePuedeConfirmar } from '../caminoPrenda';

describe('textoCamino', () => {
    it('dice si lo de bodega está apartado o esperando', () => {
        expect(textoCamino({ camino: 'BODEGA', en_bodega: 'APARTADA' })).toBe('Bodega · apartada');
        expect(textoCamino({ camino: 'BODEGA', en_bodega: 'ESPERANDO' })).toBe('Bodega · esperando que llegue');
    });

    it('lo del taller dice si ya está hecho', () => {
        expect(textoCamino({ camino: 'TALLER', cortado: false })).toBe('Taller');
        expect(textoCamino({ camino: 'TALLER', cortado: true })).toBe('Taller · hecha');
    });

    it('sin confirmar no dice nada', () => {
        expect(textoCamino({ camino: null })).toBeNull();
    });

    it('solo espera lo que va por bodega', () => {
        expect(esperaBodega({ camino: 'BODEGA', en_bodega: 'ESPERANDO' })).toBe(true);
        expect(esperaBodega({ camino: 'TALLER', en_bodega: null })).toBe(false);
    });
});

describe('la propuesta', () => {
    const apartada = { item_id: 'a', camino: 'BODEGA', queda: 'APARTADA', disponible: 3, requiere_nota: false };
    const esperando = { item_id: 'b', camino: 'BODEGA', queda: 'ESPERANDO', disponible: 0, requiere_nota: true };

    it('dice qué pasa con cada prenda', () => {
        expect(textoQueda(apartada)).toBe('Se aparta de bodega (libres: 3)');
        expect(textoQueda(esperando)).toBe('Queda esperando que llegue a bodega');
        expect(textoQueda({ camino: 'TALLER' })).toBe('Se confecciona en el taller');
        expect(textoQueda({ camino: null })).toBe('Elige de dónde sale');
        expect(textoQueda({ camino: 'BODEGA', queda: 'APARTADA', disponible: null, pieza_numero: 1 }))
            .toBe('Pieza única N° 1: ya está apartada para este pedido');
    });

    it('manda las que vio esperando', () => {
        expect(esperandoVistas([apartada, esperando])).toEqual(['b']);
    });

    it('contra lo habitual pide nota', () => {
        expect(pideNota([apartada])).toBe(false);
        expect(sePuedeConfirmar({ prendas: [apartada, esperando], problemas: [] }, '')).toBe(false);
        expect(sePuedeConfirmar({ prendas: [apartada, esperando], problemas: [] }, 'llega el jueves')).toBe(true);
    });

    it('no se confirma con problemas ni sin prendas', () => {
        expect(sePuedeConfirmar({ prendas: [apartada], problemas: ['Ponle precio a: X.'] }, '')).toBe(false);
        expect(sePuedeConfirmar({ prendas: [], problemas: [] }, '')).toBe(false);
    });
});
