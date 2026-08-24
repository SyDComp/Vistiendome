import React, { useState, useEffect, useCallback } from 'react';
import { Scissors, Plus, Trash2 } from 'lucide-react';
import SectionHeader from '../../../ui/admin/SectionHeader';
import { useNotification } from '../../../../context/NotificationContext';
import { getOrdenesCorte, eliminarOrden } from '../../../../lib/api/endpoints';
import OrdenCorteForm from './OrdenCorteForm';
import OrdenCorteDetalle, { ESTADOS, estiloEstado } from './OrdenCorteDetalle';

/**
 * Órdenes de corte: lista, alta y detalle.
 *
 * La orden es una entidad que arma Paola, no una vista derivada de las ventas:
 * corta para cumplir pedidos, pero también para tener stock. Antes esto era
 * sólo una lista de piezas pendientes, que cubría la mitad de su trabajo.
 */
const OrdenCorteView = () => {
    const { toast, confirm } = useNotification();
    const [vista, setVista] = useState('lista');   // lista | nueva | detalle
    const [ordenes, setOrdenes] = useState([]);
    const [actual, setActual] = useState(null);
    const [filtro, setFiltro] = useState('');
    const [cargando, setCargando] = useState(true);

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            setOrdenes(await getOrdenesCorte(filtro || undefined) || []);
        } catch {
            toast.error('No se pudieron cargar las órdenes de corte');
        } finally {
            setCargando(false);
        }
    }, [filtro]);

    useEffect(() => { if (vista === 'lista') cargar(); }, [vista, cargar]);

    // `confirm` toma un TEXTO y devuelve la respuesta, no un objeto con callback.
    const borrar = async (o) => {
        if (!await confirm(`¿Eliminar la orden N° ${o.numero} y sus piezas? No se puede deshacer.`)) return;
        try {
            await eliminarOrden(o.id);
            toast.success('Orden eliminada');
            cargar();
        } catch (err) {
            toast.error(err?.message || 'No se pudo eliminar');
        }
    };

    if (vista === 'nueva') {
        return (
            <OrdenCorteForm
                onVolver={() => setVista('lista')}
                onCreada={(o) => { setActual(o); setVista('detalle'); }}
            />
        );
    }

    if (vista === 'detalle' && actual) {
        return (
            <OrdenCorteDetalle
                orden={actual}
                onVolver={() => { setActual(null); setVista('lista'); }}
                onCambio={(act, opts) => setActual(opts?.navegarA || act)}
            />
        );
    }

    return (
        <div className="admin-module fade-in oc-lista">
            <div className="oc-encabezado">
                <SectionHeader
                    title="Órdenes de Corte"
                    subtitle={`${ordenes.length} ${ordenes.length === 1 ? 'orden' : 'órdenes'}`}
                    icon={Scissors}
                />
                <div className="oc-acciones">
                    <select value={filtro} onChange={e => setFiltro(e.target.value)} className="oc-select">
                        <option value="">Todos los estados</option>
                        {ESTADOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <button className="oc-btn-nueva" onClick={() => setVista('nueva')}>
                        <Plus size={17} strokeWidth={3} /> Nueva orden de corte
                    </button>
                </div>
            </div>

            {cargando ? (
                <div className="oc-vacio">Cargando...</div>
            ) : ordenes.length === 0 ? (
                <div className="oc-vacio">
                    <strong>Todavía no hay órdenes de corte.</strong>
                    <p>
                        Una orden de corte reúne lo que vas a cortar: piezas de pedidos ya
                        confirmados y también prendas para tener en stock. Al finalizarla,
                        las piezas de pedidos quedan marcadas como cortadas y las de stock
                        entran al inventario.
                    </p>
                    <button className="oc-btn-nueva" onClick={() => setVista('nueva')}>
                        <Plus size={17} strokeWidth={3} /> Crear la primera
                    </button>
                </div>
            ) : (
                <table className="oc-tabla">
                    <thead>
                        <tr><th>N°</th><th>Estado</th><th>Fecha</th><th className="num">Piezas</th><th className="num">Unidades</th><th>Notas</th><th></th></tr>
                    </thead>
                    <tbody>
                        {ordenes.map(o => {
                            const est = estiloEstado(o.estado);
                            return (
                                <tr key={o.id} onClick={() => { setActual(o); setVista('detalle'); }} className="oc-fila">
                                    <td className="oc-numero">{o.numero}</td>
                                    <td><span className="oc-estado" style={{ color: est.color, background: est.bg }}>{est.label}</span></td>
                                    <td>{new Date(o.created_at).toLocaleDateString('es-CL')}</td>
                                    <td className="num">{o.items.length}</td>
                                    <td className="num">{o.total_unidades}</td>
                                    <td className="oc-notas">
                                        {o.notas || '—'}
                                        {o.veces_repetida > 0 && <span className="oc-badge-rep">repetida {o.veces_repetida}×</span>}
                                    </td>
                                    <td>
                                        {o.estado !== 'FINALIZADA' && (
                                            <button className="oc-quitar" title="Eliminar"
                                                onClick={e => { e.stopPropagation(); borrar(o); }}>
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}

            <style>{`
                .oc-encabezado { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:14px; margin-bottom:18px; }
                .oc-acciones { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
                .oc-select { height:40px; padding:0 12px; border:1px solid #e2e8f0; border-radius:10px; background:#fff; font-size:13px; }
                .oc-btn-nueva { display:flex; align-items:center; gap:8px; background:linear-gradient(135deg,#8f0653,#d946ef); color:#fff; border:none; padding:11px 18px; border-radius:10px; font-weight:800; font-size:13px; cursor:pointer; box-shadow:0 4px 12px rgba(143,6,83,.25); }
                .oc-vacio { padding:56px 20px; text-align:center; color:#64748b; font-size:14px; }
                .oc-vacio strong { display:block; color:#334155; font-size:16px; margin-bottom:8px; }
                .oc-vacio p { max-width:520px; margin:0 auto 18px; line-height:1.6; font-size:13px; }
                .oc-tabla { width:100%; border-collapse:collapse; font-size:13px; }
                .oc-tabla th { text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.5px; color:#64748b; border-bottom:2px solid #1e1b4b; padding:8px 6px; }
                .oc-tabla td { padding:11px 6px; border-bottom:1px solid #e2e8f0; }
                .oc-tabla .num { text-align:right; }
                .oc-fila { cursor:pointer; }
                .oc-fila:hover { background:#f8fafc; }
                .oc-numero { font-weight:800; color:#1e1b4b; }
                .oc-estado { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.5px; padding:4px 10px; border-radius:20px; }
                .oc-notas { color:#64748b; font-size:12px; }
                .oc-badge-rep { margin-left:8px; font-size:10px; font-weight:800; color:#4338ca; background:#eef2ff; padding:2px 7px; border-radius:6px; }
                .oc-quitar { background:none; border:none; color:#dc2626; cursor:pointer; padding:4px; }
            `}</style>
        </div>
    );
};

export default OrdenCorteView;
