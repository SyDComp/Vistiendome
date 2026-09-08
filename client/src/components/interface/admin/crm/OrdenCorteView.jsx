import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Scissors, Plus, Trash2 } from 'lucide-react';
import SectionHeader from '../../../ui/admin/SectionHeader';
import { useNotification } from '../../../../context/NotificationContext';
import { getOrdenesCorte, eliminarOrden } from '../../../../lib/api/endpoints';
import OrdenCorteForm from './OrdenCorteForm';
import OrdenCorteDetalle, { ESTADOS, estiloEstado } from './OrdenCorteDetalle';
import './OrdenCorteView.css';

/**
 * Órdenes de corte: lista, alta y detalle.
 *
 * La orden es una entidad que arma el taller, no una vista derivada de las ventas:
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
    const [searchParams, setSearchParams] = useSearchParams();

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

    // Se llega acá desde un pedido con ?orden=<id>: se abre esa orden sola. Se
    // limpia el parámetro después, para que recargar no la vuelva a abrir.
    useEffect(() => {
        const id = searchParams.get('orden');
        if (!id || !ordenes.length) return;
        const orden = ordenes.find(o => o.id === id);
        if (orden) {
            setActual(orden);
            setVista('detalle');
        } else {
            toast.error('Esa orden de corte ya no existe');
        }
        setSearchParams(prev => {
            const p = new URLSearchParams(prev);
            p.delete('orden');
            return p;
        }, { replace: true });
    }, [ordenes, searchParams, setSearchParams]);

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

        </div>
    );
};

export default OrdenCorteView;
