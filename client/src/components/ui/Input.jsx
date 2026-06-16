import React from 'react';
import '../../styles/components/Input.css';

/**
 * Atomo visual para Inputs Premium.
 * Soporta renderizado especial interactivo para type="color".
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
        <div className={`premium-input-group ${className}`}>
            {label && (
                <label className="premium-label" htmlFor={name}>
                    {label} {required && <span className="ui-required-mark">*</span>}
                </label>
            )}
            
            {type === 'color' ? (
                <div className="premium-color-wrapper">
                    <div className="premium-color-square" style={{ background: value || '#000' }}>
                        <input 
                            type="color" 
                            name={name}
                            value={value || '#000000'} 
                            onChange={onChange}
                            className="premium-color-native"
                        />
                    </div>
                    <input 
                        type="text" 
                        name={`${name}_text`}
                        value={value || ''}
                        onChange={onChange}
                        placeholder="#000000"
                        className="premium-input premium-color-text"
                        {...props}
                    />
                </div>
            ) : (
                <input
                    id={name}
                    name={name}
                    type={type}
                    value={value || ''}
                    onChange={onChange}
                    placeholder={placeholder}
                    className="premium-input"
                    {...props}
                />
            )}
            
            {error && (
                <span className="ui-error-text">{error}</span>
            )}
        </div>
    );
};

export default Input;
