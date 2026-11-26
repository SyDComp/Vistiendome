import { describe, it, expect } from 'vitest';
import { opcionesDelProducto, cumpleFiltros, hayFiltros, describirFiltros } from '../opcionesDelProducto';

const BIBLIOTECA = [
    { name: 'COLOR', domain: [{ value: 'Negro' }, { value: 'Blanco' }, { value: 'Rojo Italiano' }] },
    { name: 'TALLA', domain: [{ value: '12' }, { value: 'XS' }, { value: 'S' }, { value: 'M' }] },
    { name: 'ESTAMPADO', domain: [{ value: 'Floral' }] },
];

// El caso del reporte: un bolero solo en negro, que mostraba los 21 colores.
const BOLERO = [
    { config: { COLOR: 'Negro', TALLA: 'M' } },
    { config: { COLOR: 'Negro', TALLA: 'XS' } },
    { config: { COLOR: 'Negro', TALLA: 'S' } },
];

describe('opcionesDelProducto', () => {
    it('solo lo que tienen las variantes del producto, con cuántas hay', () => {
        expect(opcionesDelProducto(BOLERO, BIBLIOTECA)).toEqual([
            { name: 'COLOR', values: [{ valor: 'Negro', cantidad: 3 }] },
            { name: 'TALLA', values: [{ valor: 'XS', cantidad: 1 }, { valor: 'S', cantidad: 1 }, { valor: 'M', cantidad: 1 }] },
        ]);
    });

    it('una característica que el producto no tiene no aparece', () => {
        const nombres = opcionesDelProducto(BOLERO, BIBLIOTECA).map(c => c.name);
        expect(nombres).not.toContain('ESTAMPADO');
    });

    it('un valor vacío no es un botón', () => {
        expect(opcionesDelProducto([{ config: { COLOR: '', TALLA: 'M' } }], BIBLIOTECA)).toEqual([
            { name: 'TALLA', values: [{ valor: 'M', cantidad: 1 }] },
        ]);
    });

    it('lo que no está en la biblioteca va al final, por nombre', () => {
        const r = opcionesDelProducto([{ config: { MANGA: 'Larga', COLOR: 'Rojo Italiano' } }, { config: { MANGA: 'Corta', COLOR: 'Negro' } }], BIBLIOTECA);
        expect(r.map(c => c.name)).toEqual(['COLOR', 'MANGA']);
        expect(r[0].values.map(v => v.valor)).toEqual(['Negro', 'Rojo Italiano']);
        expect(r[1].values.map(v => v.valor)).toEqual(['Corta', 'Larga']);
    });
});

describe('cumpleFiltros', () => {
    const filtros = { COLOR: new Set(['Negro', 'Blanco']), TALLA: new Set(['M']) };

    it('una opción de cada característica elegida, todas las características', () => {
        expect(cumpleFiltros({ COLOR: 'Blanco', TALLA: 'M' }, filtros)).toBe(true);
        expect(cumpleFiltros({ COLOR: 'Blanco', TALLA: 'S' }, filtros)).toBe(false);
        expect(cumpleFiltros({ TALLA: 'M' }, filtros)).toBe(false);
    });

    it('sin nada elegido no hay filtro', () => {
        expect(hayFiltros({})).toBe(false);
        expect(hayFiltros({ COLOR: new Set() })).toBe(false);
        expect(hayFiltros(filtros)).toBe(true);
    });

    it('dice lo elegido en palabras', () => {
        expect(describirFiltros(filtros)).toBe('Negro o Blanco y M');
    });
});
