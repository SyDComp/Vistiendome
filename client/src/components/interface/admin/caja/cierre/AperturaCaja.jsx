import React, { useState } from 'react';
import { useNotification } from '../../../../../context/NotificationContext';
import { anotarFondo } from '../../../../../lib/api/endpoints';
import { mensajeDeError } from '../../../../../utils/errorServidor';
import PrecioInput from '../../../../ui/PrecioInput';
import useArqueo from './useArqueo';

/**
 * Al abrir la caja, si hoy no se anotó con cuánto parte el cajón, se pide (y se
 * propone lo que se dejó ayer). Anotado, desaparece. Sin esto el cierre no
 * puede decir cuánto debería haber (core/caja/arqueo.py).
 */
const AperturaCaja = () => {
    const { toast } = useNotification();
    const { arqueo, poner } = useArqueo(null);
    const [monto, setMonto] = useState(null);
    const [guardando, setGuardando] = useState(false);

    if (!arqueo || arqueo.fondo_inicial !== null) return null;
    const valor = monto ?? (arqueo.fondo_propuesto ?? '');
    const pesosDe = (t) => (String(t).trim() === '' ? null : Math.round(Number(String(t).replace(/\D/g, ''))));

    const anotar = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            poner(await anotarFondo(arqueo.fecha, pesosDe(valor)));
            toast.success('Fondo del cajón anotado', 'Caja abierta');
        } catch (err) {
            toast.error(mensajeDeError(err?.message, 'No se pudo anotar el fondo'));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <form className="cj-apertura" onSubmit={anotar}>
            <label htmlFor="cj-fondo">¿Con cuánto parte hoy el cajón?</label>
            <PrecioInput id="cj-fondo" className="sp-select" value={valor} placeholder="$ 0"
                onChange={setMonto} disabled={guardando} />
            <button type="submit" className="sp-boton sp-boton--principal" disabled={guardando || pesosDe(valor) === null}>Anotar</button>
            {arqueo.fondo_propuesto !== null && monto === null && <small>Es lo que se dejó al cerrar el día anterior.</small>}
        </form>
    );
};

export default AperturaCaja;
