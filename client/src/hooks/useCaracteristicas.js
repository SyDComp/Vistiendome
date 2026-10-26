import { useSyncExternalStore } from 'react';
import { getAdminAttributes } from '../lib/api/endpoints';

/**
 * Las características del catálogo (Talla, Color, Cuello…), con sus opciones
 * y en el orden de la tienda. Se piden una vez por sesión y las comparten
 * todas las pantallas: casi nunca cambian. Quien las cambia (Características)
 * llama a `refrescarCaracteristicas()` y todas se actualizan.
 *
 * Devuelve la lista, o `null` mientras no llega (o si no se pudo pedir).
 * `null` no es "ninguna": cada uso decide qué mostrar mientras tanto.
 */
let lista = null;
let pidiendo = null;
const oyentes = new Set();

const avisar = () => oyentes.forEach(oyente => oyente());

export const refrescarCaracteristicas = () => {
    pidiendo = getAdminAttributes()
        .then(nuevas => { lista = nuevas || []; })
        .catch(() => { pidiendo = null; })
        .finally(avisar);
    return pidiendo;
};

const suscribir = (oyente) => {
    oyentes.add(oyente);
    if (!lista && !pidiendo) refrescarCaracteristicas();
    return () => oyentes.delete(oyente);
};

const leer = () => lista;

export default function useCaracteristicas() {
    return useSyncExternalStore(suscribir, leer);
}
