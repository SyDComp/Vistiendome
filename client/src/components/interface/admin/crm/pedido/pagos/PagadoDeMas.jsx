import React, { useState } from 'react';
import { useNotification } from '../../../../../../context/NotificationContext';
import { dejarAFavor, devolverPago } from '../../../../../../lib/api/endpoints';
import { formatCurrency } from '../../../../../../utils/cartUtils';
import { montoDesde } from '../../../../../../utils/pagos';
import { mensajeDeError } from '../../../../../../utils/errorServidor';

/**
 * Lo pagado de más (se canceló el pedido o una prenda, bajó un precio): se
 * devuelve o queda a favor de la clienta para otra compra (decisión del
 * usuario 2026-10-13). Las dos cosas quedan en el libro de pagos.
 */
const PagadoDeMas = ({ pedidoId, deMas, medios = [], onCambio }) => {
    const { toast } = useNotification();
    const [accion, setAccion] = useState(null); // 'devolver' | 'a_favor'
    const [monto, setMonto] = useState(String(deMas));
    const [medio, setMedio] = useState(medios[0] || '');
    const [nota, setNota] = useState('');
    const [enviando, setEnviando] = useState(false);
    const valor = montoDesde(monto);

    const abrir = (cual) => { setAccion(cual); setMonto(String(deMas)); setNota(''); };

    const guardar = async () => {
        setEnviando(true);
        try {
            const r = accion === 'devolver'
                ? await devolverPago(pedidoId, { monto: valor, medio, nota: nota.trim() || null })
                : await dejarAFavor(pedidoId, { monto: valor, nota: nota.trim() || null });
            toast.success(accion === 'devolver' ? 'Devolución registrada' : 'Quedó a favor de la clienta');
            setAccion(null);
            onCambio(r);
        } catch (err) {
            toast.error(mensajeDeError(err?.message, 'No se pudo registrar'));
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="sp-de-mas">
            <p className="sp-pagos-saldo">Se pagó {formatCurrency(deMas)} de más. ¿Se devuelve o queda a favor de la clienta?</p>
            {!accion && (
                <div className="sp-acciones sp-acciones--izquierda">
                    <button type="button" className="sp-boton" onClick={() => abrir('devolver')}>Devolver</button>
                    <button type="button" className="sp-boton" onClick={() => abrir('a_favor')}>Dejar a favor</button>
                </div>
            )}
            {accion && (
                <div className="sp-canal-edicion">
                    <label className="sp-pago-campo">
                        {accion === 'devolver' ? 'Monto que se devuelve' : 'Monto que queda a favor'}
                        <input type="text" inputMode="numeric" className="sp-select" value={monto}
                            onChange={e => setMonto(e.target.value)} disabled={enviando} />
                    </label>
                    {accion === 'devolver' && (
                        <label className="sp-pago-campo">
                            Cómo se devuelve
                            <select className="sp-select" value={medio} onChange={e => setMedio(e.target.value)} disabled={enviando}>
                                {medios.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </label>
                    )}
                    <label className="sp-pago-campo">
                        Nota (opcional)
                        <input type="text" className="sp-select" maxLength={300} value={nota}
                            onChange={e => setNota(e.target.value)} disabled={enviando} />
                    </label>
                    <div className="sp-acciones">
                        <button type="button" className="sp-boton" onClick={() => setAccion(null)} disabled={enviando}>Cancelar</button>
                        <button type="button" className="sp-boton sp-boton--principal" onClick={guardar}
                            disabled={enviando || !valor || (accion === 'devolver' && !medio)}>
                            {enviando ? 'Guardando…' : accion === 'devolver' ? 'Registrar devolución' : 'Dejar a favor'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PagadoDeMas;
