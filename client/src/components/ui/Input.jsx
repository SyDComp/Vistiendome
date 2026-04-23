import React from 'react';
import './ui.css';

/**
 * Atomo visual para Inputs. Unifica el renderizado de etiquetas y errores de validación.
 */
const Input = ({
    label,
    name,
    type = 'text',
    error,
    value,
    onChange,
    placeholder = '',
    required = false,
    className = '',
    ...props
}) => {
    
    return (
        <div className={`ui-input-group ${error ? 'has-error' : ''} ${className}`}>
            {label && (
                <label className="ui-label" htmlFor={name}>
                    {label} {required && <span className="ui-required-mark">*</span>}
                </label>
            )}
            
            <input
                id={name}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className="ui-input"
                {...props}
            />
            
            {error && (
                <span className="ui-error-text">{error}</span>
            )}
        </div>
    );
};

export default Input;
