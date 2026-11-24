import { describe, expect, it } from 'vitest';
import { mensajeDeSubida, motivoNoSube, TAMANO_MAXIMO_MB } from '../subirImagen.api.js';

const archivo = (name, mb) => ({ name, size: mb * 1024 * 1024 });

describe('subir una imagen', () => {
    it('avisa antes de enviar un formato que el servidor no acepta o un archivo muy grande', () => {
        expect(motivoNoSube(archivo('IMG_0001.HEIC', 2))).toMatch(/JPG, PNG, WEBP o GIF/);
        expect(motivoNoSube(archivo('foto.jpg', TAMANO_MAXIMO_MB + 1))).toMatch(/máximo es 20 MB/);
        expect(motivoNoSube(archivo('foto.JPG', 4))).toBeNull();
    });

    it('cada rechazo del servidor tiene su mensaje: nunca queda en "Subiendo"', () => {
        expect(mensajeDeSubida({ status: 413 })).toMatch(/pesa más/);
        expect(mensajeDeSubida({ status: 401 })).toMatch(/sesión venció/);
        expect(mensajeDeSubida({ status: 0 })).toMatch(/conexión/);
        expect(mensajeDeSubida({ status: 400, message: 'Formato de imagen no permitido' })).toBe('Formato de imagen no permitido');
        expect(mensajeDeSubida({ status: 500 })).toBe('No se pudo subir la imagen.');
    });
});
