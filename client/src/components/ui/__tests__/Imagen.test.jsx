import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// Lo que se prueba acá no es que salga un <img>: es CUÁNDO sale.
// Si se pintara antes de tener las derivadas, el navegador ya habría empezado
// a bajar el original y todo el mecanismo no serviría de nada. Ese error no se
// ve mirando la pantalla — la foto igual aparece — sólo se ve en la red.
const mapaFalso = {
    '/media/foto.jpg': '/media/derivadas/foto_sm.webp 400w, /media/derivadas/foto_md.webp 800w',
};

let resolverMapa;
let rechazarMapa;

vi.mock('../../../lib/api/endpoints/index.js', () => ({
    getImageUrl: (p) => p || '',
    getSrcSet: (s) => s || '',
    getMapaSrcsets: () => new Promise((res, rej) => { resolverMapa = res; rechazarMapa = rej; }),
}));

const importarLimpio = async () => {
    // El mapa se guarda en una variable del módulo para que la segunda imagen
    // no espere. Eso mismo hace que las pruebas se contaminen entre sí, así que
    // cada una parte con el módulo recién importado.
    vi.resetModules();
    return (await import('../Imagen.jsx')).default;
};

describe('Imagen', () => {
    beforeEach(() => { resolverMapa = null; rechazarMapa = null; });
    afterEach(() => { vi.clearAllMocks(); });

    it('no pinta la imagen antes de conocer sus derivadas', async () => {
        const Imagen = await importarLimpio();
        render(<Imagen url="/media/foto.jpg" alt="prueba" sizes="70px" />);
        expect(document.querySelector('img')).toBeNull();

        resolverMapa(mapaFalso);
        await waitFor(() => expect(document.querySelector('img')).not.toBeNull());
        const img = screen.getByAltText('prueba');
        expect(img.getAttribute('srcset')).toContain('foto_sm.webp 400w');
        expect(img.getAttribute('sizes')).toBe('70px');
        expect(img.getAttribute('loading')).toBe('lazy');
    });

    it('si el payload ya trae el srcset, pinta de inmediato y no pide el mapa', async () => {
        const Imagen = await importarLimpio();
        render(<Imagen url="/media/otra.jpg" srcset="/media/derivadas/otra_sm.webp 400w" alt="directa" />);
        const img = screen.getByAltText('directa');
        expect(img.getAttribute('srcset')).toContain('otra_sm.webp 400w');
        expect(resolverMapa).toBeNull(); // nadie llamó al mapa
    });

    it('si el mapa falla, muestra el original en vez de dejar el hueco', async () => {
        const Imagen = await importarLimpio();
        render(<Imagen url="/media/foto.jpg" alt="caida" />);
        rechazarMapa(new Error('sin red'));
        await waitFor(() => expect(screen.getByAltText('caida')).toBeTruthy());
        expect(screen.getByAltText('caida').getAttribute('src')).toBe('/media/foto.jpg');
        expect(screen.getByAltText('caida').getAttribute('srcset')).toBeNull();
    });

    it('una URL externa no espera nada', async () => {
        const Imagen = await importarLimpio();
        render(<Imagen url="https://ejemplo.cl/x.jpg" alt="externa" />);
        expect(screen.getByAltText('externa')).toBeTruthy();
        expect(resolverMapa).toBeNull();
    });
});
