import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';

/**
 * Armar una pieza que NO está en el catálogo.
 *
 * POR QUÉ NO ALCANZA CON UN NOMBRE
 * Antes esto eran dos `prompt()` —nombre y precio— y la pieza entraba al pedido
 * como un texto suelto. Pero un encargo especial se corta igual que cualquier
 * otra prenda: la costurera necesita la talla, el color, el cuello. Con un
 * nombre y nada más, esa pieza llegaba a la orden de corte sin nada con que
 * confeccionarla.
 *
 * Las características que se ofrecen son las MISMAS del catálogo, no un texto
 * libre: si mañana la clienta agrega "Forro", aparece acá sola. Y así la
 * planilla del taller muestra una pieza personalizada en las mismas columnas
 * que el resto, sin distinguir de dónde salió.
 */
const ItemPersonalizadoForm = ({ atributos = {}, onAgregar, onCancelar }) => {
    const [nombre, setNombre] = useState('');
    const [precio, setPrecio] = useState('');
    const [config, setConfig] = useState({});

    const etiqueta = { display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' };
    const campo = { width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' };

    const elegir = (clave, valor) => setConfig(prev => {
        const n = { ...prev };
        if (valor) n[clave] = valor; else delete n[clave];
        return n;
    });

    const agregar = () => {
        const limpio = nombre.trim();
        if (!limpio) return;
        onAgregar({
            nombre: limpio,
            precio: parseFloat(precio) || 0,
            // Sólo lo que se eligió. Una característica en blanco no se guarda:
            // "sin especificar" y "no aplica" no son lo mismo para quien corta.
            config,
        });
    };

    const claves = Object.keys(atributos);

    return (
        <div style={{ border: '1px solid #f0abfc', background: '#fdf4ff', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <strong style={{ fontSize: '13px', color: '#86198f' }}>Pieza personalizada</strong>
                <button type="button" onClick={onCancelar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex' }}>
                    <X size={16} />
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                    <label style={etiqueta}>Qué es *</label>
                    <input
                        style={campo} value={nombre} onChange={e => setNombre(e.target.value)}
                        placeholder="Ej: Vestido a medida para matrimonio"
                        autoFocus
                    />
                </div>

                <div>
                    <label style={etiqueta}>Precio unitario ($)</label>
                    <input type="number" min="0" style={campo} value={precio}
                        onChange={e => setPrecio(e.target.value)} placeholder="25000" />
                </div>

                {claves.map(clave => (
                    <div key={clave}>
                        <label style={etiqueta}>{clave}</label>
                        <select style={campo} value={config[clave] || ''} onChange={e => elegir(clave, e.target.value)}>
                            <option value="">— sin especificar —</option>
                            {(atributos[clave] || []).map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                ))}
            </div>

            {!claves.length && (
                <p style={{ fontSize: '12px', color: '#a16207', margin: '10px 0 0' }}>
                    No se pudieron cargar las características del catálogo. La pieza se puede
                    agregar igual, pero llegará al taller sin talla ni color.
                </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                <button type="button" onClick={onCancelar}
                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontWeight: '700', fontSize: '13px', cursor: 'pointer', color: '#475569' }}>
                    Cancelar
                </button>
                <button type="button" onClick={agregar} disabled={!nombre.trim()}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', border: 'none',
                             background: nombre.trim() ? '#8f0653' : '#e2e8f0', color: nombre.trim() ? '#fff' : '#94a3b8',
                             fontWeight: '700', fontSize: '13px', cursor: nombre.trim() ? 'pointer' : 'not-allowed' }}>
                    <Plus size={14} /> Agregar al pedido
                </button>
            </div>
        </div>
    );
};

export default ItemPersonalizadoForm;
