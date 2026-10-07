import { describe, it, expect } from 'vitest';
import { describirEvento, autorDe } from '../historiaPedido';

describe('describirEvento', () => {
    it('un pedido de la web dice por dónde llegó', () => {
        expect(describirEvento({ tipo: 'CREADO', datos: { origen: 'CONTACTO_INDIVIDUAL', canal: null } }).texto)
            .toBe('Llegó por el formulario de contacto');
    });

    it('uno del panel dice cómo llegó', () => {
        expect(describirEvento({ tipo: 'CREADO', datos: { origen: 'MANUAL', canal: 'WhatsApp' } }))
            .toEqual({ texto: 'Creado en el panel', detalle: 'Llegó por WhatsApp' });
    });

    it('en un retiro, despachada se dice entregada', () => {
        const ev = { tipo: 'ESTADO', datos: { de: 'CONFIRMADA', a: 'DESPACHADA' } };
        expect(describirEvento(ev, 'DESPACHO').texto).toBe('Confirmada → Despachada');
        expect(describirEvento(ev, 'RETIRO').texto).toBe('Confirmada → Entregada');
    });

    it('el despacho al imprimir etiquetas lo dice', () => {
        const ev = { tipo: 'ESTADO', datos: { de: 'CONFIRMADA', a: 'DESPACHADA', motivo: 'etiquetas' } };
        expect(describirEvento(ev, 'DESPACHO').detalle).toBe('Al imprimir las etiquetas de envío');
    });

    it('finalizar y reabrir una orden', () => {
        expect(describirEvento({ tipo: 'ORDEN_ESTADO', datos: { orden: 6, prendas: 1, de: 'EN_PROCESO', a: 'FINALIZADA' } }))
            .toEqual({ texto: 'Orden de corte N° 6 finalizada', detalle: '1 prenda de este pedido quedó lista' });
        expect(describirEvento({ tipo: 'ORDEN_ESTADO', datos: { orden: 6, prendas: 2, de: 'FINALIZADA', a: 'EN_PROCESO' } }))
            .toEqual({ texto: 'Se reabrió la orden de corte N° 6', detalle: 'Ahora: En proceso' });
    });

    it('el inicio del registro no inventa lo anterior', () => {
        const ev = { tipo: 'REGISTRO_INICIADO', datos: { estado: 'CONFIRMADA', piezas: 5, cortadas: 0, ordenes: [6] } };
        expect(describirEvento(ev, 'DESPACHO')).toEqual({
            texto: 'Inicio del registro de historia. Estado en ese momento: Confirmada',
            detalle: '5 prendas del catálogo, 0 listas · orden de corte N° 6. Lo anterior no quedó anotado.',
        });
    });
});

describe('autorDe', () => {
    it('quién lo hizo, si se sabe', () => {
        expect(autorDe({ tipo: 'ESTADO', actor_nombre: 'Allan' })).toBe('Allan');
    });

    it('de un pedido manual antiguo no se sabe quién lo cargó, y se dice', () => {
        expect(autorDe({ tipo: 'CREADO', datos: { origen: 'MANUAL', anterior_al_registro: true }, actor_nombre: null }))
            .toBe('No quedó registrado quién');
    });

    it('el inicio del registro no tiene autor', () => {
        expect(autorDe({ tipo: 'REGISTRO_INICIADO', datos: {}, actor_nombre: null })).toBeNull();
    });
});
