import { describe, it, expect } from 'vitest';
import { valoresEnRango, evaluarTramos } from '../priceTiers';

const TALLAS = ['12', '14', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
const COLORES = ['Negro', 'Azul Marino', 'Verde Agua'];

describe('valoresEnRango', () => {
    it('devuelve el rango pedido', () => {
        expect(valoresEnRango(TALLAS, 'S', 'XL')).toEqual(['S', 'M', 'L', 'XL']);
    });

    it('acepta el rango al revés', () => {
        expect(valoresEnRango(TALLAS, 'XL', 'S')).toEqual(['S', 'M', 'L', 'XL']);
    });

    // El caso que tenía roto al tramo "mayorista" en producción: from "" y
    // to "" devolvían [], el tramo se descartaba y no descontaba nunca.
    it('sin extremos NO restringe: los devuelve todos', () => {
        expect(valoresEnRango(COLORES, '', '')).toEqual(COLORES);
        expect(valoresEnRango(COLORES, null, undefined)).toEqual(COLORES);
    });

    it('un solo extremo en blanco abre ese lado', () => {
        expect(valoresEnRango(TALLAS, '', 'S')).toEqual(['12', '14', 'XS', 'S']);
        expect(valoresEnRango(TALLAS, '3XL', '')).toEqual(['3XL', '4XL']);
    });

    it('si un extremo no existe, no inventa un rango', () => {
        expect(valoresEnRango(TALLAS, 'S', 'NO_EXISTE')).toEqual([]);
    });
});

describe('evaluarTramos', () => {
    const metadata = { attributes: { TALLA: TALLAS, COLOR: COLORES } };

    const linea = (i, talla, cantidad = 1) => ({
        __key: `k${i}`, productId: 1, price: 10000, quantity: cantidad,
        selections: { COLOR: 'Negro', TALLA: talla },
    });

    // El tramo "mayorista" tal cual estaba guardado en producción.
    const mayorista = {
        tiers: [{ name: 'mayorista', characteristic: 'COLOR', from: '', to: '', min_qty: 6, discount_type: 'amount', discount_value: 1000 }],
    };

    it('aplica un tramo con rango en blanco', () => {
        const carrito = [linea(1, 'S', 6)];
        const r = evaluarTramos(carrito, mayorista, metadata);
        expect(r.get('k1')?.precio).toBe(9000);
    });

    it('no aplica si no se llega al mínimo', () => {
        const r = evaluarTramos([linea(1, 'S', 5)], mayorista, metadata);
        expect(r.size).toBe(0);
    });

    // Suma las unidades del MISMO producto y mismas características salvo la
    // del tramo. Seis prendas sueltas de modelos distintos no son seis del
    // mismo grupo — es la regla que hizo pensar a QA que no funcionaba.
    it('suma unidades dentro del grupo, no del carrito entero', () => {
        const iglesia = {
            tiers: [{ name: 'iglesia', characteristic: 'TALLA', from: '12', to: '3XL', min_qty: 6, discount_type: 'amount', discount_value: 3000 }],
        };
        const mismoGrupo = [linea(1, 'S', 3), linea(2, 'M', 3)];
        expect(evaluarTramos(mismoGrupo, iglesia, metadata).get('k1')?.precio).toBe(7000);

        const otroColor = { ...linea(2, 'M', 3), selections: { COLOR: 'Verde Agua', TALLA: 'M' } };
        expect(evaluarTramos([linea(1, 'S', 3), otroColor], iglesia, metadata).size).toBe(0);
    });
});
