import React, { forwardRef, useMemo, useState } from 'react';
import { ScanBarcode } from 'lucide-react';
import { formatCurrency } from '../../../../utils/cartUtils';
import { buscarDisponible } from '../../../../utils/caja';

const MINIMO_PARA_SUGERIR = 2;

/**
 * Donde escribe la pistola. La pistola (HBA-X3) se comporta como un teclado:
 * escribe el código y aprieta Enter. Con Enter se busca el código; si se
 * escribe a mano, debajo se sugiere lo que calza por nombre, talla o código
 * (con las flechas se elige, con Enter se agrega).
 */
const LectorCaja = forwardRef(({ disponibles, onCodigo, onElegido, disabled }, ref) => {
    const [texto, setTexto] = useState('');
    const [marcado, setMarcado] = useState(-1);
    const sugeridos = useMemo(
        () => (texto.trim().length >= MINIMO_PARA_SUGERIR ? buscarDisponible(disponibles, texto) : []),
        [disponibles, texto],
    );

    const limpiar = () => { setTexto(''); setMarcado(-1); };
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
            if (texto.trim()) onCodigo(texto.trim());
            limpiar();
        }
    };

    return (
        <div className="cj-lector">
            <label className="cj-lector-campo">
                <ScanBarcode size={26} aria-hidden="true" />
                <input ref={ref} type="text" autoComplete="off" spellCheck="false" value={texto} disabled={disabled}
                    placeholder="Escanea la etiqueta, o escribe nombre, talla o código…"
                    aria-label="Código de la prenda" onKeyDown={teclas}
                    onChange={e => { setTexto(e.target.value); setMarcado(-1); }} />
            </label>
            {sugeridos.length > 0 && (
                <ul className="cj-sugeridos" role="listbox" aria-label="Prendas que calzan">
                    {sugeridos.map((d, i) => (
                        <li key={d.sku_id || d.pieza_id} role="option" aria-selected={i === marcado}>
                            <button type="button" className={`cj-sugerido${i === marcado ? ' cj-sugerido--marcado' : ''}`}
                                onMouseDown={e => e.preventDefault()} onClick={() => elegir(d)}>
                                <span><strong>{d.nombre}</strong> {Object.values(d.config || {}).join(' / ')}</span>
                                <span className="cj-sugerido-detalle">
                                    {d.codigo} · {d.tipo === 'pieza' ? 'pieza única' : `${d.disponible} libres`}
                                    {d.precio ? ` · ${formatCurrency(d.precio)}` : ''}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
});

LectorCaja.displayName = 'LectorCaja';

export default LectorCaja;
