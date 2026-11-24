import { describe, it, expect } from 'vitest';
import { ordenarGaleria } from '../ordenGaleria';

const fotos = [
    { id: 3, filename: 'a.jpg' },
    { id: 10, filename: 'z.jpg' },
    { id: 7, filename: 'm.jpg' },
];

describe('orden de la galería', () => {
    it('va de la más reciente a la más antigua, no por nombre', () => {
        expect(ordenarGaleria(fotos).map(f => f.id)).toEqual([10, 7, 3]);
    });

    it('las ya elegidas van primero, y entre ellas también la más reciente arriba', () => {
        expect(ordenarGaleria(fotos, new Set([3, 7])).map(f => f.id)).toEqual([7, 3, 10]);
    });

    it('no modifica la lista que recibe', () => {
        const copia = [...fotos];
        ordenarGaleria(fotos);
        expect(fotos).toEqual(copia);
    });
});
