import React, { useState } from 'react';
import { useNotification } from '../../../../../../context/NotificationContext';
import { registrarPago } from '../../../../../../lib/api/endpoints';
import { montoDesde } from '../../../../../../utils/pagos';
import { formatCurrency } from '../../../../../../utils/cartUtils';
import { mensajeDeError } from '../../../../../../utils/errorServidor';

// El medio con que se paga usando el saldo a favor (core/pagos/a_favor.py).
const MEDIO_A_FAVOR = 'Saldo a favor';

/**
 * "Registrar pago": monto, medio (los de Ajustes del negocio) y una nota
 * opcional. `sugerido`: lo que falta pagar, para no tener que escribirlo.
 * `aFavor`: lo que la clienta tiene a favor de otras compras; si tiene, se
 * puede pagar con eso. Entonces se muestra de qué pedidos viene (`origenes`,
 * con el nombre y el teléfono que se dieron ahí) y lo que no calza con este
 * pedido (`avisos`): si algo no calza, la nota es obligatoria (cómo se
 * verificó que es la misma persona).
 */
const RegistrarPago = ({ pedidoId, medios = [], aFavor = 0, origenes = [], avisos = [], sugerido, onRegistrado, onCancelar }) => {
    const { toast } = useNotification();
    const [monto, setMonto] = useState(sugerido > 0 ? String(sugerido) : '');
    const [medio, setMedio] = useState(medios[0] || '');
    const [nota, setNota] = useState('');
    const [enviando, setEnviando] = useState(false);
    const valor = montoDesde(monto);
    const conAFavor = medio === MEDIO_A_FAVOR;
    const pideNota = conAFavor && avisos.length > 0;

    const registrar = async () => {
        setEnviando(true);
        try {
            const r = await registrarPago(pedidoId, { monto: valor, medio, nota: nota.trim() || null });
            toast.success('Pago registrado');
            onRegistrado(r);
        } catch (err) {
            toast.error(mensajeDeError(err?.message, 'No se pudo registrar el pago'));
        } finally {
            setEnviando(false);
        }
    };

    return (
        <div className="sp-canal-edicion">
            <label className="sp-pago-campo">
                Monto
                <input type="text" inputMode="numeric" className="sp-select" placeholder="Ej: 15.000"
                    value={monto} onChange={e => setMonto(e.target.value)} disabled={enviando} />
            </label>
            <label className="sp-pago-campo">
                Medio de pago
                <select className="sp-select" value={medio} onChange={e => setMedio(e.target.value)} disabled={enviando}>
                    {medios.map(m => <option key={m} value={m}>{m}</option>)}
                    {aFavor > 0 && (
                        <option value={MEDIO_A_FAVOR}>{MEDIO_A_FAVOR} (tiene {formatCurrency(aFavor)})</option>
                    )}
                </select>
            </label>
            {conAFavor && (
                <div className="sp-verificar">
                    {origenes.map(o => (
                        <p key={o.pedido_numero} className="sp-prenda-detalle">
                            {formatCurrency(o.monto)} a favor del pedido N° {o.pedido_numero}
                            {' · '}{o.nombre || 'sin nombre'} · {o.telefono || 'sin teléfono'}
                        </p>
                    ))}
                    {avisos.length > 0 && (
                        <ul className="sp-falta" role="alert">{avisos.map(a => <li key={a}>{a}</li>)}</ul>
                    )}
                </div>
            )}
            <label className="sp-pago-campo">
                {pideNota ? 'Nota (obligatoria: cómo verificaste que es la misma persona)' : 'Nota (opcional)'}
                <input type="text" className="sp-select" maxLength={300} placeholder="Ej: abono por transferencia"
                    value={nota} onChange={e => setNota(e.target.value)} disabled={enviando} />
            </label>
            <div className="sp-acciones">
                <button type="button" className="sp-boton" onClick={onCancelar} disabled={enviando}>Cancelar</button>
                <button type="button" className="sp-boton sp-boton--principal" onClick={registrar}
                    disabled={enviando || !valor || !medio || (pideNota && !nota.trim())}>
                    {enviando ? 'Registrando…' : 'Registrar pago'}
                </button>
            </div>
        </div>
    );
};

export default RegistrarPago;
