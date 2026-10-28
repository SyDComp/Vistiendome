/**
 * Los instantes que manda el servidor (created_at, ocurrido_at…) están en
 * UTC pero llegan sin la zona: "2026-10-28T04:51:00". `new Date()` los lee
 * como hora local, y así la boleta salía con la hora UTC, 3 horas corrida
 * (el cierre estaba bien: ese ya viene convertido por el servidor).
 *
 * Aquí se leen como UTC y se muestran en la hora de Chile, sin depender de
 * la zona configurada en el computador que los muestra.
 */

export const ZONA = 'America/Santiago';

/** El instante del servidor como Date. Si ya trae zona (Z o -03:00), se respeta. */
export const desdeServidor = (texto) => {
    if (!texto) return null;
    if (texto instanceof Date) return texto;
    const conZona = /(Z|[+-]\d{2}:?\d{2})$/.test(texto);
    return new Date(conZona ? texto : `${texto}Z`);
};

/** Un formateador en la hora de Chile: `enChile({ dateStyle: 'medium' })`. */
export const enChile = (opciones) => new Intl.DateTimeFormat('es-CL', { ...opciones, timeZone: ZONA });

const SOLO_FECHA = enChile({ day: '2-digit', month: '2-digit', year: 'numeric' });

/** "28-10-2026" del instante del servidor, en Chile. */
export const fechaDe = (texto) => {
    const d = desdeServidor(texto);
    return d ? SOLO_FECHA.format(d) : '';
};
