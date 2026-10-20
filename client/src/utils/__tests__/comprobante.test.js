import { describe, it, expect } from 'vitest';
import { armarComprobante } from '../comprobante';

const tienda = { nombre: 'Tienda', direccion: 'Calle 1', telefono: '9 1234 5678' };
const pedido = {
    numero: 40,
    created_at: '2026-10-20T15:30:00',
    politica_cambios: { plazo: 15, unidad: 'dias', personalizadas_sin_cambio: true },
    items: [
        { sku_id: 7, producto_nombre: 'Cinturón', config: { TALLA: 'M' }, cantidad: 2, precio_unitario_estimado: 9000 },
        { sku_id: null, pieza_numero: 1, producto_nombre: 'Bolero', config: {}, cantidad: 1, precio_unitario_estimado: 7000 },
        { sku_id: 8, producto_nombre: 'Pañuelo', config: {}, cantidad: 1, precio_unitario_estimado: 3000, cancelada_en: '2026-10-20' },
    ],
};
const pagos = [
    { tipo: 'PAGO', medio: 'Débito', monto: 5000, registrado_en: '2026-10-20T15:31:00' },
    { tipo: 'PAGO', medio: 'Efectivo', monto: 20000, registrado_en: '2026-10-20T15:30:30' },
    { tipo: 'PAGO', medio: 'Efectivo', monto: 999, registrado_en: '2026-10-20T15:30:10', anulado_en: '2026-10-20' },
];

describe('comprobante', () => {
    const c = armarComprobante({ pedido, pagos, tienda, recibido: 25000 });

    it('las prendas que siguen en el pedido, con su total', () => {
        expect(c.lineas.map(l => [l.nombre, l.subtotal])).toEqual([['Cinturón', 18000], ['Bolero', 7000]]);
        expect(c.total).toBe(25000);
    });

    it('lo hecho a medida (una pieza única) sale marcado sin cambio', () => {
        expect(c.lineas.map(l => l.sinCambio)).toEqual([false, true]);
        expect(c.lineas[1].detalle).toBe('Pieza única N° 1');
    });

    it('los pagos en el orden en que se hicieron, sin los anulados, y el vuelto del efectivo', () => {
        expect(c.pagos).toEqual([{ medio: 'Efectivo', monto: 20000 }, { medio: 'Débito', monto: 5000 }]);
        expect(c.vuelto).toEqual({ recibido: 25000, vuelto: 5000 });
    });

    it('sin política guardada no se dice ninguna', () => {
        expect(c.politica).toHaveLength(2);
        expect(armarComprobante({ pedido: { ...pedido, politica_cambios: null }, pagos, tienda }).politica).toEqual([]);
    });
});
