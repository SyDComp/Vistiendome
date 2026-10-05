import { describe, it, expect } from 'vitest';
import { descuentoDeLinea } from '../descuentoDeLinea';
import { buildWhatsAppMessage } from '../cartUtils';
import { aplicarPreciosVigentes } from '../revalidarCarrito';

describe('descuentoDeLinea', () => {
    it('precio normal: sin descuento', () => {
        expect(descuentoDeLinea({ price: 17990 })).toBeNull();
    });

    it('oferta del producto: informa el precio de antes', () => {
        expect(descuentoDeLinea({ price: 13990, original_price: 17990, on_sale: true }))
            .toEqual({ motivos: ['Oferta del producto'], antes: 17990 });
    });

    it('marcada como oferta pero sin rebaja real: no cuenta', () => {
        expect(descuentoDeLinea({ price: 17990, original_price: 17990, on_sale: true })).toBeNull();
    });

    it('precio por cantidad: nombra el tramo y parte del precio de la linea', () => {
        expect(descuentoDeLinea({ price: 23990, tramoAplicado: 'iglesia', precioTramo: 20990 }))
            .toEqual({ motivos: ['Precio iglesia'], antes: 23990 });
    });

    it('oferta y tramo juntos: los dos motivos, desde el precio sin oferta', () => {
        expect(descuentoDeLinea({
            price: 13990, original_price: 17990, on_sale: true, tramoAplicado: 'mayorista', precioTramo: 11990,
        })).toEqual({ motivos: ['Oferta del producto', 'Precio mayorista'], antes: 17990 });
    });
});

describe('mensaje de WhatsApp', () => {
    const producto = (extra) => ({ name: 'Tapado', quantity: 6, price: 20990, selections: { COLOR: 'Coral' }, ...extra });

    it('el producto con descuento dice cual y en cuanto quedo', () => {
        const texto = buildWhatsAppMessage({
            productos: [producto({ descuento: { motivos: ['Precio iglesia'], antes: 23990 } })],
        });
        expect(texto).toContain('*Precio:* $20.990 c/u');
        expect(texto).toContain('*Descuento:* Precio iglesia (antes $23.990 c/u)');
    });

    it('el producto sin descuento no lleva la linea', () => {
        expect(buildWhatsAppMessage({ productos: [producto({ descuento: null })] })).not.toContain('Descuento');
    });
});

describe('revalidar el carrito', () => {
    const linea = { sku: 'A', name: 'Tapado', price: 13990, original_price: 17990, on_sale: true };

    it('si termina la oferta y el precio cambia, avisa y actualiza', () => {
        const { items, cambios } = aplicarPreciosVigentes([linea], [{ sku: 'A', price: 17990, original_price: 17990, on_sale: false }]);
        expect(cambios).toHaveLength(1);
        expect(items[0]).toMatchObject({ price: 17990, on_sale: false });
    });

    it('si solo cambian los datos de la oferta, actualiza sin avisar', () => {
        const { items, cambios } = aplicarPreciosVigentes([linea], [{ sku: 'A', price: 13990, original_price: 18990, on_sale: true }]);
        expect(cambios).toHaveLength(0);
        expect(items[0].original_price).toBe(18990);
    });

    it('sin cambios devuelve la misma linea', () => {
        const { items } = aplicarPreciosVigentes([linea], [{ sku: 'A', price: 13990, original_price: 17990, on_sale: true }]);
        expect(items[0]).toBe(linea);
    });
});
