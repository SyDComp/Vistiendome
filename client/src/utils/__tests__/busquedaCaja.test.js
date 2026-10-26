import { describe, it, expect } from 'vitest';
import { buscar, interpretar, sinFiltro } from '../busquedaCaja';

const caracteristicas = [
    { name: 'TALLA', domain: [{ value: 'XS' }, { value: 'S' }, { value: 'M' }, { value: 'L' }] },
    { name: 'COLOR', domain: [{ value: 'Rojo Italiano' }, { value: 'Azul Marino' }, { value: 'Azul Rey' }, { value: 'Negro' }] },
];
const vestido = (talla, color) => ({ nombre: 'Vestido Noemi', codigo: `NOE-${talla}-${color}`, config: { TALLA: talla, COLOR: color } });
const disponibles = [
    vestido('XS', 'Rojo Italiano'), vestido('S', 'Rojo Italiano'), vestido('XS', 'Azul Marino'),
    { nombre: 'Tapado Magdalena', codigo: 'MAG-XS', config: { TALLA: 'XS', COLOR: 'Negro' } },
];

describe('búsqueda de la caja', () => {
    it('reconoce características aunque se escriban en plural, femenino o sin tilde', () => {
        const { filtros, libres } = interpretar('vestidos rojas xs', caracteristicas);
        expect(filtros.map(f => [f.caracteristica, f.valores])).toEqual([['TALLA', ['XS']], ['COLOR', ['Rojo Italiano']]]);
        expect(libres).toEqual(['vestidos']);
        expect(buscar(disponibles, interpretar('vestidos rojas xs', caracteristicas)).total).toBe(1);
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

    it('cada palabra achica; lo que no es característica busca en nombre y código', () => {
        expect(buscar(disponibles, interpretar('xs', caracteristicas)).total).toBe(3);
        expect(buscar(disponibles, interpretar('xs magdalena', caracteristicas)).total).toBe(1);
    });

    it('quitar una etiqueta borra las palabras que la pusieron', () => {
        const [, color] = interpretar('vestido rojo xs', caracteristicas).filtros;
        expect(sinFiltro('vestido Rojo xs', color)).toBe('vestido xs');
    });
});
