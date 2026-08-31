import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Copy, Scissors } from 'lucide-react';
import SectionHeader from '../../../ui/admin/SectionHeader';
import { useNotification } from '../../../../context/NotificationContext';
import { cambiarEstadoOrden, repetirOrden } from '../../../../lib/api/endpoints';
import TablaPrendas from './TablaPrendas';
import { imprimirOrdenCorte } from './imprimirOrdenCorte';
import useCaracteristicasCorte from '../../../../hooks/useCaracteristicasCorte';

export const ESTADOS = [
    { value: 'PENDIENTE', label: 'Pendiente', color: '#64748b', bg: '#f1f5f9' },
    { value: 'EN_PROCESO', label: 'En proceso', color: '#b45309', bg: '#fef3c7' },
    { value: 'FINALIZADA', label: 'Finalizada', color: '#15803d', bg: '#dcfce7' },
    { value: 'CANCELADA', label: 'Cancelada', color: '#b91c1c', bg: '#fee2e2' },
];

export const estiloEstado = (e) => ESTADOS.find(x => x.value === e) || ESTADOS[0];

const OrdenCorteDetalle = ({ orden, onVolver, onCambio }) => {
    const { toast, confirm } = useNotification();
    const [guardando, setGuardando] = useState(false);
    const columnasCorte = useCaracteristicasCorte();
    const navigate = useNavigate();
    // Dos preguntas distintas sobre la misma orden, y hay que poder hacer las
    // dos: por modelo se corta (se tiende la tela de un modelo y salen todas
    // sus tallas juntas); por clienta se arma y se entrega, que es como está
    // hecha la planilla de papel.
    const [agruparPor, setAgruparPor] = useState('producto');

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

    const imprimir = () => {
        if (!imprimirOrdenCorte(orden, estiloEstado(orden.estado).label, columnasCorte, agruparPor)) {
            toast.error('El navegador bloqueó la ventana de impresión');
        }
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

            <div className="oc-agrupar" role="group" aria-label="Cómo agrupar la orden">
                <button
                    type="button"
                    className={agruparPor === 'producto' ? 'activo' : ''}
                    onClick={() => setAgruparPor('producto')}
                >
                    Por modelo
                    <small>para cortar</small>
                </button>
                <button
                    type="button"
                    className={agruparPor === 'cliente' ? 'activo' : ''}
                    onClick={() => setAgruparPor('cliente')}
                >
                    Por clienta
                    <small>para armar y entregar</small>
                </button>
            </div>

            <TablaPrendas
                items={orden.items}
                columnasPermitidas={columnasCorte}
                agruparPor={agruparPor}
                casilla
                // Agrupado por clienta ya se sabe de quién es cada fila: esa
                // columna sobra y el ancho lo necesita Producto.
                columnasExtra={agruparPor === 'cliente' ? [] : [{
                    clave: 'origen',
                    etiqueta: 'Para',
                    // Enlace, no etiqueta: desde acá se llega al pedido sin
                    // tener que ir a Cotizaciones y buscarlo a mano.
                    valor: (i) => (i.para_stock
                        ? <span className="oc-origen stock">Stock</span>
                        : <button
                            type="button"
                            className="oc-origen pedido oc-enlace"
                            disabled={!i.cotizacion_id}
                            title={i.cotizacion_id ? 'Ver este pedido' : undefined}
                            onClick={() => i.cotizacion_id
                                && navigate(`/admin/dashboard/crm/cotizaciones?pedido=${i.cotizacion_id}`)}
                          >
                            Pedido N° {i.pedido_numero ?? '—'}{i.cliente ? ` · ${i.cliente}` : ''}
                          </button>),
                }]}
                vacio="Esta orden no tiene piezas."
            />

            <style>{`
                .oc-top { display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-bottom:16px; }
                .oc-btn-volver { display:flex; align-items:center; gap:6px; background:#f1f5f9; border:none; padding:8px 14px; border-radius:10px; font-weight:700; font-size:13px; color:#475569; cursor:pointer; }
                .oc-barra { display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:14px 16px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; margin-bottom:14px; }
                .oc-agrupar { display:flex; gap:8px; margin-bottom:14px; flex-wrap:wrap; }
                .oc-agrupar button { display:flex; flex-direction:column; align-items:flex-start; gap:2px; background:#fff; border:1.5px solid #e2e8f0; border-radius:10px; padding:8px 14px; cursor:pointer; font-size:13px; font-weight:800; color:#475569; text-align:left; }
                .oc-agrupar button small { font-weight:600; font-size:11px; color:#94a3b8; }
                .oc-agrupar button.activo { border-color:#1e1b4b; background:#1e1b4b; color:#fff; }
                .oc-agrupar button.activo small { color:#c7d2fe; }
                .oc-estado { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:.5px; padding:5px 12px; border-radius:20px; }
                .oc-select { height:36px; padding:0 10px; border:1px solid #e2e8f0; border-radius:8px; background:#fff; font-size:13px; }
                .oc-btn { display:flex; align-items:center; gap:6px; background:#fff; border:1px solid #e2e8f0; padding:8px 14px; border-radius:8px; font-size:13px; font-weight:700; color:#334155; cursor:pointer; }
                .oc-btn:hover { background:#eef2ff; }
                .oc-nota-rep { font-size:12px; color:#64748b; margin-left:auto; }
                .oc-aviso { font-size:13px; color:#15803d; background:#f0fdf4; border:1px solid #bbf7d0; padding:10px 14px; border-radius:10px; margin:0 0 14px; }
                .oc-notas-vista { font-size:13px; color:#475569; background:#f8fafc; padding:10px 14px; border-radius:10px; margin:0 0 14px; }
                .oc-origen { font-size:11px; font-weight:700; padding:3px 9px; border-radius:6px; }
                .oc-origen.stock { background:#eef2ff; color:#4338ca; }
                .oc-enlace { border:none; font:inherit; cursor:pointer; text-decoration:underline; text-underline-offset:2px; }
                .oc-enlace:disabled { cursor:default; text-decoration:none; opacity:.7; }
                .oc-origen.pedido { background:#f1f5f9; color:#475569; }
            `}</style>
        </div>
    );
};

export default OrdenCorteDetalle;
