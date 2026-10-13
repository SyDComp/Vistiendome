import React from 'react';

/**
 * Quién compra: sus datos (con el RUT se reconoce a una clienta que ya existe)
 * o "sin datos", si no los quiere dar. Sin datos, la venta queda sin clienta:
 * no se inventa una (decisión del usuario 2026-10-13).
 */
const ClientaVenta = ({ sinDatos, clienta, onSinDatos, onCambiar, disabled }) => (
    <fieldset className="vl-bloque" disabled={disabled}>
        <legend className="vl-titulo">¿Quién compra?</legend>
        <div className="vl-opciones">
            <label><input type="radio" checked={sinDatos} onChange={() => onSinDatos(true)} /> Sin datos</label>
            <label><input type="radio" checked={!sinDatos} onChange={() => onSinDatos(false)} /> Con sus datos</label>
        </div>
        {!sinDatos && (
            <div className="vl-campos">
                {[
                    ['rut', 'RUT', 'Ej: 12.345.678-9'],
                    ['nombres', 'Nombre', ''],
                    ['apellidos', 'Apellido', ''],
                    ['telefono', 'Teléfono', '+569…'],
                ].map(([clave, etiqueta, ayuda]) => (
                    <label key={clave} className="sp-pago-campo">
                        {etiqueta}
                        <input type="text" className="sp-select" placeholder={ayuda} value={clienta[clave] || ''}
                            onChange={e => onCambiar({ ...clienta, [clave]: e.target.value })} />
                    </label>
                ))}
            </div>
        )}
    </fieldset>
);

export default ClientaVenta;
