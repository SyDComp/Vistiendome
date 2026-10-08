/**
 * El mensaje que se le muestra a la persona cuando el servidor rechaza algo.
 *
 * El servidor responde `detail` de dos formas: un texto ("Falta indicar cómo
 * llegó el pedido") o, cuando no pasa una validación de datos, una lista de
 * errores ({msg, loc...}). Mostrar la lista tal cual pintaba "[object Object]"
 * en vez de "La variante X no tiene precio".
 */
export const mensajeDeError = (detail, porDefecto = 'No se pudo guardar') => {
    if (!detail) return porDefecto;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
        const mensajes = detail
            .map(d => (typeof d === 'string' ? d : d?.msg))
            .filter(Boolean)
            // Pydantic antepone "Value error, " a los mensajes propios.
            .map(m => m.replace(/^Value error,\s*/, ''));
        return mensajes.length ? [...new Set(mensajes)].join(' · ') : porDefecto;
    }
    return detail.msg || porDefecto;
};
