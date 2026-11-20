import { describe, it, expect } from 'vitest';
import { calzaClienta } from '../buscarClienta';

const amanda = { nombres: 'Amanda', apellidos: 'Gómez Soto', rut: '12.345.678-9', email_personal: 'amanda@correo.cl', telefono: '+56966205071' };

describe('buscador de clientes', () => {
    it('encuentra por nombre y apellido, en cualquier orden y sin tildes', () => {
        ['amanda', 'gomez', 'Gómez Amanda', 'amanda soto', 'AMANDA GOMEZ SOTO'].forEach(b => expect(calzaClienta(amanda, b)).toBe(true));
    });

    it('cada palabra tiene que estar', () => {
        expect(calzaClienta(amanda, 'amanda perez')).toBe(false);
    });

    it('el RUT y el teléfono, con o sin puntos', () => {
        expect(calzaClienta(amanda, '12345678')).toBe(true);
        expect(calzaClienta(amanda, '12.345')).toBe(true);
        expect(calzaClienta(amanda, '6620 5071')).toBe(true);
        expect(calzaClienta(amanda, 'amanda@')).toBe(true);
    });

    it('sin nada escrito, todas', () => {
        expect(calzaClienta(amanda, '  ')).toBe(true);
    });
});
