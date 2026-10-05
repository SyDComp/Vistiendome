import React from 'react';
import { Plus, Minus, ArrowLeftRight, Info } from 'lucide-react';
import { conSaldo, nombreDelMovimiento } from './movimientos';

const FECHA = new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' });

const iconoDe = (m) => (m.type === 'receipt' ? Plus : m.quantity < 0 ? Minus : ArrowLeftRight);
const tonoDe = (m) => (m.quantity > 0 ? 'positivo' : 'negativo');

/**
 * Los movimientos de una variante, del más reciente al más antiguo, con el
 * stock que quedó después de cada uno.
 */
const HistorialKardex = ({ datos }) => {
    const movimientos = conSaldo(datos.history, datos.current_stock);
    const variante = Object.values(datos.config || {}).filter(Boolean);

    return (
        <div className="logistics-drawer-body">
            <div className="logistics-drawer-header">
                <div className="logistics-drawer-label">Producto</div>
                <div className="logistics-drawer-value">{datos.product_name}</div>
                {variante.length > 0 && (
                    <div className="logistics-config-wrapper logistics-drawer-variante">
                        {variante.map(v => <span key={v} className="logistics-config-tag">{v}</span>)}
                    </div>
                )}
                <div className="logistics-drawer-stock">
                    Stock actual: <strong>{datos.current_stock}</strong>
                </div>
            </div>

            {movimientos.length === 0 ? (
                <div className="logistics-history-empty">
                    <Info size={18} />
                    <span>Esta variante no tiene ningún movimiento registrado todavía.</span>
                </div>
            ) : (
                <ul className="logistics-history-list">
                    {movimientos.map(m => {
                        const Icono = iconoDe(m);
                        return (
                            <li key={m.id} className="logistics-history-item">
                                <div className={`logistics-history-icon-wrapper ${tonoDe(m)}`}>
                                    <Icono size={20} />
                                </div>
                                <div className="logistics-history-details">
                                    <div className="logistics-history-row">
                                        <span className="logistics-history-type">{nombreDelMovimiento(m)}</span>
                                        <span className={`logistics-history-qty ${tonoDe(m)}`}>
                                            {m.quantity > 0 ? '+' : ''}{m.quantity}
                                        </span>
                                    </div>
                                    <div className="logistics-history-row">
                                        <span className="logistics-history-date">
                                            {m.created_at ? FECHA.format(new Date(m.created_at)) : 'Sin fecha'}
                                        </span>
                                        <span className="logistics-history-saldo">Quedó en {m.saldo}</span>
                                    </div>
                                    {m.note && <div className="logistics-history-note">“{m.note}”</div>}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default HistorialKardex;
