import { describe, it, expect } from 'vitest';
import { cumpleExistencia, umbralValido, ordenar, siguienteOrden } from '../existencias';
import { problemaAlSumar, filasDelConteo, problemaAlContar } from '../enBloque';

const filas = [
    { sku_id: 1, sku: 'A', current_stock: 5, apartado: 0, disponible: 5 },
    { sku_id: 2, sku: 'B', current_stock: 2, apartado: 2, disponible: 0 },
    { sku_id: 3, sku: 'C', current_stock: 0, apartado: 1, disponible: -1 },
];

describe('filtrar por existencias (mira disponible)', () => {
    it('sin stock incluye las que faltan, con stock solo las positivas', () => {
        expect(filas.filter(f => cumpleExistencia(f, 'sin', null)).map(f => f.sku)).toEqual(['B', 'C']);
        expect(filas.filter(f => cumpleExistencia(f, 'con', null)).map(f => f.sku)).toEqual(['A']);
    });

    it('hasta N incluye el N, y sin número no filtra', () => {
        expect(filas.filter(f => cumpleExistencia(f, 'hasta', 0)).map(f => f.sku)).toEqual(['B', 'C']);
        expect(filas.filter(f => cumpleExistencia(f, 'hasta', 5))).toHaveLength(3);
        expect(filas.filter(f => cumpleExistencia(f, 'hasta', umbralValido('')))).toHaveLength(3);
        expect(umbralValido('-1')).toBeNull();
        expect(umbralValido('2.5')).toBeNull();
    });
});

describe('ordenar', () => {
    it('asc, desc y sin orden; no toca el arreglo original', () => {
        expect(ordenar(filas, { columna: 'disponible', sentido: 'asc' }).map(f => f.sku)).toEqual(['C', 'B', 'A']);
        expect(ordenar(filas, { columna: 'disponible', sentido: 'desc' }).map(f => f.sku)).toEqual(['A', 'B', 'C']);
        expect(ordenar(filas, null)).toBe(filas);
        expect(siguienteOrden(null, 'apartado')).toEqual({ columna: 'apartado', sentido: 'asc' });
        expect(siguienteOrden({ columna: 'apartado', sentido: 'asc' }, 'apartado').sentido).toBe('desc');
        expect(siguienteOrden({ columna: 'apartado', sentido: 'desc' }, 'apartado')).toBeNull();
    });
});

describe('movimiento en bloque', () => {
    it('una merma que no alcanza en alguna avisa antes de mandar', () => {
        expect(problemaAlSumar({ filas, tipo: 'merma', cantidad: 3, motivo: 'x' })).toMatch(/2 variante/);
        expect(problemaAlSumar({ filas, tipo: 'ingreso', cantidad: 3, motivo: '' })).toMatch(/motivo/);
        expect(problemaAlSumar({ filas, tipo: 'ingreso', cantidad: 3, motivo: 'Llegó' })).toBe('');
    });

    it('el conteo manda solo lo contado, con lo que había en bodega', () => {
        const contados = { 1: '4', 2: '', 3: '0' };
        expect(filasDelConteo(filas, contados)).toEqual([
            { sku_id: 1, esperado: 5, contado: 4 },
            { sku_id: 3, esperado: 0, contado: 0 },
        ]);
        expect(problemaAlContar({ filas, contados: { 1: '-2' }, motivo: 'x' })).toMatch(/número entero/);
        expect(problemaAlContar({ filas, contados: {}, motivo: 'x' })).toMatch(/al menos una/);
        expect(problemaAlContar({ filas, contados, motivo: 'Inventario' })).toBe('');
    });
});
