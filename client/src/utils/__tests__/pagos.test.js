import { describe, it, expect } from 'vitest';
import { montoDesde, textoSaldo } from '../pagos';

describe('pagos', () => {
    it('dice cuánto falta, o si se pagó de más', () => {
        expect(textoSaldo({ saldo: 12000 })).toMatch(/^Falta \$\s?12\.000$/);
        expect(textoSaldo({ saldo: -3000 })).toMatch(/^Pagado de más: \$\s?3\.000$/);
        expect(textoSaldo({ saldo: 0 })).toBeNull();
        expect(textoSaldo({ saldo: 0, por_cotizar: 1 })).toBe('Falta lo que esté por cotizar');
        expect(textoSaldo({ saldo: 5000, por_cotizar: 1 })).toMatch(/y lo que esté por cotizar/);
    });

    it('lee el monto como se escribe en Chile', () => {
        expect(montoDesde('12.000')).toBe(12000);
        expect(montoDesde('$ 8000')).toBe(8000);
        expect(montoDesde('0')).toBeNull();
        expect(montoDesde('')).toBeNull();
    });
});
