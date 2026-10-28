import { describe, it, expect } from 'vitest';
import { avanzar, caracteristicasDe, elegidasPorFiltro, opcionesDe, retroceder } from '../selectorPrendas';
import { opcionesPaso } from '../vistasSelector';

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

    it('lo que el filtro ya eligió no se vuelve a preguntar; si quedan varios, van marcados', () => {
        const pasos = ['COLOR', 'TALLA'];
        // Un solo valor filtrado que el producto tiene: elegido.
        expect(elegidasPorFiltro(variantes, pasos, { TALLA: ['M'] })).toEqual({ TALLA: 'M' });
        // "Negro o Azul": el producto solo tiene Negro → Negro.
        expect(elegidasPorFiltro(variantes, pasos, { COLOR: ['Negro', 'Azul'] })).toEqual({ COLOR: 'Negro' });
        // Los dos están: se pregunta, con los dos marcados.
        expect(elegidasPorFiltro(variantes, pasos, { COLOR: ['Negro', 'Uva'] })).toEqual({});
        const opciones = opcionesPaso(opcionesDe(variantes, 'COLOR', {}, definiciones[0]), ['Negro', 'Uva']);
        expect(opciones.map(o => [o.clave, o.marcada])).toEqual([['Uva', true], ['Negro', true]]);
        // Uno con libres y otro sin: el que tiene.
        const conUnoAgotado = [v('XS', 'Negro', 0), v('XS', 'Uva', 1)];
        expect(elegidasPorFiltro(conUnoAgotado, pasos, { COLOR: ['Negro', 'Uva'] })).toEqual({ COLOR: 'Uva' });
    });
});
