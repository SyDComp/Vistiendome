import { describe, it, expect } from 'vitest';
import { textoAbastecimiento, textoPersonalizacion, mensajeBorrado } from '../categoriaAjustes';

describe('ajustes de una categoría', () => {
    it('dice de quién hereda', () => {
        expect(textoAbastecimiento({ abastecimiento_texto: 'Se confecciona en el taller', abastecimiento_heredado_de: 'Vestimenta' }))
            .toBe('Se confecciona en el taller (igual que Vestimenta)');
        expect(textoPersonalizacion({ acepta_personalizacion_efectiva: false })).toBe('No');
    });
});

describe('aviso de borrado', () => {
    it('dice a dónde va todo, y si cambia el comportamiento', () => {
        expect(mensajeBorrado({
            categoria: 'Vestidos', subcategorias: 13, subcategorias_pasan_a: 'Vestimenta',
            productos: 2, productos_pasan_a: 'Vestimenta',
            abastecimiento_de_productos: { de: 'Solo lo que hay en bodega', a: 'Se confecciona en el taller' },
        })).toBe('¿Eliminar la categoría "Vestidos"? Sus 13 subcategorías pasan a "Vestimenta". '
            + 'Sus 2 productos pasan a "Vestimenta". Ojo: cuando no haya en bodega, esos productos dejarán de ser '
            + '"Solo lo que hay en bodega" y pasarán a "Se confecciona en el taller".');
    });

    it('al borrar una principal, lo de abajo pasa a ser principal', () => {
        expect(mensajeBorrado({ categoria: 'Lecturas', subcategorias: 1, subcategorias_pasan_a: null, productos: 0 }))
            .toBe('¿Eliminar la categoría "Lecturas"? Su subcategoría pasa a ser categoría principal.');
    });

    it('una vacía lo dice', () => {
        expect(mensajeBorrado({ categoria: 'Prueba', subcategorias: 0, productos: 0 }))
            .toBe('¿Eliminar la categoría "Prueba"? No tiene subcategorías ni productos.');
    });
});
