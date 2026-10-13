import { describe, it, expect } from 'vitest';
import { describirEvento, autorDe, canalSegunHistoria } from '../historiaPedido';

describe('canalSegunHistoria', () => {
    it('vale la última corrección, no la copia del pedido', () => {
        const eventos = [
            { tipo: 'CREADO', datos: { origen: 'MANUAL', canal: 'WhatsApp' } },
            { tipo: 'CANAL', datos: { de: 'WhatsApp', a: 'Instagram' } },
        ];
        expect(canalSegunHistoria(eventos, 'WhatsApp')).toBe('Instagram');
    });

    it('un manual antiguo sin dato sigue sin dato hasta que se indique', () => {
        const eventos = [{ tipo: 'CREADO', datos: { origen: 'MANUAL', canal: null, anterior_al_registro: true } }];
        expect(canalSegunHistoria(eventos, null)).toBeNull();
    });

    it('mientras carga la historia, vale lo que traía el pedido', () => {
        expect(canalSegunHistoria([], 'Feria')).toBe('Feria');
    });
});

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

    it('el despacho desde la pantalla de etiquetas lo dice', () => {
        const ev = { tipo: 'ESTADO', datos: { de: 'CONFIRMADA', a: 'DESPACHADA', motivo: 'etiquetas' } };
        expect(describirEvento(ev, 'DESPACHO').detalle).toBe('Desde la pantalla de etiquetas de envío');
    });

    it('un cambio de precio dice sus tres estados con palabras, nunca $0', () => {
        expect(describirEvento({ tipo: 'PRECIO', datos: { prenda: 'Bolero', de: null, a: 0 } }).texto)
            .toBe('Precio de Bolero: Por cotizar → Sin costo');
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

describe('confirmar y quitar prendas', () => {
    it('la confirmación dice de dónde sale cada prenda, lo que espera y la nota', () => {
        const { detalle } = describirEvento({ tipo: 'ESTADO', datos: {
            de: 'EN_CONVERSACION', a: 'CONFIRMADA', bodega: 1, taller: 2,
            esperando: ['Cinturón (M)'], nota: 'Llega el jueves',
        } });
        expect(detalle).toBe('1 prenda de bodega · 2 prendas al taller · Esperando bodega: Cinturón (M) · Nota: Llega el jueves');
    });

    it('una confirmación anterior a los caminos no inventa detalle', () => {
        expect(describirEvento({ tipo: 'ESTADO', datos: { de: 'NUEVA', a: 'CONFIRMADA' } }).detalle).toBeNull();
    });

    it('una prenda agregada dice cuál y cuántas', () => {
        const { texto, detalle } = describirEvento({ tipo: 'PRENDA_AGREGADA', datos: { prenda: 'Vestido Noemi (Coral / M)', cantidad: 12, precio: 17490 } });
        expect(texto).toBe('Se agregó al pedido: 12× Vestido Noemi (Coral / M)');
        expect(detalle).toContain('17.490');
    });

    it('una prenda quitada dice cuál era y su precio', () => {
        const { texto } = describirEvento({ tipo: 'PRENDA_QUITADA', datos: { prenda: 'Cinturón (M)', cantidad: 2, precio: null } });
        expect(texto).toBe('Se quitó del pedido: 2× Cinturón (M)');
    });
});

describe('prendas canceladas', () => {
    it('dice adónde fue lo hecho', () => {
        const ev = describirEvento({ tipo: 'PRENDA_CANCELADA', datos: { prenda: 'Bolero (M)', cantidad: 2, destino: 'piezas' } });
        expect(ev).toEqual({ texto: 'Se canceló: 2× Bolero (M)', detalle: 'Quedó en Bodega › Piezas únicas' });
        expect(describirEvento({ tipo: 'PRENDA_CANCELADA', datos: { prenda: 'X', cantidad: 1, destino: null } }).detalle).toBeNull();
    });

    it('lo que se terminó después de cancelarse', () => {
        const ev = describirEvento({ tipo: 'CANCELADA_TERMINADA', datos: { prenda: 'Vestido (M)', cantidad: 1, destino: 'bodega', orden: 7 } });
        expect(ev.texto).toBe('Orden de corte N° 7 terminada con una prenda cancelada: 1× Vestido (M)');
        expect(ev.detalle).toBe('Ya estaba hecha: entró a bodega');
    });
});

describe('fecha comprometida', () => {
    it('al confirmar dice para cuándo', () => {
        const { detalle } = describirEvento({ tipo: 'ESTADO', datos: { de: 'NUEVA', a: 'CONFIRMADA', bodega: 0, taller: 1, fecha: '2026-10-20' } });
        expect(detalle).toMatch(/^1 prenda al taller · Para el .*20 oct$/);
    });

    it('corregirla dice de cuál a cuál y el motivo', () => {
        const ev = describirEvento({ tipo: 'FECHA', datos: { de: '2026-10-20', a: '2026-10-25', nota: 'La tela llegó tarde' } });
        expect(ev.texto).toMatch(/^Fecha comprometida: .*20 oct → .*25 oct$/);
        expect(ev.detalle).toBe('Motivo: La tela llegó tarde');
        expect(describirEvento({ tipo: 'FECHA', datos: { de: null, a: '2026-10-25', nota: null } }).texto).toMatch(/^Se puso fecha comprometida/);
    });
});

