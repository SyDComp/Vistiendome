import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Package, Scissors } from 'lucide-react';
import SectionHeader from '../../../ui/admin/SectionHeader';
import { useNotification } from '../../../../context/NotificationContext';
import { getPiezasPendientes, crearOrdenCorte } from '../../../../lib/api/endpoints';
import SelectorVariantes from './SelectorVariantes';

/**
 * Arma una orden de corte.
 *
 * Dos fuentes, porque son las dos formas en que se corta de verdad:
 *   1. Piezas de pedidos confirmados — el sistema las propone, no hay que
 *      escribirlas de nuevo.
 *   2. Líneas libres para stock — cortar sin que nadie lo haya pedido todavía.
 */
const OrdenCorteForm = ({ onVolver, onCreada }) => {
    const { toast } = useNotification();

    const [pendientes, setPendientes] = useState([]);
    const [elegidas, setElegidas] = useState({});   // cotizacion_item_id -> pieza
    const [paraStock, setParaStock] = useState([]); // [{sku_id, sku, producto, config, cantidad}]
    const [notas, setNotas] = useState('');
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);


    useEffect(() => {
        getPiezasPendientes()
            .then(d => setPendientes(d || []))
            .catch(() => toast.error('No se pudieron cargar las piezas pendientes'))
            .finally(() => setCargando(false));
    }, []);

    const totalUnidades = useMemo(
        () => Object.values(elegidas).reduce((a, p) => a + p.cantidad, 0)
            + paraStock.reduce((a, l) => a + (Number(l.cantidad) || 0), 0),
        [elegidas, paraStock]
    );

    const togglePieza = (p) => setElegidas(prev => {
        const n = { ...prev };
        if (n[p.cotizacion_item_id]) delete n[p.cotizacion_item_id];
        else n[p.cotizacion_item_id] = p;
        return n;
    });

    const agregarStock = (v) => {
        setParaStock(prev => [...prev, {
            sku_id: v.id,
            sku: v.sku,
            producto: v.product_name || v.producto || '',
            config: v.config || {},
            cantidad: 1,
        }]);
    };

    // Para que el explorador marque lo que ya está en la orden
    const yaElegidas = useMemo(() => new Set(paraStock.map(l => l.sku_id)), [paraStock]);

    const guardar = async () => {
        const items = [
            ...Object.values(elegidas).map(p => ({
                sku_id: p.sku_id,
                cantidad: p.cantidad,
                cotizacion_item_id: p.cotizacion_item_id,
            })),
            ...paraStock
                .filter(l => Number(l.cantidad) > 0)
                .map(l => ({ sku_id: l.sku_id, cantidad: Number(l.cantidad) })),
        ];
        if (!items.length) return toast.error('Agrega al menos una pieza a la orden');

        setGuardando(true);
        try {
            const orden = await crearOrdenCorte({ notas: notas || null, items });
            toast.success(`Orden de corte N° ${orden.numero} creada`);
            onCreada?.(orden);
        } catch (err) {
            toast.error(err?.message || 'No se pudo crear la orden');
        } finally {
            setGuardando(false);
        }
    };

    const etiquetaConfig = (config) =>
        Object.entries(config || {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ');

    return (
        <div className="admin-module fade-in oc-form">
            <div className="oc-form-top">
                <button className="oc-btn-volver" onClick={onVolver}><ArrowLeft size={16} /> Volver</button>
                <SectionHeader title="Nueva Orden de Corte" subtitle={`${totalUnidades} unidades en total`} icon={Scissors} />
            </div>

            <section className="oc-bloque">
                <h3>Piezas de pedidos confirmados</h3>
                <p className="oc-hint">
                    Lo que las clientas ya compraron y todavía no se corta. Elige lo que
                    entra en esta orden; lo que no elijas queda disponible para la próxima.
                </p>

                {cargando ? (
                    <div className="oc-vacio">Cargando...</div>
                ) : pendientes.length === 0 ? (
                    <div className="oc-vacio">
                        No hay piezas de pedidos esperando corte. Puedes armar la orden
                        igual, agregando abajo lo que quieras cortar para stock.
                    </div>
                ) : (
                    <table className="oc-tabla">
                        <thead>
                            <tr><th></th><th>N° Pedido</th><th>Cliente</th><th>Producto</th><th>Características</th><th className="num">Cant.</th></tr>
                        </thead>
                        <tbody>
                            {pendientes.map(p => (
                                <tr key={p.cotizacion_item_id} className={elegidas[p.cotizacion_item_id] ? 'elegida' : ''}>
                                    <td><input type="checkbox" checked={!!elegidas[p.cotizacion_item_id]} onChange={() => togglePieza(p)} /></td>
                                    <td>{p.pedido_numero ?? '—'}</td>
                                    <td>{p.cliente}</td>
                                    <td>{p.producto}</td>
                                    <td className="oc-config">{etiquetaConfig(p.config)}</td>
                                    <td className="num">{p.cantidad}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            <section className="oc-bloque">
                <h3>Cortar para stock</h3>
                <p className="oc-hint">
                    Prendas que no vienen de un pedido. Al finalizar la orden, estas
                    unidades <strong>entran al inventario</strong>.
                </p>

                <SelectorVariantes onElegir={agregarStock} yaElegidas={yaElegidas} />

                {paraStock.length > 0 && (
                    <table className="oc-tabla">
                        <thead><tr><th>Producto</th><th>Características</th><th className="num">Cantidad</th><th></th></tr></thead>
                        <tbody>
                            {paraStock.map((l, i) => (
                                <tr key={i}>
                                    <td>{l.producto || l.sku}</td>
                                    <td className="oc-config">{etiquetaConfig(l.config)}</td>
                                    <td className="num">
                                        <input type="number" min="1" value={l.cantidad}
                                            onChange={e => setParaStock(prev => prev.map((x, k) => k === i ? { ...x, cantidad: e.target.value } : x))}
                                            className="oc-cantidad" />
                                    </td>
                                    <td>
                                        <button type="button" className="oc-quitar"
                                            onClick={() => setParaStock(prev => prev.filter((_, k) => k !== i))}>
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            <section className="oc-bloque">
                <h3>Notas</h3>
                <textarea className="oc-notas" rows={2} value={notas} onChange={e => setNotas(e.target.value)}
                    placeholder="Opcional: tela, prioridad, quién corta..." />
            </section>

            <div className="oc-form-acciones">
                <button className="oc-btn-primario" onClick={guardar} disabled={guardando || !totalUnidades}>
                    <Save size={16} /> {guardando ? 'Creando...' : `Crear orden (${totalUnidades} unidades)`}
                </button>
            </div>

            <style>{`
                .oc-form-top { display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-bottom:18px; }
                .oc-btn-volver { display:flex; align-items:center; gap:6px; background:#f1f5f9; border:none; padding:8px 14px; border-radius:10px; font-weight:700; font-size:13px; color:#475569; cursor:pointer; }
                .oc-bloque { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:20px; margin-bottom:16px; }
                .oc-bloque h3 { margin:0 0 4px; font-size:15px; font-weight:800; color:#1e1b4b; }
                .oc-hint { margin:0 0 14px; font-size:13px; color:#64748b; line-height:1.5; }
                .oc-vacio { padding:20px; text-align:center; color:#64748b; font-size:13px; background:#f8fafc; border-radius:10px; }
                .oc-tabla { width:100%; border-collapse:collapse; font-size:13px; }
                .oc-tabla th { text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.5px; color:#64748b; border-bottom:2px solid #1e1b4b; padding:8px 6px; }
                .oc-tabla td { padding:9px 6px; border-bottom:1px solid #e2e8f0; vertical-align:middle; }
                .oc-tabla .num { text-align:right; }
                .oc-tabla tr.elegida { background:#f0fdf4; }
                .oc-config { color:#64748b; font-size:12px; }
                .oc-buscador { width:100%; height:42px; padding:0 14px; border:1px solid #e2e8f0; border-radius:10px; font-size:14px; margin-bottom:10px; }
                .oc-resultados { display:flex; flex-direction:column; gap:4px; margin-bottom:12px; max-height:220px; overflow-y:auto; }
                .oc-resultado { display:flex; align-items:center; gap:8px; text-align:left; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 10px; font-size:13px; cursor:pointer; color:#334155; }
                .oc-resultado:hover { background:#eef2ff; }
                .oc-cantidad { width:70px; height:34px; text-align:right; padding:0 8px; border:1px solid #e2e8f0; border-radius:8px; }
                .oc-quitar { background:none; border:none; color:#dc2626; cursor:pointer; padding:4px; }
                .oc-notas { width:100%; padding:10px 12px; border:1px solid #e2e8f0; border-radius:10px; font-size:13px; font-family:inherit; resize:vertical; }
                .oc-form-acciones { display:flex; justify-content:flex-end; }
                .oc-btn-primario { display:flex; align-items:center; gap:8px; background:#1e1b4b; color:#fff; border:none; padding:12px 22px; border-radius:12px; font-weight:800; font-size:14px; cursor:pointer; }
                .oc-btn-primario:disabled { opacity:.5; cursor:not-allowed; }
            `}</style>
        </div>
    );
};

export default OrdenCorteForm;
