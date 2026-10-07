/**
 * Los estados de un pedido, con su significado, en un solo lugar.
 *
 * El `significa` no es documentación suelta: se pinta en el glosario de la
 * pantalla. Antes el glosario estaba escrito aparte y decía de EN PROCESO
 * "contactando al cliente O armando pedido" — dos cosas en una línea. Teniendo
 * el texto acá, el que cambia un estado ve lo que va a leer la clienta.
 *
 * Regla con la que se eligieron: un estado existe sólo si alguien tiene que
 * declararlo Y algo depende de él. Por eso no hay "en corte": eso lo sabe el
 * sistema solo, y se muestra derivado.
 */
export const ESTADOS = [
    { value: 'NUEVA', label: 'NUEVA', color: '#10b981', bg: '#ecfdf5',
      significa: 'Llegó y todavía nadie la revisó.' },
    { value: 'EN_CONVERSACION', label: 'EN CONVERSACIÓN', color: '#f59e0b', bg: '#fef3c7',
      significa: 'Hablando con la clienta: tallas, precio, plazos.' },
    { value: 'CONFIRMADA', label: 'CONFIRMADA', color: '#3b82f6', bg: '#eff6ff',
      significa: 'La clienta aceptó. Recién acá las piezas entran a la orden de corte.' },
    { value: 'DESPACHADA', label: 'DESPACHADA', color: '#7c3aed', bg: '#f5f3ff',
      // En un retiro la palabra correcta es "entregada": nadie la despachó, la
      // clienta vino a buscarla. El hecho que registra el estado es el mismo
      // —la prenda salió del local— y por eso es un solo valor con dos nombres.
      etiquetaRetiro: 'ENTREGADA',
      significa: 'Salió del local. Acá se descuenta del stock, no antes. En un retiro se llama ENTREGADA.' },
    { value: 'CANCELADA', label: 'CANCELADA', color: '#ef4444', bg: '#fef2f2',
      significa: 'No se concretó, o un pedido confirmado se cayó.' },
];

/** El nombre que se muestra: en un retiro, DESPACHADA se dice ENTREGADA. */
export const etiquetaEstado = (estado, modoEntrega) => {
    const e = ESTADOS.find(s => s.value === estado);
    if (!e) return estado;
    return modoEntrega === 'RETIRO' && e.etiquetaRetiro ? e.etiquetaRetiro : e.label;
};
