import { post } from '../client.js';

/**
 * Subir una foto a la galería, diciendo siempre en qué terminó.
 *
 * Antes la galería solo miraba la respuesta buena: si el servidor rechazaba la
 * foto, el aviso se quedaba en "Subiendo archivo..." para siempre (reportado
 * 2026-11-24). En producción el caso típico era el tamaño: nginx aceptaba 1 MB
 * (su valor por defecto) y casi toda foto de celular pesa más.
 */

/** El mismo tope que `client_max_body_size` en nginx/conf.d/production.conf. */
export const TAMANO_MAXIMO_MB = 20;

/** Los formatos que acepta el servidor (api/v1/media.py). */
export const FORMATOS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

/**
 * Para el `accept` del campo de archivo. Pedir tipos concretos y no `image/*`
 * hace que el iPhone entregue la foto en JPEG en vez de HEIC.
 */
export const ACEPTA = [...FORMATOS.map(f => `.${f}`), 'image/jpeg', 'image/png', 'image/webp', 'image/gif'].join(',');

const extension = (nombre) => (nombre || '').split('.').pop().toLowerCase();

/** null si se puede enviar; si no, por qué, antes de gastar la subida. */
export const motivoNoSube = (archivo) => {
    if (!FORMATOS.includes(extension(archivo?.name))) {
        return `"${archivo?.name}" no es un formato de imagen que acepte la galería. Usa JPG, PNG, WEBP o GIF.`;
    }
    if (archivo.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
        return `La imagen pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el máximo es ${TAMANO_MAXIMO_MB} MB.`;
    }
    return null;
};

/** Lo que respondió el servidor, en palabras de la tienda. */
export const mensajeDeSubida = (error) => {
    switch (error?.status) {
        case 413: return `La imagen pesa más de lo permitido (${TAMANO_MAXIMO_MB} MB).`;
        case 401: return 'La sesión venció. Vuelve a entrar y sube la imagen otra vez.';
        case 0: return 'No hay conexión con el servidor. Revisa internet y vuelve a intentar.';
        case 524:
        case 504: return 'La subida tardó demasiado. Revisa la conexión y vuelve a intentar.';
        default: return error?.message || 'No se pudo subir la imagen.';
    }
};

/** Devuelve la imagen guardada; si no se pudo, lanza un Error con el mensaje para mostrar. */
export const subirImagen = async (archivo) => {
    const motivo = motivoNoSube(archivo);
    if (motivo) throw new Error(motivo);
    const datos = new FormData();
    datos.append('file', archivo);
    try {
        return await post('/api/v1/media/upload', datos);
    } catch (error) {
        throw new Error(mensajeDeSubida(error));
    }
};
