/** Los estados de una orden de corte. También los usa la historia del pedido. */
export const ESTADOS = [
    { value: 'PENDIENTE', label: 'Pendiente', color: '#64748b', bg: '#f1f5f9' },
    { value: 'EN_PROCESO', label: 'En proceso', color: '#b45309', bg: '#fef3c7' },
    { value: 'FINALIZADA', label: 'Finalizada', color: '#15803d', bg: '#dcfce7' },
    { value: 'CANCELADA', label: 'Cancelada', color: '#b91c1c', bg: '#fee2e2' },
];

export const estiloEstado = (e) => ESTADOS.find(x => x.value === e) || ESTADOS[0];
