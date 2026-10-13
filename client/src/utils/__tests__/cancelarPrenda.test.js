import { describe, it, expect } from 'vitest';
import { activas, avisoCancelarPrenda } from '../cancelarPrenda';

const prenda = (extra) => ({ cantidad: 1, sku_name: 'Bolero', ...extra });

describe('avisoCancelarPrenda', () => {
    it('lo hecho del catálogo vuelve a bodega', () => {
        expect(avisoCancelarPrenda(prenda({ cortado: true, sku_id: 3 }))).toContain('entra a bodega');
    });

    it('lo hecho personalizado queda en Piezas únicas', () => {
        expect(avisoCancelarPrenda(prenda({ cortado: true, sku_id: null }))).toContain('Piezas únicas');
    });

    it('si hay una orden de corte, dice que irá al terminarla', () => {
        const aviso = avisoCancelarPrenda(prenda({ camino: 'TALLER', sku_id: null }), { produccion: { ordenes: [{ numero: 2 }] } });
        expect(aviso).toContain('cuando la termine irá a Piezas únicas');
    });

    it('lo apartado se libera, y una pieza única vuelve a estar disponible', () => {
        expect(avisoCancelarPrenda(prenda({ camino: 'BODEGA', sku_id: 1 }))).toContain('queda libre');
        expect(avisoCancelarPrenda(prenda({ camino: 'BODEGA', pieza_numero: 4 }))).toContain('pieza única N° 4');
    });

    it('siempre avisa que no se deshace y pregunta', () => {
        expect(avisoCancelarPrenda(prenda({}))).toBe(
            'La cancelación no se deshace: si hace falta, se agrega de nuevo. ¿Cancelar 1× Bolero?');
    });
});

describe('activas', () => {
    it('deja fuera las canceladas', () => {
        expect(activas([{ id: 1 }, { id: 2, cancelada_en: '2026-10-13' }])).toEqual([{ id: 1 }]);
    });
});
