import React, { useState } from 'react';
import { useNotification } from '../../../../../../context/NotificationContext';
import { registrarPago } from '../../../../../../lib/api/endpoints';
import { montoDesde } from '../../../../../../utils/pagos';
import { mensajeDeError } from '../../../../../../utils/errorServidor';

/**
 * "Registrar pago": monto, medio (los de Ajustes del negocio) y una nota
 * opcional. `sugerido`: lo que falta pagar, para no tener que escribirlo.
 */
const RegistrarPago = ({ pedidoId, medios = [], sugerido, onRegistrado, onCancelar }) => {
    const { toast } = useNotification();
    const [monto, setMonto] = useState(sugerido > 0 ? String(sugerido) : '');
    const [medio, setMedio] = useState(medios[0] || '');
    const [nota, setNota] = useState('');
    const [enviando, setEnviando] = useState(false);
    const valor = montoDesde(monto);

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
                </select>
            </label>
            <label className="sp-pago-campo">
                Nota (opcional)
                <input type="text" className="sp-select" maxLength={300} placeholder="Ej: abono por transferencia"
                    value={nota} onChange={e => setNota(e.target.value)} disabled={enviando} />
            </label>
            <div className="sp-acciones">
                <button type="button" className="sp-boton" onClick={onCancelar} disabled={enviando}>Cancelar</button>
                <button type="button" className="sp-boton sp-boton--principal" onClick={registrar}
                    disabled={enviando || !valor || !medio}>
                    {enviando ? 'Registrando…' : 'Registrar pago'}
                </button>
            </div>
        </div>
    );
};

export default RegistrarPago;
