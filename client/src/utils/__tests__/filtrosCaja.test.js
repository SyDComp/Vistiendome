import { describe, it, expect } from 'vitest';
import {
    SIN_FILTROS, aParametros, alternar, cuantosFiltros, desdeInterpretacion, paginaDe, paginasDe,
    posicionDe, teclaDe,
} from '../filtrosCaja';

describe('filtros de la caja', () => {
    it('lo que entendió el buscador pasa a filtros', () => {
        const f = desdeInterpretacion({ filtros: [{ caracteristica: 'Color', valores: ['Rojo'] }], libres: ['vestido'] });
        expect(f).toEqual({ valores: { COLOR: ['Rojo'] }, categorias: [], palabras: ['vestido'] });
    });

    it('se marcan y desmarcan opciones, varias por grupo', () => {
        let f = alternar(SIN_FILTROS, 'COLOR', 'Negro');
        f = alternar(f, 'COLOR', 'Azul');
        f = alternar(f, 'categoria', '3');
        expect(cuantosFiltros(f)).toBe(3);
        expect(aParametros(f, { pagina: 2 })).toBe('valor=COLOR%3DNegro&valor=COLOR%3DAzul&categoria=3&pagina=2');
        f = alternar(alternar(f, 'COLOR', 'Negro'), 'COLOR', 'Azul');
        expect(f.valores).toEqual({});
    });

    it('páginas de diez con las teclas 1 a 9 y 0', () => {
        const lista = Array.from({ length: 23 }, (_, i) => i);
        expect(paginasDe(lista)).toBe(3);
        expect(paginaDe(lista, 3)).toEqual([20, 21, 22]);
        expect([teclaDe(0), teclaDe(8), teclaDe(9), teclaDe(10)]).toEqual(['1', '9', '0', null]);
        expect([posicionDe('1'), posicionDe('0'), posicionDe('a')]).toEqual([0, 9, null]);
    });
});
