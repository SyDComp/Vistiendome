import { describe, it, expect } from 'vitest';
import { avisoVolverAtras } from '../volverAtras';

const confirmado = {
    estado: 'CONFIRMADA',
    items: [
        { camino: 'BODEGA', cortado: false },
        { camino: 'TALLER', cortado: true },
        { camino: 'TALLER', cortado: false },
    ],
    produccion: { ordenes: [{ numero: 12 }] },
};

describe('avisoVolverAtras', () => {
    it('dice lo hecho, la orden, lo que se libera y que nada se pierde', () => {
        const aviso = avisoVolverAtras(confirmado, 'EN_CONVERSACION');
        expect(aviso).toContain('ya tiene 1 de 3 prendas hechas en el taller');
        expect(aviso).toContain('la orden de corte N° 12');
        expect(aviso).toContain('Lo apartado en bodega (1 prenda) queda libre');
        expect(aviso).toContain('Lo ya hecho no se pierde');
        expect(aviso.endsWith('¿Volver atrás?')).toBe(true);
    });

    it('al cancelar pregunta por cancelar', () => {
        expect(avisoVolverAtras(confirmado, 'CANCELADA').endsWith('¿Cancelar el pedido?')).toBe(true);
    });

    it('sin nada hecho igual avisa que se vuelve a decidir', () => {
        const aviso = avisoVolverAtras({ estado: 'CONFIRMADA', items: [{ camino: 'TALLER' }] }, 'NUEVA');
        expect(aviso).toBe('Al confirmar de nuevo se vuelve a decidir de dónde sale cada prenda. ¿Volver atrás?');
    });

    it('fuera de Confirmada, o hacia el despacho, no avisa', () => {
        expect(avisoVolverAtras({ estado: 'NUEVA', items: [] }, 'CANCELADA')).toBeNull();
        expect(avisoVolverAtras(confirmado, 'DESPACHADA')).toBeNull();
    });
});
