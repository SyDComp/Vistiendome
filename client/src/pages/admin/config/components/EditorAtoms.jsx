import React from 'react';
import '../SectionsEditor.css'; // Ensure styles are available

export const EditorInput = ({ label, value, onChange, placeholder, className = '', type = 'text', ...props }) => (
    <div className={`option-group ${className}`}>
        {label && <label>{label}</label>}
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="element-input-text"
            {...props}
        />
    </div>
);

export const EditorSelect = ({ label, value, onChange, options = [], className = '', ...props }) => (
    <div className={`option-group ${className}`}>
        {label && <label>{label}</label>}
        <select
            value={value}
            onChange={onChange}
            className="element-input-text"
            {...props}
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    </div>
);

export const EditorColorPicker = ({ label, value, onChange, title, className = '' }) => (
    <div className={`option-group ${className}`}>
        {label && <label>{label}</label>}
        <div className="color-input-container">
            <input
                type="color"
                value={value || '#ff0000'}
                onChange={onChange}
                title={title || label}
            />
            <span className="value-display">{value || '#ff0000'}</span>
        </div>
    </div>
);

export const EditorButton = ({ children, onClick, className = '', variant = 'secondary', ...props }) => (
    <button
        onClick={onClick}
        className={`btn-editor ${variant} ${className}`}
        {...props}
        style={{
            padding: '0.4rem 0.8rem',
            borderRadius: '4px',
            border: '1px solid #cbd5e0',
            background: variant === 'danger' ? '#fff5f5' : '#fff',
            color: variant === 'danger' ? '#e53e3e' : '#4a5568',
            borderColor: variant === 'danger' ? '#fed7d7' : '#cbd5e0',
            cursor: 'pointer',
            fontSize: '0.9rem',
            transition: 'all 0.2s',
            ...props.style
        }}
    >
        {children}
    </button>
);

export const EditorRange = ({ label, value, onChange, min = 0, max = 100, step = 1, unit = '', className = '' }) => {
    const handleIncrement = (dir) => {
        const newValue = parseFloat((parseFloat(value) + (dir * step)).toFixed(2));
        if (newValue >= min && newValue <= max) {
            onChange({ target: { value: newValue } });
        }
    };

    // Hold functionality
    const intervalRef = React.useRef(null);
    const startHolding = (dir) => {
        handleIncrement(dir);
        intervalRef.current = setInterval(() => handleIncrement(dir), 100);
    };
    const stopHolding = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    };

    return (
        <div className={`editor-range-container ${className}`} onMouseDown={(e) => e.stopPropagation()}>
            <div className="range-header">
                <label>{label}</label>
                <span className="range-value">{value}{unit}</span>
            </div>
            <div className="range-controls">
                <button
                    type="button"
                    className="btn-range-adjust"
                    onMouseDown={() => startHolding(-1)}
                    onMouseUp={stopHolding}
                    onMouseLeave={stopHolding}
                >−</button>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={onChange}
                    onDragStart={(e) => e.stopPropagation()}
                    className="editor-slider"
                />
                <button
                    type="button"
                    className="btn-range-adjust"
                    onMouseDown={() => startHolding(1)}
                    onMouseUp={stopHolding}
                    onMouseLeave={stopHolding}
                >+</button>
            </div>
        </div>
    );
};
