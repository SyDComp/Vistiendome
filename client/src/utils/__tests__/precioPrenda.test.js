import { describe, it, expect } from 'vitest';
import { textoPrecio, textoSubtotal, textoTotal, estadoPrecio, valorDesde, esValido, paraServidor, precioDeValor } from '../precioPrenda';

// El espacio entre "$" y el número depende del motor de Intl: se compara sin él.
const sinEspacios = (t) => t.replace(/\s/g, '');

describe('precio de una prenda', () => {
    it('sin precio es por cotizar, nunca $0', () => {
        expect(textoPrecio(null)).toBe('Por cotizar');
        expect(textoPrecio(undefined)).toBe('Por cotizar');
    });

    it('un 0 solo puede ser sin costo, porque solo existe si alguien lo eligió', () => {
        expect(estadoPrecio(0)).toBe('sin_costo');
        expect(textoPrecio(0)).toBe('Sin costo');
    });

    it('un monto se muestra como plata', () => {
        expect(sinEspacios(textoPrecio(17490))).toBe('$17.490');
        expect(sinEspacios(textoSubtotal({ precio_unitario_estimado: 17990, cantidad: 2 }))).toBe('$35.980');
    });

    it('la línea sin monto dice su estado', () => {
        expect(textoSubtotal({ precio_unitario_estimado: null, cantidad: 3 })).toBe('Por cotizar');
    });
});

describe('total', () => {
    it('dice todo lo que hay, sin esconder lo que falta', () => {
        const items = [
            { precio_unitario_estimado: 17990, cantidad: 2 },
            { precio_unitario_estimado: null, cantidad: 1 },
            { precio_unitario_estimado: 0, cantidad: 1 },
        ];
        expect(sinEspacios(textoTotal(items))).toBe('$35.980+1porcotizar+1sincosto');
    });

    it('si nada tiene precio, el total está por cotizar', () => {
        expect(textoTotal([{ precio_unitario_estimado: null }])).toBe('Por cotizar');
        expect(textoTotal([])).toBe('Por cotizar');
    });

    it('si todo es sin costo, el total es sin costo', () => {
        expect(textoTotal([{ precio_unitario_estimado: 0 }])).toBe('Sin costo');
    });
});


describe('editar el precio', () => {
    it('cada estado guardado se ve como su opción', () => {
        expect(valorDesde(null)).toEqual({ tipo: 'por_cotizar', monto: '' });
        expect(valorDesde(0)).toEqual({ tipo: 'sin_costo', monto: '' });
        expect(valorDesde(32000)).toEqual({ tipo: 'monto', monto: '32000' });
    });

    it('un monto vacío o en cero no se puede guardar', () => {
        expect(esValido({ tipo: 'monto', monto: '' })).toBe(false);
        expect(esValido({ tipo: 'monto', monto: '0' })).toBe(false);
        expect(esValido({ tipo: 'por_cotizar', monto: '' })).toBe(true);
    });

    it('lo que viaja al servidor', () => {
        expect(paraServidor({ tipo: 'monto', monto: '32000' })).toEqual({ precio: 32000, sin_costo: false });
        expect(paraServidor({ tipo: 'sin_costo', monto: '' })).toEqual({ precio: null, sin_costo: true });
        expect(paraServidor({ tipo: 'por_cotizar', monto: '5' })).toEqual({ precio: null, sin_costo: false });
    });
});

describe('precioDeValor', () => {
    it('es lo que guardaría el servidor', () => {
        expect(precioDeValor({ tipo: 'sin_costo', monto: '' })).toBe(0);
        expect(precioDeValor({ tipo: 'monto', monto: '12000' })).toBe(12000);
        expect(precioDeValor({ tipo: 'monto', monto: '' })).toBeNull();
        expect(precioDeValor({ tipo: 'por_cotizar', monto: '' })).toBeNull();
    });
});
