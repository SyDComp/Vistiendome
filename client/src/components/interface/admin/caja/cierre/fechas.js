/** Fechas del cierre como texto 'AAAA-MM-DD' (la del día en Chile la decide el servidor). */

export const otroDia = (iso, dias) => {
    const [a, m, d] = iso.split('-').map(Number);
    const f = new Date(Date.UTC(a, m - 1, d + dias));
    return f.toISOString().slice(0, 10);
};

/** "lunes 26-10-2026" */
export const fechaLarga = (iso) => {
    const [a, m, d] = iso.split('-').map(Number);
    const dia = new Date(Date.UTC(a, m - 1, d)).toLocaleDateString('es-CL', { weekday: 'long', timeZone: 'UTC' });
    return `${dia} ${String(d).padStart(2, '0')}-${String(m).padStart(2, '0')}-${a}`;
};

/** "15:32" de un instante ISO, en la hora de Chile. */
export const hora = (instante) => new Date(instante).toLocaleTimeString('es-CL', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago',
});
