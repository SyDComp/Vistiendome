import React, { useState } from 'react';
import SumarEnBloque from './SumarEnBloque';
import ConteoEnBloque from './ConteoEnBloque';

const MODOS = {
    sumar: { nombre: 'Sumar o restar', Componente: SumarEnBloque },
    conteo: { nombre: 'Conteo', Componente: ConteoEnBloque },
};

/** Por qué el servidor no aceptó el lote, fila por fila, con el nombre de cada variante. */
const Rechazo = ({ error, filas, onRecargar }) => {
    const detalle = error?.data?.detail;
    if (!detalle || typeof detalle !== 'object') {
        return <p className="logistics-modal-aviso logistics-modal-aviso--error" role="alert">{error.message || 'No se pudo registrar el movimiento.'}</p>;
    }
    const porId = Object.fromEntries(filas.map(f => [f.sku_id, f]));
    return (
        <div className="logistics-modal-aviso logistics-modal-aviso--error" role="alert">
            <p>{detalle.mensaje} No se registró nada.</p>
            <ul className="lote-rechazo">
                {(detalle.filas || []).map(r => (
                    <li key={r.sku_id}>
                        {porId[r.sku_id]?.sku || `Variante ${r.sku_id}`}:{' '}
                        {'ahora' in r ? `tenía ${r.esperado}, ahora hay ${r.ahora}` : `hay ${r.hay}`}
                    </li>
                ))}
            </ul>
            {(detalle.filas || []).some(r => 'ahora' in r) && (
                <button type="button" onClick={onRecargar} className="logistics-modal-btn-cancel">Traer los valores de ahora</button>
            )}
        </div>
    );
};

/**
 * Registrar un movimiento a varias variantes de una vez. Todo o nada: si una
 * sola lo impide, no se registra ninguna (docs/diseno/bodega_en_bloque.md).
 */
const MovimientoEnBloque = ({ filas, onCerrar, onRegistrado, onRecargar }) => {
    const [modo, setModo] = useState('sumar');
    const [motivo, setMotivo] = useState('');
    const [error, setError] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const { Componente } = MODOS[modo];

    return (
        <div className="logistics-modal-overlay" onClick={onCerrar}>
            <div className="logistics-modal-content lote-modal" role="dialog" aria-modal="true" aria-labelledby="lote-titulo" onClick={(e) => e.stopPropagation()}>
                <h3 id="lote-titulo" className="logistics-modal-title">Movimiento a {filas.length} variante{filas.length !== 1 ? 's' : ''}</h3>

                <div className="lote-modos" role="tablist">
                    {Object.entries(MODOS).map(([clave, m]) => (
                        <button key={clave} type="button" role="tab" aria-selected={modo === clave}
                            onClick={() => { setModo(clave); setError(null); }}
                            className={`lote-modo${modo === clave ? ' lote-modo--activo' : ''}`}>
                            {m.nombre}
                        </button>
                    ))}
                </div>

                <div className="logistics-modal-form">
                    <Componente filas={filas} motivo={motivo} onError={setError} onRegistrado={onRegistrado}
                        enviando={enviando} setEnviando={setEnviando}>
                        {({ problema, confirmar, texto }) => (
                            <>
                                <div>
                                    <label className="logistics-modal-label" htmlFor="lote-motivo">Motivo</label>
                                    <textarea id="lote-motivo" value={motivo} onChange={e => setMotivo(e.target.value)}
                                        placeholder="Ej: Llegó la partida del taller, inventario de fin de mes..."
                                        className="logistics-modal-textarea" />
                                </div>

                                {error ? <Rechazo error={error} filas={filas} onRecargar={() => { setError(null); onRecargar(); }} />
                                    : problema && <p className="logistics-modal-aviso">{problema}</p>}

                                <div className="logistics-modal-actions">
                                    <button type="button" onClick={onCerrar} className="logistics-modal-btn-cancel">Cancelar</button>
                                    <button type="button" onClick={confirmar} disabled={Boolean(problema) || enviando}
                                        className="logistics-modal-btn-confirm">
                                        {enviando ? 'Registrando…' : texto}
                                    </button>
                                </div>
                            </>
                        )}
                    </Componente>
                </div>
            </div>
        </div>
    );
};

export default MovimientoEnBloque;
