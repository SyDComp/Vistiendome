import React, { forwardRef, useState } from 'react';
import { LayoutGrid, Search, X } from 'lucide-react';
import { formatCurrency } from '../../../../../utils/cartUtils';
import { sinFiltro } from '../../../../../utils/busquedaCaja';
import { sinStock } from '../../../../../utils/caja';

const MINIMO_PARA_SUGERIR = 2;

/**
 * El buscador de la caja. Entiende palabras (utils/busquedaCaja.js): "vestido
 * roja xs" muestra etiquetas Color: Rojo y Talla: XS, que se quitan con su ×.
 * Debajo, lo que calza; con las flechas se marca y con Enter se agrega.
 * Enter sin marcar: si calza una sola cosa, esa; si calzan varias, se abren
 * las tarjetas ya filtradas; si nada, se busca como código escrito a mano.
 *
 * La pistola no pasa por aquí: lo que lee va directo a la venta (teclado/usePistola.js).
 */
const LectorCaja = forwardRef(({ texto, onTexto, interpretacion, encontrado, onElegido, onAbrirSelector, onCodigo, disabled }, ref) => {
    const [marcado, setMarcado] = useState(-1);
    const sugeridos = texto.trim().length >= MINIMO_PARA_SUGERIR ? encontrado.resultados : [];

    const limpiar = () => { onTexto(''); setMarcado(-1); };
    const elegir = (d) => { onElegido(d); limpiar(); };

    const teclas = (e) => {
        if (e.key === 'ArrowDown' && sugeridos.length) {
            e.preventDefault();
            setMarcado(i => Math.min(i + 1, sugeridos.length - 1));
        } else if (e.key === 'ArrowUp' && sugeridos.length) {
            e.preventDefault();
            setMarcado(i => Math.max(i - 1, -1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (marcado >= 0 && sugeridos[marcado]) return elegir(sugeridos[marcado]);
            if (!texto.trim()) return;
            if (encontrado.total === 1) return elegir(encontrado.resultados[0]);
            if (encontrado.total > 1) return onAbrirSelector();
            onCodigo(texto.trim());
            limpiar();
        }
    };

    return (
        <div className="cj-lector">
            <div className="cj-lector-fila">
                <label className="cj-lector-campo">
                    <Search size={22} aria-hidden="true" />
                    <input ref={ref} type="text" autoComplete="off" spellCheck="false" value={texto} disabled={disabled}
                        placeholder="Nombre, color, talla… (vestido roja xs)" aria-label="Buscar"
                        onKeyDown={teclas} onChange={e => { onTexto(e.target.value); setMarcado(-1); }} />
                </label>
                <button type="button" className="cj-tarjetas" onClick={onAbrirSelector} disabled={disabled}>
                    <LayoutGrid size={18} aria-hidden="true" /> Tarjetas <kbd>Espacio</kbd>
                </button>
            </div>
            {interpretacion.filtros.length > 0 && (
                <div className="cj-etiquetas" aria-label="Filtros">
                    {interpretacion.filtros.map(f => (
                        <span key={f.caracteristica} className="cj-etiqueta">
                            <span className="cj-etiqueta-nombre">{f.caracteristica.toLowerCase()}</span>
                            {f.valores.join(' o ')}
                            <button type="button" aria-label={`Quitar ${f.caracteristica}`}
                                onClick={() => onTexto(sinFiltro(texto, f))}><X size={13} /></button>
                        </span>
                    ))}
                </div>
            )}
            {sugeridos.length > 0 && (
                <ul className="cj-sugeridos" role="listbox" aria-label="Prendas que calzan">
                    {sugeridos.map((d, i) => (
                        <li key={d.sku_id || d.pieza_id} role="option" aria-selected={i === marcado}>
                            <button type="button"
                                className={`cj-sugerido${i === marcado ? ' cj-sugerido--marcado' : ''}${sinStock(d) ? ' cj-sugerido--sin' : ''}`}
                                onMouseDown={e => e.preventDefault()} onClick={() => elegir(d)}>
                                <span><strong>{d.nombre}</strong> {Object.values(d.config || {}).join(' / ')}</span>
                                <span className="cj-sugerido-detalle">
                                    {d.tipo === 'pieza' ? 'pieza única' : sinStock(d) ? 'sin stock' : `${d.disponible} libres`}
                                    {d.precio ? ` · ${formatCurrency(d.precio)}` : ''}
                                </span>
                            </button>
                        </li>
                    ))}
                    {encontrado.total > sugeridos.length && (
                        <li className="cj-sugeridos-mas">
                            Y {encontrado.total - sugeridos.length} más: Enter abre las tarjetas con esto filtrado.
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
});

LectorCaja.displayName = 'LectorCaja';

export default LectorCaja;
