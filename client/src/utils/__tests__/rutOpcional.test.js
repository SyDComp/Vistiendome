import { describe, it, expect } from 'vitest';
import { motivoRutOpcional } from '../rut';

describe('RUT que se puede dejar en blanco', () => {
    it('vacío o válido no tiene motivo; inválido, sí', () => {
        expect(motivoRutOpcional('')).toBeNull();
        expect(motivoRutOpcional('11.111.111-1')).toBeNull();
        expect(motivoRutOpcional('12.345.678-9')).toMatch(/verificador/);
    });
});
