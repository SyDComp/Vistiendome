import { describe, it, expect } from 'vitest';
import { diasHasta, estadoFecha, hoyIso, textoFecha, textoPlazo } from '../fechaComprometida';

const confirmado = (fecha) => ({ estado: 'CONFIRMADA', fecha_comprometida: fecha });
const HOY = '2026-10-13';

describe('fecha comprometida', () => {
    it('se dice corta, sin moverse de día por la zona horaria', () => {
        expect(textoFecha('2026-10-20')).toMatch(/20 oct/);
        expect(diasHasta('2026-10-20', HOY)).toBe(7);
    });

    it('atrasado, vence pronto o normal', () => {
        expect(estadoFecha(confirmado('2026-10-10'), HOY)).toMatchObject({ tono: 'atrasado', detalle: 'Atrasado 3 días' });
        expect(estadoFecha(confirmado('2026-10-13'), HOY)).toMatchObject({ tono: 'pronto', detalle: 'Es hoy' });
        expect(estadoFecha(confirmado('2026-10-14'), HOY)).toMatchObject({ tono: 'pronto', detalle: 'Mañana' });
        expect(estadoFecha(confirmado('2026-10-30'), HOY).tono).toBe('normal');
    });

    it('lo que ya salió no se colorea; sin confirmar no dice nada', () => {
        expect(estadoFecha({ estado: 'DESPACHADA', fecha_comprometida: '2026-10-01' }, HOY).tono).toBe('normal');
        expect(estadoFecha({ estado: 'NUEVA', fecha_comprometida: null }, HOY)).toBeNull();
        expect(estadoFecha(confirmado(null), HOY)).toEqual({ texto: 'Sin fecha', tono: 'sin' });
    });

    it('hoy en la hora local', () => {
        expect(hoyIso(new Date(2026, 9, 5, 23, 30))).toBe('2026-10-05');
    });

    it('el plazo dicho', () => {
        expect(textoPlazo(15, 'taller')).toBe('15 días hábiles (algo va al taller)');
        expect(textoPlazo(1, 'bodega')).toBe('1 día hábil (todo sale de bodega)');
    });
});
