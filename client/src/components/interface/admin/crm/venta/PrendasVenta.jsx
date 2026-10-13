import React, { useMemo, useState } from 'react';
import { formatCurrency } from '../../../../../utils/cartUtils';
import { lineaDesde, totalVenta } from '../../../../../utils/ventaLocal';

const CUANTOS = 12;

/** "Cinturón M Negro CIN-M": lo que se busca escribiendo. */
const textoDe = (d) => [d.nombre, d.codigo, ...Object.values(d.config || {})].join(' ').toLowerCase();

/**
 * Las prendas de la venta: se buscan entre lo que hay libre en bodega y las
 * piezas únicas, se elige la cantidad (hasta lo disponible) y el precio, que
 * viene del catálogo y se puede cambiar.
 */
const PrendasVenta = ({ disponibles, lineas, onCambiar, disabled }) => {
    const [busqueda, setBusqueda] = useState('');
    const encontrados = useMemo(() => {
        const q = busqueda.trim().toLowerCase();
        if (!q) return [];
        const enVenta = new Set(lineas.map(l => l.clave));
        return disponibles
            .filter(d => !enVenta.has(d.sku_id ? `v-${d.sku_id}` : `p-${d.pieza_id}`))
            .filter(d => q.split(/\s+/).every(palabra => textoDe(d).includes(palabra)))
            .slice(0, CUANTOS);
    }, [busqueda, disponibles, lineas]);

    const cambiar = (clave, cambio) => onCambiar(lineas.map(l => (l.clave === clave ? { ...l, ...cambio } : l)));
    const agregar = (d) => { onCambiar([...lineas, lineaDesde(d)]); setBusqueda(''); };

    return (
        <fieldset className="vl-bloque" disabled={disabled}>
            <legend className="vl-titulo">Prendas</legend>
            <input type="search" className="sp-select" placeholder="Busca por nombre, talla, color o código…"
                value={busqueda} onChange={e => setBusqueda(e.target.value)} aria-label="Buscar prendas para vender" />
            {encontrados.length > 0 && (
                <ul className="vl-encontrados">
                    {encontrados.map(d => (
                        <li key={d.sku_id || d.pieza_id}>
                            <button type="button" className="vl-encontrado" onClick={() => agregar(d)}>
                                <span><strong>{d.nombre}</strong> {Object.values(d.config || {}).join(' / ')}</span>
                                <span className="vl-encontrado-detalle">
                                    {d.codigo} · {d.tipo === 'pieza' ? 'pieza única' : `${d.disponible} libres`}
                                    {d.precio ? ` · ${formatCurrency(d.precio)}` : ''}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            {busqueda.trim() && !encontrados.length && (
                <p className="sp-aviso">No hay nada libre que calce. Si hay que hacerlo o esperarlo, es un pedido normal.</p>
            )}

            {lineas.length > 0 && (
                <ul className="sp-prendas">
                    {lineas.map(l => (
                        <li key={l.clave} className="vl-linea">
                            <div>
                                <p className="sp-prenda-nombre">{l.nombre}</p>
                                <p className="sp-prenda-detalle">{[l.codigo, ...Object.values(l.config)].join(' · ')}</p>
                            </div>
                            <label className="sp-pago-campo vl-chico">
                                Cantidad
                                <input type="number" min="1" max={l.disponible} className="sp-select" value={l.cantidad}
                                    disabled={Boolean(l.pieza_id)} onChange={e => cambiar(l.clave, { cantidad: e.target.value })} />
                            </label>
                            <label className="sp-pago-campo vl-chico">
                                Precio c/u
                                <input type="text" inputMode="numeric" className="sp-select" value={l.precio}
                                    onChange={e => cambiar(l.clave, { precio: e.target.value })} />
                            </label>
                            <button type="button" className="sp-boton" aria-label={`Quitar ${l.nombre}`}
                                onClick={() => onCambiar(lineas.filter(x => x.clave !== l.clave))}>Quitar</button>
                        </li>
                    ))}
                </ul>
            )}
            {lineas.length > 0 && <p className="vl-total">Total {formatCurrency(totalVenta(lineas))}</p>}
        </fieldset>
    );
};

export default PrendasVenta;
