import React from 'react';
import { AVISO_SIN_CENTAVOS, agregaComa, leerPesos, mostrarPesos } from '../../utils/pesos';

/**
 * Casilla para un monto en pesos: se escribe "52.990" y vale 52990.
 *
 * Reemplaza a las type="number" de los precios, que leían el punto como coma
 * decimal (ver utils/pesos.js). onChange y onBlur reciben el monto ya leído
 * (número, o '' si está vacía), no el evento. Lo demás (className,
 * placeholder, onKeyDown...) pasa tal cual al <input>.
 *
 * Una coma no se acepta: "52,99" se leería 5.299 sin que nadie lo note. La
 * casilla no cambia y el navegador avisa junto a ella (AVISO_SIN_CENTAVOS).
 */
const PrecioInput = ({ value, onChange, onBlur, ...props }) => {
    const mostrado = mostrarPesos(value);
    const alEscribir = (e) => {
        const campo = e.target;
        if (agregaComa(mostrado, campo.value)) {
            campo.setCustomValidity(AVISO_SIN_CENTAVOS);
            campo.reportValidity();
            return;
        }
        campo.setCustomValidity('');
        if (onChange) onChange(leerPesos(campo.value));
    };
    return (
        <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={mostrado}
            onChange={alEscribir}
            onBlur={onBlur && ((e) => onBlur(leerPesos(e.target.value)))}
            {...props}
        />
    );
};

export default PrecioInput;
