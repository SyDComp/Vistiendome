import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import { registrarMovimientoKardex } from '../../../../../lib/api/endpoints';
import { OPCIONES_MOVIMIENTO, cantidadValida, stockResultante } from './movimientos';

const ICONOS = { ingreso: Plus, salida: Minus };

/**
 * Registrar a mano un ingreso o una salida de una variante.
 *
 * Antes de confirmar se ve con cuánto stock queda: "Ajuste" a secas no decía
 * si sumaba o restaba, y se elegía para agregar prendas cuando en realidad
 * restaba.
 */
const MovimientoModal = ({ variante, onCerrar, onRegistrado }) => {
    const [opcion, setOpcion] = useState('ingreso');
    const [cantidadTexto, setCantidadTexto] = useState('1');
    const [nota, setNota] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');

    const actual = variante.current_stock ?? 0;
    const cantidad = cantidadValida(cantidadTexto);
    const resultado = cantidad ? stockResultante(actual, opcion, cantidad) : null;
    const quedaNegativo = resultado !== null && resultado < 0;

    const problema = !cantidad
        ? 'Escribe una cantidad mayor que cero.'
        : quedaNegativo
            ? `Hay ${actual}: no se pueden sacar ${cantidad}. Si llegaron prendas, elige "Ingreso".`
            : !nota.trim()
                ? 'Escribe el motivo del movimiento.'
                : '';

    const confirmar = async () => {
        if (problema || enviando) return;
        setEnviando(true);
        setError('');
        try {
            const opcionElegida = OPCIONES_MOVIMIENTO[opcion];
            const respuesta = await registrarMovimientoKardex({
                sku_id: variante.sku_id,
                type: opcionElegida.tipo,
                quantity: opcionElegida.signo * cantidad,
                note: nota.trim(),
            });
            onRegistrado(respuesta);
        } catch (e) {
            // El servidor dice por qué no se pudo; repetirlo es mejor que un
            // "error" a secas que no deja saber qué corregir.
            setError(e.message || 'No se pudo registrar el movimiento.');
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="logistics-modal-overlay" onClick={onCerrar}>
            <div className="logistics-modal-content" role="dialog" aria-modal="true" aria-labelledby="movimiento-titulo" onClick={(e) => e.stopPropagation()}>
                <h3 id="movimiento-titulo" className="logistics-modal-title">Registrar Movimiento</h3>
                <p className="logistics-modal-subtitle">
                    Producto: <strong>{variante.product_name}</strong> ({variante.sku})
                </p>

                <div className="logistics-modal-form">
                    <div>
                        <span className="logistics-modal-label">Tipo de Movimiento</span>
                        <div className="logistics-type-btns" role="radiogroup">
                            {Object.entries(OPCIONES_MOVIMIENTO).map(([clave, o]) => {
                                const Icono = ICONOS[clave];
                                return (
                                    <button
                                        key={clave}
                                        type="button"
                                        role="radio"
                                        aria-checked={opcion === clave}
                                        onClick={() => setOpcion(clave)}
                                        className={`logistics-type-btn ${o.tipo}${opcion === clave ? ' active' : ''}`}
                                    >
                                        <Icono size={18} />
                                        <div className="logistics-type-btn-text">{o.nombre}</div>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="logistics-modal-ayuda">{OPCIONES_MOVIMIENTO[opcion].ayuda}</p>
                    </div>

                    <div>
                        <label className="logistics-modal-label" htmlFor="movimiento-cantidad">Cantidad</label>
                        <input
                            id="movimiento-cantidad"
                            type="number"
                            min="1"
                            step="1"
                            inputMode="numeric"
                            value={cantidadTexto}
                            onChange={e => setCantidadTexto(e.target.value)}
                            className="logistics-modal-input"
                        />
                    </div>

                    <div className={`logistics-modal-resultado${quedaNegativo ? ' logistics-modal-resultado--imposible' : ''}`}>
                        Stock: <strong>{actual}</strong> → <strong>{resultado ?? '—'}</strong>
                    </div>

                    <div>
                        <label className="logistics-modal-label" htmlFor="movimiento-nota">Nota / Razón</label>
                        <textarea
                            id="movimiento-nota"
                            placeholder="Ej: Llegaron del taller, prenda con falla, error en conteo anterior..."
                            value={nota}
                            onChange={e => setNota(e.target.value)}
                            className="logistics-modal-textarea"
                        />
                    </div>
                </div>

                {(error || problema) && (
                    <p className={`logistics-modal-aviso${error ? ' logistics-modal-aviso--error' : ''}`} role={error ? 'alert' : undefined}>
                        {error || problema}
                    </p>
                )}

                <div className="logistics-modal-actions">
                    <button type="button" onClick={onCerrar} className="logistics-modal-btn-cancel">
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={confirmar}
                        disabled={Boolean(problema) || enviando}
                        className="logistics-modal-btn-confirm"
                    >
                        {enviando ? 'Registrando…' : 'Confirmar Movimiento'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MovimientoModal;
