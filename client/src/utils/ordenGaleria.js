/**
 * Orden de la galería: primero las fotos ya elegidas (al elegir para un
 * producto se ve de un vistazo qué tiene), y después de la más reciente a la
 * más antigua.
 *
 * Antes el resto iba por nombre de archivo, y eso deshacía el orden por fecha
 * que ya manda el servidor (api/v1/media.py): la foto recién subida quedaba
 * perdida en el medio. Se ordena por id descendente, que crece con cada
 * subida, para que valga igual con las imágenes que pasa un producto
 * (itemsPool), que no vienen ordenadas.
 */
export const ordenarGaleria = (imagenes, elegidas = new Set()) =>
    [...imagenes].sort((a, b) => {
        const aElegida = elegidas.has(a.id);
        const bElegida = elegidas.has(b.id);
        if (aElegida !== bElegida) return aElegida ? -1 : 1;
        return (b.id ?? 0) - (a.id ?? 0);
    });
