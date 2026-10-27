import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { useNotification } from '../../../../../context/NotificationContext';
import { obtenerPedido } from '../../../../../lib/api/endpoints';
import { formatCurrency } from '../../../../../utils/cartUtils';
import { mensajeDeError } from '../../../../../utils/errorServidor';
import useImprimirComprobante from '../comprobante/useImprimirComprobante';
import { fechaLarga, hora, otroDia } from './fechas';
import { imprimirCierre } from './imprimirCierre';
import useCierre from './useCierre';
import './cierre.css';

/**
 * El cierre de caja de un día, en pantalla: el efectivo que debería haber en
 * el cajón, lo cobrado por medio, las ventas de la caja (con su comprobante
 * para reimprimir) y lo anulado después. Se imprime en la térmica.
 * Teclado: ← → otro día, I imprimir. Lo usan la caja (en una ventana) y el panel.
 */
const CierreDelDia = () => {
    const { toast } = useNotification();
    const imprimir = useImprimirComprobante();
    const [fecha, setFecha] = useState(null);          // null: hoy
    const { cierre, error, cargando } = useCierre(fecha);
    const dia = cierre?.fecha;

    const reimprimir = async (pedidoId) => {
        try {
            await imprimir(await obtenerPedido(pedidoId), { reimpreso: true });
        } catch (err) {
            toast.error(mensajeDeError(err?.message, 'No se pudo imprimir el comprobante'));
        }
    };

    useEffect(() => {
        const teclas = (e) => {
            if (e.target instanceof HTMLInputElement || !dia) return;
            if (e.key === 'ArrowLeft') setFecha(otroDia(dia, -1));
            else if (e.key === 'ArrowRight') setFecha(otroDia(dia, 1));
            else if (e.key.toLowerCase() === 'i' && cierre) imprimirCierre(cierre);
            else return;
            e.preventDefault();
        };
        window.addEventListener('keydown', teclas);
        return () => window.removeEventListener('keydown', teclas);
    }, [dia, cierre]);

    return (
        <div className="cc">
            <div className="cc-dia">
                <button type="button" className="cj-icono" aria-label="Día anterior" disabled={!dia}
                    onClick={() => setFecha(otroDia(dia, -1))}><ChevronLeft size={18} /></button>
                <label className="cc-fecha">
                    <span className="cj-oculto">Día del cierre</span>
                    <input type="date" className="sp-select" value={dia || ''} onChange={e => e.target.value && setFecha(e.target.value)} />
                </label>
                <button type="button" className="cj-icono" aria-label="Día siguiente" disabled={!dia}
                    onClick={() => setFecha(otroDia(dia, 1))}><ChevronRight size={18} /></button>
                <button type="button" className="sp-boton" onClick={() => setFecha(null)}>Hoy</button>
                <span className="cc-largo">{dia && fechaLarga(dia)}</span>
                <button type="button" className="cj-cobrar cc-imprimir" disabled={!cierre} onClick={() => imprimirCierre(cierre)}>
                    <Printer size={18} /> Imprimir cierre <kbd>I</kbd>
                </button>
            </div>

            {error && <p className="cj-aviso cj-aviso--error" role="alert">{error}</p>}
            {cargando && !cierre && <p className="cj-vacio" aria-busy="true">Cargando el cierre…</p>}

            {cierre && (
                <div className="cc-cuerpo">
                    <section className="cc-cajon" aria-label="Efectivo en el cajón">
                        {cierre.efectivo_en_cajon !== null ? (
                            <>
                                <span>Efectivo que debería haber en el cajón</span>
                                <strong>{formatCurrency(cierre.efectivo_en_cajon)}</strong>
                                <small>Todo lo cobrado en efectivo este día, en la caja o en un abono, menos lo devuelto en efectivo.</small>
                            </>
                        ) : <span>No hubo pagos en efectivo este día.</span>}
                    </section>

                    <section className="cc-bloque" aria-label="Cobrado por medio">
                        <h3>Cobrado por medio</h3>
                        {cierre.por_medio.length ? (
                            <table className="cc-tabla">
                                <thead><tr><th>Medio</th><th>Pagos</th><th>Cobrado</th><th>Devuelto</th><th>Neto</th></tr></thead>
                                <tbody>
                                    {cierre.por_medio.map(m => (
                                        <tr key={m.medio}>
                                            <td>{m.medio}</td><td>{m.pagos}</td><td>{formatCurrency(m.cobrado)}</td>
                                            <td>{m.devuelto ? formatCurrency(m.devuelto) : '—'}</td><td><strong>{formatCurrency(m.neto)}</strong></td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot><tr><td colSpan={4}>Total</td><td><strong>{formatCurrency(cierre.total_neto)}</strong></td></tr></tfoot>
                            </table>
                        ) : <p className="cc-nada">Sin pagos este día.</p>}
                        {cierre.con_saldo_a_favor > 0 && (
                            <p className="cc-nota">Además, {formatCurrency(cierre.con_saldo_a_favor)} se pagaron con saldo a favor: no es plata que entró hoy.</p>
                        )}
                    </section>

                    <section className="cc-bloque" aria-label="Ventas de la caja">
                        <h3>Ventas de la caja ({cierre.ventas_caja.length})</h3>
                        {cierre.ventas_caja.length ? (
                            <ul className="cc-ventas">
                                {cierre.ventas_caja.map(v => (
                                    <li key={v.pedido_id}>
                                        <span>N° {v.numero ?? '—'} · {hora(v.hora)}{v.estado !== 'DESPACHADA' && ' · entrega deshecha'}</span>
                                        <strong>{formatCurrency(v.total)}</strong>
                                        <button type="button" className="sp-boton" onClick={() => reimprimir(v.pedido_id)}>
                                            <Printer size={14} /> Comprobante
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="cc-nada">Ninguna venta en la caja este día.</p>}
                    </section>

                    {cierre.anulados_despues.length > 0 && (
                        <section className="cc-bloque" aria-label="Anulado después">
                            <h3>Anulado después</h3>
                            <ul className="cc-ventas">
                                {cierre.anulados_despues.map((a, i) => (
                                    <li key={i}><span>N° {a.numero ?? '—'} · {a.medio}</span><strong>{formatCurrency(a.monto)}</strong></li>
                                ))}
                            </ul>
                            <p className="cc-nota">Se anotaron este día y se anularon después: contaron en el cierre impreso ese día, hoy ya no cuentan.</p>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
};

export default CierreDelDia;
