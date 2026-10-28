import { describe, it, expect } from 'vitest';
import { desdeServidor, enChile, fechaDe } from '../fechaServidor';

const HORA = enChile({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

describe('fecha del servidor', () => {
    it('lo que llega sin zona es UTC, y se muestra en la hora de Chile', () => {
        // 13:51 UTC del 28-10-2026 son las 10:51 en Chile (horario de verano, UTC−3).
        expect(HORA.format(desdeServidor('2026-10-28T13:51:00.123456'))).toBe('10:51');
    });

    it('lo que ya trae zona se respeta', () => {
        expect(HORA.format(desdeServidor('2026-10-28T10:51:00-03:00'))).toBe('10:51');
        expect(HORA.format(desdeServidor('2026-10-28T13:51:00Z'))).toBe('10:51');
    });

    it('cerca de medianoche, la fecha es la de Chile, no la de UTC', () => {
        expect(fechaDe('2026-10-29T01:30:00')).toBe('28-10-2026');   // 22:30 del 28 en Chile
        expect(fechaDe(null)).toBe('');
    });
});
