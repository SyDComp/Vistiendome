import { describe, it, expect } from 'vitest';
import { mensajeDeError } from '../errorServidor';

describe('mensajeDeError', () => {
    it('un texto se muestra tal cual', () => {
        expect(mensajeDeError('Falta indicar cómo llegó el pedido.')).toBe('Falta indicar cómo llegó el pedido.');
    });

    it('una lista de validación se lee como frase, sin "[object Object]"', () => {
        const detail = [
            { loc: ['body', 'skus', 0], msg: 'Value error, La variante NOE-M no tiene precio: toda variante del catálogo necesita un monto mayor que cero.' },
            { loc: ['body', 'skus', 1], msg: 'Value error, La variante NOE-L no tiene precio: toda variante del catálogo necesita un monto mayor que cero.' },
        ];
        expect(mensajeDeError(detail)).toBe(
            'La variante NOE-M no tiene precio: toda variante del catálogo necesita un monto mayor que cero. · '
            + 'La variante NOE-L no tiene precio: toda variante del catálogo necesita un monto mayor que cero.');
    });

    it('sin detalle, el mensaje por defecto', () => {
        expect(mensajeDeError(undefined, 'Error al guardar')).toBe('Error al guardar');
    });
});
