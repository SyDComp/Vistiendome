import React, { useState } from 'react';
import { useNotification } from '../../../../../context/NotificationContext';
import { anotarFondo, cerrarArqueo } from '../../../../../lib/api/endpoints';
import { formatCurrency } from '../../../../../utils/cartUtils';
import { mensajeDeError } from '../../../../../utils/errorServidor';
import { desdeServidor } from '../../../../../utils/fechaServidor';
import { hora } from './fechas';

const numero = (texto) => (String(texto).trim() === '' ? null : Math.round(Number(String(texto).replace(/\D/g, ''))));

/** "Sobran $1.000", "Faltan $1.000" o "Cuadra". */
export const textoDiferencia = (d) => (d === 0 ? 'Cuadra' : d > 0 ? `Sobran ${formatCurrency(d)}` : `Faltan ${formatCurrency(-d)}`);

/**
 * El cajón del día: con cuánto partió, cuánto debería haber, cuánto se contó y
 * cuánto se deja para mañana. Antes solo decía lo cobrado en efectivo, y eso no
 * cuadra con el cajón si no se sabe con cuánto partió (reportado por QA
 * 2026-11-20). La cuenta la hace el servidor (core/caja/arqueo.py).
 */
const ArqueoCajon = ({ arqueo, onCambio }) => {
    const { toast } = useNotification();
    const [fondo, setFondo] = useState(null);       // null: no se está editando
    const [cierre, setCierre] = useState(null);     // {contado, deja, nota} mientras se edita
    const [guardando, setGuardando] = useState(false);
    const a = arqueo;

    const guardar = async (accion, exito) => {
        setGuardando(true);
        try {
            onCambio(await accion());
            toast.success(exito);
            setFondo(null);
            setCierre(null);
        } catch (err) {
            toast.error(mensajeDeError(err?.message, 'No se pudo guardar'));
        } finally {
            setGuardando(false);
        }
    };

    const sinFondo = a.fondo_inicial === null;
    const editandoFondo = sinFondo || fondo !== null;
    const valorFondo = fondo ?? (a.fondo_propuesto ?? '');

    return (
        <section className="cc-cajon cc-arqueo" aria-label="Efectivo en el cajón">
            <div className="cc-arqueo-fila">
                <span>Fondo con que partió el cajón</span>
                {editandoFondo ? (
                    <span className="cc-arqueo-edicion">
                        <input className="sp-select cc-arqueo-monto" inputMode="numeric" aria-label="Fondo con que partió"
                            value={valorFondo} onChange={e => setFondo(e.target.value)} placeholder="$ 0" disabled={guardando} />
                        <button type="button" className="sp-boton sp-boton--principal" disabled={guardando || numero(valorFondo) === null}
                            onClick={() => guardar(() => anotarFondo(a.fecha, numero(valorFondo)), 'Fondo anotado')}>Anotar</button>
                        {!sinFondo && <button type="button" className="sp-boton" onClick={() => setFondo(null)} disabled={guardando}>Cancelar</button>}
                    </span>
                ) : (
                    <span className="cc-arqueo-edicion">
                        <strong>{formatCurrency(a.fondo_inicial)}</strong>
                        <button type="button" className="sp-boton" onClick={() => setFondo(String(a.fondo_inicial))}>Cambiar</button>
                    </span>
                )}
            </div>
            {sinFondo && a.fondo_propuesto !== null && (
                <small>Se propone lo que se dejó al cerrar el día anterior.</small>
            )}

            {/* Lo cobrado, no lo que la clienta entregó: si pagó $40.000 una compra de
                $38.970, entraron $38.970 (el vuelto nunca fue de la tienda). QA lo leyó
                como que faltaba restar el vuelto (2026-11-21): el texto lo dice. */}
            <div className="cc-arqueo-fila"><span>Efectivo que entró hoy (ventas y abonos, el vuelto ya descontado)</span><span>{formatCurrency(a.efectivo_del_dia || 0)}</span></div>
            <div className="cc-arqueo-fila cc-arqueo-total">
                <span>Debería haber en el cajón</span>
                <strong>{a.deberia === null ? '—' : formatCurrency(a.deberia)}</strong>
            </div>
            {a.deberia === null && <small>Anota con cuánto partió el cajón para saber cuánto debería haber.</small>}

            {a.deberia !== null && (cierre ? (
                <div className="cc-arqueo-cierre">
                    <label>Contado en el cajón
                        <input className="sp-select cc-arqueo-monto" inputMode="numeric" value={cierre.contado}
                            onChange={e => setCierre({ ...cierre, contado: e.target.value })} placeholder="$ 0" disabled={guardando} autoFocus />
                    </label>
                    <label>Se deja para mañana
                        <input className="sp-select cc-arqueo-monto" inputMode="numeric" value={cierre.deja}
                            onChange={e => setCierre({ ...cierre, deja: e.target.value })} placeholder="Todo lo contado" disabled={guardando} />
                    </label>
                    <label className="cc-arqueo-nota">Nota
                        <input className="sp-select" value={cierre.nota} maxLength={500} placeholder="Ej: se llevó $50.000 al banco"
                            onChange={e => setCierre({ ...cierre, nota: e.target.value })} disabled={guardando} />
                    </label>
                    <span className="cc-arqueo-edicion">
                        <button type="button" className="sp-boton" onClick={() => setCierre(null)} disabled={guardando}>Cancelar</button>
                        <button type="button" className="sp-boton sp-boton--principal" disabled={guardando || numero(cierre.contado) === null}
                            onClick={() => guardar(() => cerrarArqueo(a.fecha, { contado: numero(cierre.contado), deja: numero(cierre.deja), nota: cierre.nota }), 'Cierre del cajón guardado')}>
                            Guardar cierre
                        </button>
                    </span>
                </div>
            ) : a.contado === null ? (
                <span className="cc-arqueo-edicion">
                    <button type="button" className="sp-boton sp-boton--principal" onClick={() => setCierre({ contado: '', deja: '', nota: '' })}>
                        Contar el cajón
                    </button>
                </span>
            ) : (
                <>
                    <div className="cc-arqueo-fila"><span>Contado</span><span>{formatCurrency(a.contado)}</span></div>
                    <div className={`cc-arqueo-fila cc-arqueo-diferencia${a.diferencia === 0 ? '' : ' cc-arqueo-diferencia--no'}`}>
                        <span>Diferencia</span><strong>{textoDiferencia(a.diferencia)}</strong>
                    </div>
                    <div className="cc-arqueo-fila"><span>Se dejó para mañana</span><span>{formatCurrency(a.deja)}</span></div>
                    {a.nota && <small>{a.nota}</small>}
                    <small>Cerró {a.cerrado_por}{a.cerrado_en ? ` a las ${hora(desdeServidor(a.cerrado_en))}` : ''}</small>
                    <span className="cc-arqueo-edicion">
                        <button type="button" className="sp-boton" onClick={() => setCierre({ contado: String(a.contado), deja: String(a.deja ?? ''), nota: a.nota || '' })}>
                            Corregir
                        </button>
                    </span>
                </>
            ))}
        </section>
    );
};

export default ArqueoCajon;
