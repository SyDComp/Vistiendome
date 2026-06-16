import React from 'react';
import './Button.css';

/**
 * Atomo visual para Botones con soporte nativo de estados de carga.
 * 
 * @param {string} type - nativo type ("button", "submit")
 * @param {string} variant - "primary", "secondary", "danger" (Clases base para CSS)
 * @param {boolean} isLoading - Muestra loader internamente y desactiva el botón
 */
const Button = ({
    children,
    type = 'button',
    variant = 'primary',
    isLoading = false,
    disabled = false,
    className = '',
    onClick,
    ...props
}) => {
    
    return (
        <button
            type={type}
            disabled={disabled || isLoading}
            className={`ui-btn ui-btn-${variant} ${className} ${isLoading ? 'ui-btn-loading' : ''}`}
            onClick={onClick}
            {...props}
        >
            {isLoading ? (
                <span className="ui-loader"></span>
            ) : null}
            <span className={isLoading ? 'ui-btn-text-hidden' : ''}>{children}</span>
        </button>
    );
};

export default Button;
