import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../../../../utils/cartUtils';
import { totalVenta } from '../../../../../utils/ventaLocal';

/**
 * Lo que se lleva, como en la pantalla de una caja: cada prenda con su
 * cantidad, su precio (viene del catálogo y se puede cambiar) y su subtotal.
 * En modo atajos, la marcada (↑ ↓) es a la que van + − Supr y Enter (editar
 * el precio). Enter en el precio termina de escribir.
 */
const LineasCaja = ({ lineas, marcada, onCambiar, onListo, disabled }) => {
    const cambiar = (clave, cambio) => onCambiar(lineas.map(l => (l.clave === clave ? { ...l, ...cambio } : l)));
    const terminar = (e) => { if (e.key === 'Enter') { e.preventDefault(); onListo(); } };

    if (!lineas.length) {
        return <p className="cj-vacio">Escanea una prenda, búscala con B o elígela con Espacio.</p>;
    }
    return (
        <ul className="cj-lineas" aria-label="Prendas de la venta">
            {lineas.map((l, i) => {
                const cantidad = Number(l.cantidad) || 0;
                return (
                    <li key={l.clave} className={`cj-linea${i === marcada ? ' cj-linea--marcada' : ''}`}>
                        <div className="cj-linea-nombre">
                            <strong>{l.nombre}</strong>
                            <span>{Object.values(l.config || {}).filter(Boolean).join(' · ')}</span>
                            <span className="cj-linea-codigo" title={l.codigo}>{l.codigo}</span>
                        </div>
                        <div className="cj-cantidad" aria-label={`Cantidad de ${l.nombre}`}>
                            <button type="button" className="cj-icono" aria-label="Una menos" disabled={disabled || cantidad <= 1}
                                onClick={() => cambiar(l.clave, { cantidad: cantidad - 1 })}><Minus size={16} /></button>
                            <span>{cantidad}</span>
                            <button type="button" className="cj-icono" aria-label="Una más"
                                disabled={disabled || Boolean(l.pieza_id) || cantidad >= l.disponible}
                                onClick={() => cambiar(l.clave, { cantidad: cantidad + 1 })}><Plus size={16} /></button>
                        </div>
                        <label className="cj-precio">
                            <span className="cj-oculto">Precio de {l.nombre}</span>
                            <input type="text" inputMode="numeric" className="sp-select" value={l.precio} disabled={disabled}
                                placeholder="Precio" onKeyDown={terminar} data-precio={l.clave}
                                onChange={e => cambiar(l.clave, { precio: e.target.value })} />
                        </label>
                        <span className="cj-subtotal">{formatCurrency(totalVenta([l]))}</span>
                        <button type="button" className="cj-icono cj-icono--quitar" aria-label={`Quitar ${l.nombre}`}
                            disabled={disabled} onClick={() => onCambiar(lineas.filter(x => x.clave !== l.clave))}>
                            <Trash2 size={16} />
                        </button>
                    </li>
                );
            })}
        </ul>
    );
};

export default LineasCaja;
