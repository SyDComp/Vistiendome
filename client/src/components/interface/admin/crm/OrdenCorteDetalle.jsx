import React, { useState } from 'react';
import { ArrowLeft, Printer, Copy, Scissors } from 'lucide-react';
import SectionHeader from '../../../ui/admin/SectionHeader';
import { useNotification } from '../../../../context/NotificationContext';
import { cambiarEstadoOrden, repetirOrden } from '../../../../lib/api/endpoints';

export const ESTADOS = [
    { value: 'PENDIENTE', label: 'Pendiente', color: '#64748b', bg: '#f1f5f9' },
    { value: 'EN_PROCESO', label: 'En proceso', color: '#b45309', bg: '#fef3c7' },
    { value: 'FINALIZADA', label: 'Finalizada', color: '#15803d', bg: '#dcfce7' },
    { value: 'CANCELADA', label: 'Cancelada', color: '#b91c1c', bg: '#fee2e2' },
];

export const estiloEstado = (e) => ESTADOS.find(x => x.value === e) || ESTADOS[0];

const etiquetaConfig = (config) =>
    Object.entries(config || {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(' · ');

const OrdenCorteDetalle = ({ orden, onVolver, onCambio }) => {
    const { toast, confirm } = useNotification();
    const [guardando, setGuardando] = useState(false);

    const cambiar = async (estado) => {
        const aplicar = async () => {
            setGuardando(true);
            try {
                const act = await cambiarEstadoOrden(orden.id, estado);
                onCambio?.(act);
                toast.success(`Orden N° ${orden.numero}: ${estiloEstado(estado).label.toLowerCase()}`);
            } catch (err) {
                toast.error(err?.message || 'No se pudo cambiar el estado');
            } finally {
                setGuardando(false);
            }
        };

        // Finalizar mueve inventario y marca piezas: conviene confirmarlo.
        // `confirm` toma un TEXTO y devuelve la respuesta; pasarle un objeto lo
        // renderiza como hijo de React y deja la pantalla en blanco.
        if (estado === 'FINALIZADA') {
            const unidades = orden.items.filter(i => i.para_stock).reduce((a, i) => a + i.cantidad, 0);
            const aviso = unidades
                ? `Finalizar la orden N° ${orden.numero}: las piezas de pedidos quedarán marcadas como cortadas y se sumarán ${unidades} unidades al inventario. ¿Continuar?`
                : `Finalizar la orden N° ${orden.numero}: las piezas de pedidos quedarán marcadas como cortadas. ¿Continuar?`;
            if (!await confirm(aviso)) return;
        }
        await aplicar();
    };

    const repetir = async () => {
        try {
            const nueva = await repetirOrden(orden.id);
            toast.success(`Se creó la orden N° ${nueva.numero} con las mismas piezas`);
            onCambio?.(nueva, { navegarA: nueva });
        } catch (err) {
            toast.error(err?.message || 'No se pudo repetir la orden');
        }
    };

    /** Documento propio: si se usara window.print() saldría el panel entero. */
    const imprimir = () => {
        const filas = orden.items.map(i => `
            <tr>
                <td>${i.producto || '—'}</td>
                <td>${etiquetaConfig(i.config)}</td>
                <td>${i.para_stock ? 'Stock' : `Pedido N° ${i.pedido_numero ?? '—'}${i.cliente ? ' · ' + i.cliente : ''}`}</td>
                <td class="num">${i.cantidad}</td>
                <td class="check"></td>
            </tr>`).join('');

        const w = window.open('', '_blank', 'width=1000,height=800');
        if (!w) return toast.error('El navegador bloqueó la ventana de impresión');
        w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Orden de Corte N° ${orden.numero}</title>
        <style>
            *{box-sizing:border-box}
            body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:16mm 12mm;color:#000}
            h1{font-size:20px;margin:0 0 2px}
            .meta{font-size:12px;color:#555;margin-bottom:14px}
            .notas{font-size:12px;background:#f5f5f5;padding:8px 10px;border-radius:4px;margin-bottom:14px}
            table{width:100%;border-collapse:collapse;font-size:12px}
            th{text-align:left;border-bottom:2px solid #000;padding:6px 4px;font-size:10px;text-transform:uppercase;letter-spacing:.5px}
            td{padding:7px 4px;border-bottom:1px solid #ddd;vertical-align:top}
            .num{text-align:right}
            .check{width:34px}
            .check:after{content:'';display:block;width:15px;height:15px;border:1.5px solid #000;margin:0 auto}
            tfoot td{border:0;padding-top:10px;font-weight:700}
            @page{margin:10mm}
        </style></head><body>
        <h1>Orden de Corte N° ${orden.numero}</h1>
        <div class="meta">${estiloEstado(orden.estado).label} · ${orden.items.length} piezas · ${orden.total_unidades} unidades · ${new Date(orden.created_at).toLocaleDateString('es-CL')}</div>
        ${orden.notas ? `<div class="notas">${orden.notas}</div>` : ''}
        <table>
            <thead><tr><th>Producto</th><th>Características</th><th>Origen</th><th class="num">Cant.</th><th></th></tr></thead>
            <tbody>${filas}</tbody>
            <tfoot><tr><td colspan="3"></td><td class="num">${orden.total_unidades}</td><td></td></tr></tfoot>
        </table>
        <script>window.onload=function(){setTimeout(function(){window.print();window.close();},400)}<\/script>
        </body></html>`);
        w.document.close();
    };

    const est = estiloEstado(orden.estado);
    const finalizada = orden.estado === 'FINALIZADA';

    return (
        <div className="admin-module fade-in oc-detalle">
            <div className="oc-top">
                <button className="oc-btn-volver" onClick={onVolver}><ArrowLeft size={16} /> Volver</button>
                <SectionHeader
                    title={`Orden de Corte N° ${orden.numero}`}
                    subtitle={`${orden.items.length} piezas · ${orden.total_unidades} unidades`}
                    icon={Scissors}
                />
            </div>

            <div className="oc-barra">
                <span className="oc-estado" style={{ color: est.color, background: est.bg }}>{est.label}</span>

                <select value={orden.estado} disabled={guardando} onChange={e => cambiar(e.target.value)} className="oc-select">
                    {ESTADOS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>

                <button className="oc-btn" onClick={repetir}><Copy size={15} /> Repetir</button>
                <button className="oc-btn" onClick={imprimir}><Printer size={15} /> Imprimir</button>

                {orden.repetida_de_numero && (
                    <span className="oc-nota-rep">Repetición de la N° {orden.repetida_de_numero}</span>
                )}
                {orden.veces_repetida > 0 && (
                    <span className="oc-nota-rep">Se repitió {orden.veces_repetida} {orden.veces_repetida === 1 ? 'vez' : 'veces'}</span>
                )}
            </div>

            {finalizada && (
                <p className="oc-aviso">
                    Orden finalizada el {new Date(orden.finalizada_at).toLocaleDateString('es-CL')}.
                    Las piezas de pedidos quedaron marcadas como cortadas y las de stock ya entraron al inventario.
                </p>
            )}

            {orden.notas && <p className="oc-notas-vista">{orden.notas}</p>}

            <table className="oc-tabla">
                <thead>
                    <tr><th>Producto</th><th>Características</th><th>Origen</th><th className="num">Cantidad</th></tr>
                </thead>
                <tbody>
                    {orden.items.map(i => (
                        <tr key={i.id}>
                            <td>{i.producto || '—'}</td>
                            <td className="oc-config">{etiquetaConfig(i.config)}</td>
                            <td>
                                {i.para_stock
                                    ? <span className="oc-origen stock">Stock</span>
                                    : <span className="oc-origen pedido">Pedido N° {i.pedido_numero ?? '—'}{i.cliente ? ` · ${i.cliente}` : ''}</span>}
                            </td>
                            <td className="num">{i.cantidad}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <style>{`
                .oc-top { display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-bottom:16px; }
                .oc-btn-volver { display:flex; align-items:center; gap:6px; background:#f1f5f9; border:none; padding:8px 14px; border-radius:10px; font-weight:700; font-size:13px; color:#475569; cursor:pointer; }
                .oc-barra { display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:14px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; margin-bottom:14px; }
                .oc-estado { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.5px; padding:5px 12px; border-radius:20px; }
                .oc-select { height:36px; padding:0 10px; border:1px solid #e2e8f0; border-radius:8px; background:#fff; font-size:13px; }
                .oc-btn { display:flex; align-items:center; gap:6px; background:#fff; border:1px solid #e2e8f0; padding:8px 14px; border-radius:8px; font-size:13px; font-weight:700; color:#334155; cursor:pointer; }
                .oc-btn:hover { background:#eef2ff; }
                .oc-nota-rep { font-size:12px; color:#64748b; margin-left:auto; }
                .oc-aviso { font-size:13px; color:#15803d; background:#f0fdf4; border:1px solid #bbf7d0; padding:10px 14px; border-radius:10px; margin:0 0 14px; }
                .oc-notas-vista { font-size:13px; color:#475569; background:#f8fafc; padding:10px 14px; border-radius:10px; margin:0 0 14px; }
                .oc-tabla { width:100%; border-collapse:collapse; font-size:13px; }
                .oc-tabla th { text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.5px; color:#64748b; border-bottom:2px solid #1e1b4b; padding:8px 6px; }
                .oc-tabla td { padding:10px 6px; border-bottom:1px solid #e2e8f0; }
                .oc-tabla .num { text-align:right; }
                .oc-config { color:#64748b; font-size:12px; }
                .oc-origen { font-size:11px; font-weight:700; padding:3px 9px; border-radius:6px; }
                .oc-origen.stock { background:#eef2ff; color:#4338ca; }
                .oc-origen.pedido { background:#f1f5f9; color:#475569; }
            `}</style>
        </div>
    );
};

export default OrdenCorteDetalle;
