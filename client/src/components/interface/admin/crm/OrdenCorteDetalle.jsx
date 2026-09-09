import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Printer, Copy, Scissors } from 'lucide-react';
import SectionHeader from '../../../ui/admin/SectionHeader';
import { useNotification } from '../../../../context/NotificationContext';
import { cambiarEstadoOrden, repetirOrden } from '../../../../lib/api/endpoints';
import TablaPrendas from './TablaPrendas';
import { imprimirOrdenCorte } from './imprimirOrdenCorte';
import useCaracteristicasCorte from '../../../../hooks/useCaracteristicasCorte';
import './OrdenCorteDetalle.css';

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
        <div className="fade-in oc-detalle">
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

        </div>
    );
};

export default OrdenCorteDetalle;
