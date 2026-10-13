import { describe, it, expect } from 'vitest';
import { detallePieza, dondePieza } from '../piezas';

describe('piezas únicas', () => {
    it('marca lo propuesto en sus características', () => {
        expect(detallePieza({ config: { TALLA: 'M', COLOR: 'Uva' }, config_propuesta: { CUELLO: 'V' } }))
            .toBe('M / Uva / V (propuesto)');
    });

    it('dice dónde está o de dónde vino', () => {
        expect(dondePieza({ estado: 'DISPONIBLE', origen_pedido_numero: 12 })).toBe('Hecha para el pedido N° 12, que se canceló');
        expect(dondePieza({ estado: 'APARTADA', pedido_numero: 30 })).toBe('Apartada para el pedido N° 30');
        expect(dondePieza({ estado: 'VENDIDA', pedido_numero: 30 })).toBe('Salió con el pedido N° 30');
        expect(dondePieza({ estado: 'BAJA', nota: 'Se regaló' })).toBe('Baja: Se regaló');
    });
});
