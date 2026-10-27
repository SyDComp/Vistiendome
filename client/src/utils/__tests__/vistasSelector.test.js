import { describe, it, expect } from 'vitest';
import { opcionesFiltros, opcionesGrupo, opcionesPaso } from '../vistasSelector';

const color = { clave: 'COLOR', nombre: 'Color', opciones: [
    { valor: 'Negro', etiqueta: 'Negro', productos: 3, elegida: true, hex: '#111' },
    { valor: 'Uva', etiqueta: 'Uva', productos: 1, elegida: false },
] };

describe('vistas del selector', () => {
    it('cada filtro dice qué tiene puesto, o "Todas"', () => {
        expect(opcionesFiltros([color, { clave: 'TALLA', nombre: 'Talla', opciones: [] }]).map(o => o.detalle))
            .toEqual(['Negro', 'Todas']);
    });

    it('los valores de un filtro dicen cuántos productos quedan y cuáles están puestos', () => {
        expect(opcionesGrupo(color)).toEqual([
            { clave: 'Negro', titulo: 'Negro', detalle: '3 productos', hex: '#111', imagen: undefined, marcada: true },
            { clave: 'Uva', titulo: 'Uva', detalle: '1 producto', hex: undefined, imagen: undefined, marcada: false },
        ]);
    });

    it('lo que no tiene libres se ve apagado', () => {
        expect(opcionesPaso([{ valor: 'S', libres: 0 }, { valor: 'M', libres: 1 }]).map(o => [o.detalle, o.apagada]))
            .toEqual([['no queda', true], ['1 libre', false]]);
    });
});
