import { useState } from 'react';
import './Input.css';

export default function Input({
    label,
    type = 'text',
    name,
    placeholder,
    value,
    onChange,
    error,
    required = false,
    disabled = false,
    icon,
    ...props
}) {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div className="input-wrapper">
            {label && (
                <label className="input-label">
                    {label}
                    {required && <span className="input-required">*</span>}
                </label>
            )}

            <div className={`input-container ${isFocused ? 'input-container--focused' : ''} ${error ? 'input-container--error' : ''}`}>
                {icon && <span className="input-icon">{icon}</span>}
                <input
                    type={type}
                    name={name}
                    className="input-field"
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    disabled={disabled}
                    {...props}
                />
            </div>

            {error && <span className="input-error">{error}</span>}
        </div>
    );
}
