import React from 'react';
import { leerPesos, mostrarPesos } from '../../utils/pesos';

/**
 * Casilla para un monto en pesos: se escribe "52.990" y vale 52990.
 *
 * Reemplaza a las type="number" de los precios, que leían el punto como coma
 * decimal (ver utils/pesos.js). onChange y onBlur reciben el monto ya leído
 * (número, o '' si está vacía), no el evento. Lo demás (className,
 * placeholder, onKeyDown...) pasa tal cual al <input>.
 */
const PrecioInput = ({ value, onChange, onBlur, ...props }) => (
    <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={mostrarPesos(value)}
        onChange={onChange && ((e) => onChange(leerPesos(e.target.value)))}
        onBlur={onBlur && ((e) => onBlur(leerPesos(e.target.value)))}
        {...props}
    />
);

export default PrecioInput;
