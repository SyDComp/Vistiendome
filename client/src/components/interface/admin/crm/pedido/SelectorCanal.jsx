import React from 'react';
import useCanalesPedido from '../../../../../hooks/useCanalesPedido';
import './pedido.css';

/**
 * Elegir "¿Cómo llegó?" entre las opciones de Ajustes del negocio.
 *
 * Si el pedido ya tiene un valor que hoy no está en la lista (se quitó esa
 * opción), igual se muestra: el pedido sigue diciendo lo que decía.
 */
const SelectorCanal = ({ id, value, onChange, required = false, disabled = false, className = 'sp-select' }) => {
    const { canales, cargando, error } = useCanalesPedido();
    const opciones = value && !canales.includes(value) ? [value, ...canales] : canales;

    if (error) {
        return <p className="sp-aviso sp-aviso--error" role="alert">{error}</p>;
    }

    return (
        <select
            id={id}
            className={className}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            disabled={disabled || cargando}
        >
            <option value="" disabled>{cargando ? 'Cargando opciones…' : '— Elige cómo llegó —'}</option>
            {opciones.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
    );
};

export default SelectorCanal;
