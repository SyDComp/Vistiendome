import { describe, it, expect } from 'vitest';
import { textoDeEtiqueta } from '../textoDeEtiqueta';

describe('textoDeEtiqueta', () => {
    it('la talla va aparte y el resto en el orden de siempre, completo', () => {
        const texto = textoDeEtiqueta({
            productName: 'Tapado Magdalena Invierno',
            config: { CUELLO: 'En V', MANGAS: 'Larga', COLOR: 'Azul Marino', TALLA: 'XS', MATERIAL: 'Tela Sofía' },
        });
        expect(texto.talla).toBe('XS');
        expect(texto.descripcion).toBe('Tapado Magdalena Invierno – Azul Marino / En V / Larga / Tela Sofía');
    });

    it('sin talla: solo la descripcion', () => {
        expect(textoDeEtiqueta({ productName: 'Corbata', config: { COLOR: 'Rojo' } }))
            .toEqual({ talla: null, descripcion: 'Corbata – Rojo' });
    });

    it('sin caracteristicas ni nombre: el SKU', () => {
        expect(textoDeEtiqueta({ productName: '', sku: 'SKU-1', config: {} }))
            .toEqual({ talla: null, descripcion: 'SKU-1' });
    });

    it('la talla se reconoce aunque venga en minuscula', () => {
        expect(textoDeEtiqueta({ productName: 'Vestido', config: { talla: '3xl' } }).talla).toBe('3xl');
    });
});
