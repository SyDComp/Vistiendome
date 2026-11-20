/**
 * El buscador de Clientes: cada palabra escrita tiene que aparecer en algún
 * dato de la clienta, en cualquier orden. "Gómez Amanda", "amanda gomez" y
 * "gomez" la encuentran igual. Antes miraba solo los nombres, completos y en
 * ese orden: el apellido no servía (reportado por QA 2026-11-20).
 *
 * Sin tildes ni mayúsculas, y el RUT y el teléfono también sin puntos, guion
 * ni espacios: "12345678" encuentra a "12.345.678-9".
 */

const plano = (texto) => String(texto ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const soloDigitos = (texto) => String(texto ?? '').replace(/[^0-9kK]/g, '').toLowerCase();

export const calzaClienta = (cliente, busqueda) => {
    const palabras = plano(busqueda).split(/\s+/).filter(Boolean);
    if (!palabras.length) return true;
    const datos = plano([cliente.nombres, cliente.apellidos, cliente.rut, cliente.email_personal, cliente.telefono].join(' '));
    const numeros = `${soloDigitos(cliente.rut)} ${soloDigitos(cliente.telefono)}`;
    return palabras.every(p => datos.includes(p) || (soloDigitos(p) && numeros.includes(soloDigitos(p))));
};
