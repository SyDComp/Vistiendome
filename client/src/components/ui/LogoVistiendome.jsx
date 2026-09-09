import React from 'react';
import './LogoVistiendome.css';

/**
 * El logo de Vistiendomé, hecho con texto: "Vistiendo" + la M en una caja
 * negra + la é.
 *
 * Es tipográfico a propósito, no una imagen: se ve nítido en cualquier
 * pantalla y a cualquier tamaño, pesa cero, se puede seleccionar y buscar, y
 * hereda el color de donde se lo ponga.
 *
 * TODO SE MIDE EN `em`, así que una sola propiedad —el tamaño— escala la caja,
 * los espacios y las letras juntos. En el original todo estaba en píxeles fijos
 * y cambiar el tamaño desarmaba la proporción. Los estilos están en
 * LogoVistiendome.css, no acá dentro.
 *
 *   <LogoVistiendome/>                        el del sitio
 *   <LogoVistiendome tamano="1.4rem" />        más chico, todo se ajusta solo
 *   <LogoVistiendome invertido />              sobre fondo oscuro
 *
 * Sobre la tipografía: se controla con `--logo-fuente`. Cooper Black NO es una
 * fuente web — viene con Office, así que la tiene quien la tiene. Poniéndola
 * sola, la mayoría de las visitas verían la de reserva. Por eso la reserva es
 * la fuente que ya usa el sitio y no una cualquiera: si Cooper Black no está,
 * el logo sigue siendo el de la marca.
 */
const LogoVistiendome = ({
    tamano = '1.8rem',
    invertido = false,
    className = '',
    ...props
}) => (
    <span
        className={`logo-vm ${invertido ? 'logo-vm--invertido' : ''} ${className}`}
        style={{ fontSize: tamano }}
        // Para quien lo lea en voz alta o lo busque: una sola palabra, no tres.
        aria-label="Vistiendomé"
        {...props}
    >
        <span aria-hidden="true">Vistiendo</span>
        <span className="logo-vm__caja" aria-hidden="true">M</span>
        <span aria-hidden="true">é</span>
    </span>
);

export default LogoVistiendome;
