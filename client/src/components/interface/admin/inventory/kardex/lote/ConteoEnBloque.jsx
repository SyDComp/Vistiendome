import React, { useState } from 'react';
import { contarEnBloque } from '../../../../../../lib/api/endpoints';
import { contadoValido, filasDelConteo, problemaAlContar } from './enBloque';

/**
 * El conteo de inventario: lo que hay físicamente en cada elegida. Se compara
 * con "en bodega" (lo apartado también está ahí) y se anota la diferencia.
 * Las que se dejan en blanco no se tocan.
 */
const ConteoEnBloque = ({ filas, motivo, onError, onRegistrado, enviando, setEnviando, children }) => {
    const [contados, setContados] = useState({});
    const problema = problemaAlContar({ filas, contados, motivo });

    const confirmar = async () => {
        if (problema || enviando) return;
        setEnviando(true);
        onError(null);
        try {
            onRegistrado(await contarEnBloque({ filas: filasDelConteo(filas, contados), motivo: motivo.trim() }));
        } catch (e) {
            onError(e);
        } finally {
            setEnviando(false);
        }
    };

    return (
        <>
            <p className="logistics-modal-ayuda">
                Escribe cuántas hay físicamente. Se anota la diferencia con lo que dice la bodega; las que dejes en blanco no cambian.
            </p>
            <div className="lote-conteo" role="table" aria-label="Conteo">
                <div className="lote-conteo-fila lote-conteo-fila--cabecera" role="row">
                    <span role="columnheader">Variante</span>
                    <span role="columnheader">En bodega</span>
                    <span role="columnheader">Contadas</span>
                </div>
                {filas.map(f => {
                    const contado = contadoValido(contados[f.sku_id]);
                    const diferencia = contado === null ? null : contado - (f.current_stock ?? 0);
                    return (
                        <div key={f.sku_id} className="lote-conteo-fila" role="row">
                            <span className="lote-conteo-variante">
                                {f.product_name} · {Object.values(f.config || {}).join(' / ')}
                            </span>
                            <span className="lote-conteo-cifra">{f.current_stock ?? 0}</span>
                            <span className="lote-conteo-entrada">
                                <input type="number" min="0" step="1" inputMode="numeric"
                                    aria-label={`Contadas de ${f.sku}`}
                                    value={contados[f.sku_id] ?? ''}
                                    onChange={e => setContados(prev => ({ ...prev, [f.sku_id]: e.target.value }))}
                                    className="logistics-modal-input" />
                                {diferencia !== null && diferencia !== 0 && (
                                    <em className={diferencia > 0 ? 'lote-conteo-suma' : 'lote-conteo-resta'}>
                                        {diferencia > 0 ? `+${diferencia}` : diferencia}
                                    </em>
                                )}
                            </span>
                        </div>
                    );
                })}
            </div>

            {children({ problema, confirmar, texto: 'Confirmar conteo' })}
        </>
    );
};

export default ConteoEnBloque;
