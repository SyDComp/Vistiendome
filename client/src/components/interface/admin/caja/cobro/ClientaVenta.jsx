import React from 'react';

/** ↑ ↓ pasan de un dato a otro, sin soltar el teclado. */
const moverEntreCampos = (e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const campos = [...e.currentTarget.querySelectorAll('input[type="text"]')];
    const i = campos.indexOf(e.target);
    if (i === -1) return;
    e.preventDefault();
    campos[(i + (e.key === 'ArrowDown' ? 1 : campos.length - 1)) % campos.length].focus();
};

/**
 * Quién compra: sus datos (con el RUT se reconoce a una clienta que ya existe)
 * o "sin datos", si no los quiere dar. Sin datos, la venta queda sin clienta:
 * no se inventa una (decisión del usuario 2026-10-13).
 * En la caja: P alterna, y con ↑ ↓ se pasa de un campo a otro.
 */
const ClientaVenta = ({ sinDatos, clienta, onSinDatos, onCambiar, disabled }) => (
    <fieldset className="vl-bloque" disabled={disabled} onKeyDown={moverEntreCampos}>
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
                            data-clienta={clave}
                            onChange={e => onCambiar({ ...clienta, [clave]: e.target.value })} />
                    </label>
                ))}
            </div>
        )}
    </fieldset>
);

export default ClientaVenta;
