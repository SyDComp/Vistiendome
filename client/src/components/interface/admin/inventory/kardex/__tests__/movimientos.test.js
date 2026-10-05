import { describe, it, expect } from 'vitest';
import { conSaldo, nombreDelMovimiento, cantidadValida, stockResultante } from '../movimientos';

describe('movimientos de bodega', () => {
    it('el saldo despues de cada movimiento se reconstruye desde el de hoy', () => {
        const historial = [
            { id: 3, type: 'adjustment', quantity: -2 },
            { id: 2, type: 'sale', quantity: -1 },
            { id: 1, type: 'receipt', quantity: 10 },
        ];
        expect(conSaldo(historial, 7).map(m => m.saldo)).toEqual([7, 9, 10]);
    });

    it('un ajuste dice si sumo o resto', () => {
        expect(nombreDelMovimiento({ type: 'adjustment', quantity: -3 })).toBe('Merma / Salida');
        expect(nombreDelMovimiento({ type: 'adjustment', quantity: 3 })).toBe('Ajuste');
        expect(nombreDelMovimiento({ type: 'receipt', quantity: 3 })).toBe('Ingreso');
    });

    it('la cantidad tiene que ser un entero mayor que cero', () => {
        expect(cantidadValida('20')).toBe(20);
        expect(cantidadValida('')).toBeNull();
        expect(cantidadValida('0')).toBeNull();
        expect(cantidadValida('-4')).toBeNull();
        expect(cantidadValida('2.5')).toBeNull();
    });

    it('ingreso suma y merma resta', () => {
        expect(stockResultante(10, 'ingreso', 20)).toBe(30);
        expect(stockResultante(10, 'salida', 20)).toBe(-10);
    });
});
