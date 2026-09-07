import { describe, it, expect } from 'vitest';
import { conservarDatosCargados } from '../conservarVariantes';

// Las 4 variantes tarifadas del producto, tal como estaban antes de tocar nada.
const existentes = [
    { sku: 'A', config: { TALLA: 'XS', COLOR: 'Negro' },  price: 10000, stock: 5 },
    { sku: 'B', config: { TALLA: 'XS', COLOR: 'Blanco' }, price: 10000, stock: 3 },
    { sku: 'C', config: { TALLA: 'S',  COLOR: 'Negro' },  price: 12000, stock: 0 },
    { sku: 'D', config: { TALLA: 'S',  COLOR: 'Blanco' }, price: 12000, stock: 1 },
];

// Lo que devuelve generate-variants al agregar CUELLO: todo en 0.
const combo = (TALLA, COLOR, CUELLO) => ({ sku: `${TALLA}-${COLOR}-${CUELLO}`, config: { TALLA, COLOR, CUELLO }, price: 0, stock: 0 });

describe('conservarDatosCargados', () => {
    it('un producto nuevo no tiene nada que conservar', () => {
        const r = conservarDatosCargados([combo('XS', 'Negro', 'En V')], []);
        expect(r.variantes[0].price).toBe(0);
        expect(r.heredadas).toBe(0);
    });

    // El caso reproducido: 4 variantes a $10.000/$12.000 quedaban las 8 en $0.
    it('al agregar una característica, cada versión hereda su precio', () => {
        const nuevas = [
            combo('XS', 'Negro', 'En V'), combo('XS', 'Negro', 'Redondo'),
            combo('XS', 'Blanco', 'En V'), combo('XS', 'Blanco', 'Redondo'),
            combo('S', 'Negro', 'En V'), combo('S', 'Negro', 'Redondo'),
            combo('S', 'Blanco', 'En V'), combo('S', 'Blanco', 'Redondo'),
        ];
        const { variantes, heredadas } = conservarDatosCargados(nuevas, existentes);

        expect(heredadas).toBe(8);
        expect(variantes.every(v => v.price > 0)).toBe(true);
        expect(variantes.find(v => v.config.TALLA === 'XS' && v.config.COLOR === 'Negro').price).toBe(10000);
        expect(variantes.find(v => v.config.TALLA === 'S' && v.config.COLOR === 'Blanco').price).toBe(12000);
    });

    // Copiar el stock a las dos mitades inventaria unidades que no existen.
    it('NO reparte el stock al subdividir una versión', () => {
        const { variantes } = conservarDatosCargados(
            [combo('XS', 'Negro', 'En V'), combo('XS', 'Negro', 'Redondo')],
            existentes,
        );
        expect(variantes.every(v => v.stock === 0)).toBe(true);
    });

    it('la versión que no cambió se queda igual, con su stock', () => {
        const iguales = [
            { sku: 'A', config: { TALLA: 'XS', COLOR: 'Negro' }, price: 0, stock: 0 },
        ];
        const { variantes } = conservarDatosCargados(iguales, existentes);
        expect(variantes[0].price).toBe(10000);
        expect(variantes[0].stock).toBe(5);
    });

    it('una combinación que no sale de ninguna anterior queda en 0', () => {
        const { variantes, nuevas } = conservarDatosCargados(
            [{ sku: 'X', config: { TALLA: '7XL', COLOR: 'Coral' }, price: 0, stock: 0 }],
            existentes,
        );
        expect(variantes[0].price).toBe(0);
        expect(nuevas).toBe(1);
    });
});
