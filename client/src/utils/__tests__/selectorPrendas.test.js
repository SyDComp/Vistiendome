import { describe, it, expect } from 'vitest';
import { avanzar, caracteristicasDe, opcionesDe, retroceder } from '../selectorPrendas';

const v = (talla, color, disponible, material = 'Tela Sofia') => ({ config: { TALLA: talla, COLOR: color, MATERIAL: material }, disponible });
const variantes = [v('XS', 'Negro', 2), v('S', 'Negro', 0), v('XS', 'Uva', 1), v('M', 'Uva', 3)];
const definiciones = [
    { name: 'COLOR', domain: [{ value: 'Uva', hex_code: '#A809B3' }, { value: 'Negro', hex_code: '#1F1E1E' }] },
    { name: 'TALLA', domain: [{ value: 'XS' }, { value: 'S' }, { value: 'M' }] },
];

describe('selector de prendas', () => {
    it('los pasos siguen el orden de la tienda', () => {
        expect(caracteristicasDe(variantes, ['COLOR', 'TALLA', 'MATERIAL'])).toEqual(['COLOR', 'TALLA', 'MATERIAL']);
    });

    it('cada opción dice cuántas quedan con lo elegido, en el orden de la característica y con su color', () => {
        expect(opcionesDe(variantes, 'TALLA', { COLOR: 'Negro' }, definiciones[1]))
            .toEqual([{ valor: 'XS', libres: 2, hex: undefined, imagen: undefined },
                { valor: 'S', libres: 0, hex: undefined, imagen: undefined },
                { valor: 'M', libres: 0, hex: undefined, imagen: undefined }]);
        expect(opcionesDe(variantes, 'COLOR', {}, definiciones[0]).map(o => [o.valor, o.hex]))
            .toEqual([['Uva', '#A809B3'], ['Negro', '#1F1E1E']]);
    });

    it('lo que tiene una sola opción con libres se elige solo, y al final queda la variante', () => {
        const pasos = ['COLOR', 'TALLA', 'MATERIAL'];
        expect(avanzar(variantes, pasos, {}, definiciones).paso).toBe('COLOR');
        const negro = avanzar(variantes, pasos, { COLOR: 'Negro' }, definiciones);
        expect(negro.paso).toBe(null);
        expect(negro.elegidas).toEqual({ COLOR: 'Negro', TALLA: 'XS', MATERIAL: 'Tela Sofia' });
        expect(negro.variante).toBe(variantes[0]);
    });

    it('volver un paso quita la última elección hecha a mano', () => {
        expect(retroceder({ COLOR: 'Uva', TALLA: 'M' })).toEqual({ COLOR: 'Uva' });
        expect(retroceder({})).toBe(null);
    });
});
