import React, { useState } from 'react';
import { useNotification } from '../../../../../context/NotificationContext';
import { actualizarEstadoCotizacion, cancelarPrenda } from '../../../../../lib/api/endpoints';
import { activas, avisoCancelarPrenda } from '../../../../../utils/cancelarPrenda';
import { mensajeDeError } from '../../../../../utils/errorServidor';

/**
 * "Cancelar prenda" en un pedido confirmado. Antes de hacerlo dice qué pasa
 * con lo hecho. Si era la última prenda, pregunta (decisión del usuario
 * 2026-10-13): ¿se cancela el pedido entero? Si no, vuelve a "En conversación"
 * para agregar otras prendas.
 */
const CancelarPrenda = ({ pedido, prenda, onCambio }) => {
    const { toast, confirm } = useNotification();
    const [enviando, setEnviando] = useState(false);

    const cancelar = async () => {
        if (!await confirm(avisoCancelarPrenda(prenda, pedido))) return;
        setEnviando(true);
        try {
            let actualizado = await cancelarPrenda(pedido.id, prenda.id);
            toast.success('Prenda cancelada');
            if (!activas(actualizado.items).length) {
                const entero = await confirm(
                    'Era la única prenda que quedaba. ¿Cancelar el pedido entero? '
                    + 'Si no, vuelve a «En conversación» para agregar otras prendas.'
                );
                actualizado = await actualizarEstadoCotizacion(pedido.id, entero ? 'CANCELADA' : 'EN_CONVERSACION');
                toast.success(entero ? 'Pedido cancelado' : 'El pedido volvió a «En conversación»');
            }
            onCambio?.(actualizado);
        } catch (err) {
            toast.error(mensajeDeError(err?.message, 'No se pudo cancelar la prenda'));
        } finally {
            setEnviando(false);
        }
    };

    return (
        <button type="button" className="sp-boton" onClick={cancelar} disabled={enviando}>
            {enviando ? 'Cancelando…' : 'Cancelar prenda'}
        </button>
    );
};

export default CancelarPrenda;
