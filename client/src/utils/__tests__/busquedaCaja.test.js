import { describe, it, expect } from 'vitest';
import { interpretar, sinFiltro } from '../busquedaCaja';

const caracteristicas = [
    { name: 'TALLA', domain: [{ value: 'XS' }, { value: 'S' }, { value: 'M' }, { value: 'L' }] },
    { name: 'COLOR', domain: [{ value: 'Rojo Italiano' }, { value: 'Azul Marino' }, { value: 'Azul Rey' }, { value: 'Negro' }] },
];

describe('búsqueda de la caja', () => {
    it('reconoce características aunque se escriban en plural, femenino o sin tilde', () => {
        const { filtros, libres } = interpretar('vestidos rojas xs', caracteristicas);
        expect(filtros.map(f => [f.caracteristica, f.valores])).toEqual([['TALLA', ['XS']], ['COLOR', ['Rojo Italiano']]]);
        expect(libres).toEqual(['vestidos']);
    });

    it('dos palabras de una misma característica se juntan', () => {
        const [color] = interpretar('azul marino', caracteristicas).filtros;
        expect(color.valores).toEqual(['Azul Marino']);
        expect(interpretar('azul', caracteristicas).filtros[0].valores).toEqual(['Azul Marino', 'Azul Rey']);
    });

    it('las palabras cortas solo calzan exactas', () => {
        expect(interpretar('s', caracteristicas).filtros[0].valores).toEqual(['S']);
        expect(interpretar('ma', caracteristicas).libres).toEqual(['ma']);
    });

    it('quitar una etiqueta borra las palabras que la pusieron', () => {
        const [, color] = interpretar('vestido rojo xs', caracteristicas).filtros;
        expect(sinFiltro('vestido Rojo xs', color)).toBe('vestido xs');
    });

    it('una palabra que calza en dos características va suelta (una u otra), no como dos filtros', () => {
        const conEstampado = [...caracteristicas, { name: 'ESTAMPADO', domain: [{ value: 'Flores Rojas' }] }];
        const r = interpretar('rojo xs', conEstampado);
        expect(r.filtros.map(f => f.caracteristica)).toEqual(['TALLA']);
        expect(r.libres).toEqual(['rojo']);
        expect(r.ambiguas).toEqual([{ palabra: 'rojo', caracteristicas: ['COLOR', 'ESTAMPADO'] }]);
    });
});
