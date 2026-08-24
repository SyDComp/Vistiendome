import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Scissors, Printer } from 'lucide-react';
import SectionHeader from '../../../ui/admin/SectionHeader';
import { useNotification } from '../../../../context/NotificationContext';
import { get, put } from '../../../../lib/api/client';

/**
 * "Orden de corte" no es una entidad — es esta vista: una consulta filtrable
 * sobre los ítems pendientes de confección. Los filtros de producto y
 * característica se resuelven en el cliente sobre lo que el propio backend
 * ya trae (mismo patrón que CotizacionesView), porque a esta escala no
 * justifica pedirle al backend una query más fina.
 */
const OrdenCorteView = () => {
    const { toast } = useNotification();
    const [filas, setFilas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [soloPendiente, setSoloPendiente] = useState(true);
    // Por defecto sólo lo confirmado: cortar tela es irreversible y cuesta
    // material, así que no se corta para una consulta que nadie acepto todavía.
    // Se puede ampliar a los pedidos en proceso para adelantar trabajo.
    const [alcance, setAlcance] = useState('CERRADA_EXITO');
    const [productoFiltro, setProductoFiltro] = useState('');
    const [caracteristicaFiltro, setCaracteristicaFiltro] = useState('');
    const [valorFiltro, setValorFiltro] = useState('');

    const cargar = useCallback(async () => {
        setLoading(true);
        try {
            const estado = alcance === 'TODAS' ? '' : `&estado=${alcance}`;
            const data = await get(`/api/v1/crm/orden-corte?pendiente=${soloPendiente}${estado}`);
            setFilas(data || []);
        } catch (err) {
            toast.error('No se pudo cargar la orden de corte');
        } finally {
            setLoading(false);
        }
    }, [soloPendiente, alcance]);

    useEffect(() => { cargar(); }, [cargar]);

    const productos = useMemo(() => [...new Set(filas.map(f => f.producto))].sort(), [filas]);
    const caracteristicas = useMemo(() => {
        const nombres = new Set();
        filas.forEach(f => Object.keys(f.config || {}).forEach(k => nombres.add(k)));
        return [...nombres].sort();
    }, [filas]);
    const valoresDisponibles = useMemo(() => {
        if (!caracteristicaFiltro) return [];
        const vals = new Set();
        filas.forEach(f => {
            const v = f.config?.[caracteristicaFiltro];
            if (v) vals.add(v);
        });
        return [...vals].sort();
    }, [filas, caracteristicaFiltro]);

    const filasFiltradas = useMemo(() => {
        return filas.filter(f => {
            if (productoFiltro && f.producto !== productoFiltro) return false;
            if (caracteristicaFiltro && valorFiltro && f.config?.[caracteristicaFiltro] !== valorFiltro) return false;
            return true;
        });
    }, [filas, productoFiltro, caracteristicaFiltro, valorFiltro]);

    const toggleCortado = async (fila) => {
        const nuevoValor = !fila.cortado;
        setFilas(prev => prev.map(f => f.item_id === fila.item_id ? { ...f, cortado: nuevoValor } : f));
        try {
            await put(`/api/v1/crm/items/${fila.item_id}/cortado`, { cortado: nuevoValor });
            if (soloPendiente && nuevoValor) {
                setFilas(prev => prev.filter(f => f.item_id !== fila.item_id));
            }
        } catch (err) {
            setFilas(prev => prev.map(f => f.item_id === fila.item_id ? { ...f, cortado: !nuevoValor } : f));
            toast.error('No se pudo actualizar');
        }
    };

    /**
     * Imprime en una ventana aparte con su propio HTML.
     *
     * `window.print()` a secas imprimía el panel completo —barra lateral, menú
     * y todo— porque esta vista vive dentro del dashboard y el layout no tiene
     * reglas de impresión. Marcar los controles con `.no-print` no alcanzaba:
     * esas clases sólo existen dentro de este componente.
     *
     * Es el mismo patrón que ya usan las etiquetas de envío.
     */
    const imprimir = () => {
        const filasHtml = filasFiltradas.map(f => `
            <tr>
                <td>${f.numero ?? '—'}</td>
                <td>${f.cliente}</td>
                <td>${new Date(f.fecha).toLocaleDateString('es-CL')}</td>
                <td>${f.producto}</td>
                <td>${Object.entries(f.config || {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ')}</td>
                <td class="num">${f.cantidad}</td>
                <td class="check"></td>
            </tr>`).join('');

        const total = filasFiltradas.reduce((a, f) => a + (f.cantidad || 0), 0);
        const w = window.open('', '_blank', 'width=1000,height=800');
        if (!w) return toast.error('El navegador bloqueó la ventana de impresión');
        w.document.write(`<!doctype html><html><head><meta charset="utf-8">
            <title>Orden de Corte</title>
            <style>
                *{box-sizing:border-box}
                body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:18mm 12mm;color:#000}
                h1{font-size:20px;margin:0 0 4px}
                .meta{font-size:12px;color:#555;margin-bottom:16px}
                table{width:100%;border-collapse:collapse;font-size:12px}
                th{text-align:left;border-bottom:2px solid #000;padding:6px 4px;font-size:10px;text-transform:uppercase;letter-spacing:.5px}
                td{padding:7px 4px;border-bottom:1px solid #ddd;vertical-align:top}
                .num{text-align:right}
                /* Casilla en papel: se marca a mano en el taller */
                .check{width:34px}
                .check:after{content:'';display:block;width:15px;height:15px;border:1.5px solid #000;margin:0 auto}
                tfoot td{border:0;padding-top:10px;font-weight:700}
                @page{margin:10mm}
            </style></head><body>
            <h1>Orden de Corte</h1>
            <div class="meta">${filasFiltradas.length} piezas · ${total} unidades · ${new Date().toLocaleDateString('es-CL')}</div>
            <table>
                <thead><tr><th>N° Pedido</th><th>Cliente</th><th>Fecha</th><th>Producto</th><th>Características</th><th class="num">Cant.</th><th></th></tr></thead>
                <tbody>${filasHtml}</tbody>
                <tfoot><tr><td colspan="5"></td><td class="num">${total}</td><td></td></tr></tfoot>
            </table>
            <script>window.onload=function(){setTimeout(function(){window.print();window.close();},400)}<\/script>
            </body></html>`);
        w.document.close();
    };

    return (
        <div className="admin-module fade-in orden-corte-view">
            <div className="no-print">
                <SectionHeader
                    title="Orden de Corte"
                    subtitle={`${filasFiltradas.length} piezas ${soloPendiente ? 'pendientes de cortar' : 'en total'}`}
                    icon={Scissors}
                />

                <div className="orden-corte-filters">
                    <label className="filter-check">
                        <input type="checkbox" checked={soloPendiente} onChange={e => setSoloPendiente(e.target.checked)} />
                        Sólo pendientes
                    </label>

                    <select value={alcance} onChange={e => setAlcance(e.target.value)} className="filter-select">
                        <option value="CERRADA_EXITO">Sólo pedidos confirmados</option>
                        <option value="EN_PROCESO">Sólo en proceso</option>
                        <option value="TODAS">Todos (incluye consultas sin confirmar)</option>
                    </select>

                    <select value={productoFiltro} onChange={e => setProductoFiltro(e.target.value)} className="filter-select">
                        <option value="">Todos los productos</option>
                        {productos.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>

                    <select value={caracteristicaFiltro} onChange={e => { setCaracteristicaFiltro(e.target.value); setValorFiltro(''); }} className="filter-select">
                        <option value="">Cualquier característica</option>
                        {caracteristicas.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    {caracteristicaFiltro && (
                        <select value={valorFiltro} onChange={e => setValorFiltro(e.target.value)} className="filter-select">
                            <option value="">Cualquier valor</option>
                            {valoresDisponibles.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    )}

                    <button className="btn-print" onClick={imprimir} disabled={!filasFiltradas.length}>
                        <Printer size={16} /> Imprimir
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="orden-corte-empty">Cargando...</div>
            ) : filasFiltradas.length === 0 ? (
                /* Un vacío sin explicación se lee como "esto está roto". Se dice
                   qué falta para que aparezca algo. */
                <div className="orden-corte-empty">
                    {(productoFiltro || valorFiltro) ? (
                        <>Ningún pedido pendiente coincide con estos filtros.</>
                    ) : soloPendiente ? (
                        <>
                            <strong>No hay piezas pendientes de cortar.</strong>
                            <p>
                                Acá aparece cada prenda de un pedido que todavía no se cortó.
                                Se llena solo cuando entra un pedido nuevo desde la tienda o lo
                                creas en Cotizaciones. Quita "Sólo pendientes" para ver también
                                lo ya cortado.
                            </p>
                        </>
                    ) : (
                        <>Todavía no hay piezas registradas.</>
                    )}
                </div>
            ) : (
                <table className="orden-corte-table">
                    <thead>
                        <tr>
                            <th className="no-print">Cortado</th>
                            <th>N° Pedido</th>
                            <th>Cliente</th>
                            <th>Fecha</th>
                            <th>Producto</th>
                            <th>Características</th>
                            <th className="col-num">Cantidad</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filasFiltradas.map(f => (
                            <tr key={f.item_id} className={f.cortado ? 'row-cortado' : ''}>
                                <td className="no-print">
                                    <input type="checkbox" checked={f.cortado} onChange={() => toggleCortado(f)} />
                                </td>
                                <td>{f.numero ?? '—'}</td>
                                <td>{f.cliente}</td>
                                <td>{new Date(f.fecha).toLocaleDateString('es-CL')}</td>
                                <td>{f.producto}</td>
                                <td>
                                    <div className="config-badges">
                                        {Object.entries(f.config || {}).filter(([, v]) => v).map(([k, v]) => (
                                            <span key={k} className="config-badge">{k}: {v}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="col-num">{f.cantidad}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            <style>{`
                .orden-corte-filters {
                    display: flex; flex-wrap: wrap; gap: 10px; align-items: center;
                    margin-bottom: 20px; padding: 14px 16px; background: #f8fafc;
                    border: 1px solid #e2e8f0; border-radius: 12px;
                }
                .filter-check { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #334155; }
                .filter-select {
                    height: 38px; padding: 0 10px; border-radius: 8px; border: 1px solid #e2e8f0;
                    font-size: 13px; background: #fff; color: #1e1b4b;
                }
                .btn-print {
                    display: flex; align-items: center; gap: 6px; margin-left: auto;
                    background: #1e1b4b; color: #fff; border: none; padding: 8px 16px;
                    border-radius: 8px; font-weight: 700; font-size: 13px; cursor: pointer;
                }
                .orden-corte-empty { padding: 56px 20px; text-align: center; color: #64748b; font-size: 14px; }
                .orden-corte-empty strong { display: block; color: #334155; font-size: 15px; margin-bottom: 8px; }
                .orden-corte-empty p { max-width: 480px; margin: 0 auto; line-height: 1.6; font-size: 13px; }

                .orden-corte-table { width: 100%; border-collapse: collapse; font-size: 13px; }
                .orden-corte-table th {
                    text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;
                    color: #64748b; border-bottom: 2px solid #1e1b4b; padding: 8px 10px;
                }
                .orden-corte-table td { padding: 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
                .orden-corte-table .col-num { text-align: right; }
                .row-cortado { opacity: 0.45; }
                .config-badges { display: flex; flex-wrap: wrap; gap: 4px; }
                .config-badge {
                    font-size: 11px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 4px;
                    padding: 2px 6px; color: #334155; white-space: nowrap;
                }

                @media print {
                    .no-print { display: none !important; }
                    .orden-corte-view { padding: 0 !important; }
                }
            `}</style>
        </div>
    );
};

export default OrdenCorteView;
