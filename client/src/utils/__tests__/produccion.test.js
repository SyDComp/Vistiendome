import { describe, it, expect } from 'vitest';
import { estadoDeProduccion, textoListo } from '../produccion';

const confirmado = (produccion, extra = {}) => ({ estado: 'CONFIRMADA', produccion, ...extra });

describe('estadoDeProduccion', () => {
    it('antes de confirmar no dice nada', () => {
        expect(estadoDeProduccion({ estado: 'NUEVA', produccion: { taller: 2 } }).texto).toBeNull();
    });

    it('listo dice si se despacha o se retira', () => {
        expect(estadoDeProduccion(confirmado({ taller: 1, hechas: 1, listo: true })).texto).toBe('Listo para despachar');
        expect(estadoDeProduccion(confirmado({ bodega: 1, listo: true }, { modo_entrega: 'RETIRO' })).texto).toBe('Listo para retirar');
    });

    it('cuenta lo hecho en el taller, personalizadas incluidas', () => {
        expect(estadoDeProduccion(confirmado({ taller: 3, hechas: 1 })).texto).toBe('1 de 3 hechas');
        expect(estadoDeProduccion(confirmado({ taller: 2, hechas: 0 })).texto).toBe('Por hacer · sin orden todavía');
        expect(estadoDeProduccion(confirmado({ taller: 2, hechas: 0, ordenes: [{ numero: 4 }] })).texto).toBe('Por hacer en el taller');
    });

    it('dice lo que espera bodega', () => {
        expect(estadoDeProduccion(confirmado({ taller: 1, hechas: 1, bodega: 2, esperando: 1 })).texto).toBe('1 esperando bodega');
        expect(estadoDeProduccion(confirmado({ taller: 2, hechas: 0, bodega: 2, esperando: 2 })).texto)
            .toBe('Por hacer · sin orden todavía · 2 esperando bodega');
    });

    it('textoListo', () => {
        expect(textoListo('DESPACHO')).toBe('Listo para despachar');
    });
});
