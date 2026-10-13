import React, { useState } from 'react';
import { useNotification } from '../../../../../context/NotificationContext';
import { actualizarEstadoCotizacion } from '../../../../../lib/api/endpoints';
import { mensajeDeError } from '../../../../../utils/errorServidor';

/**
 * Que el pedido salga: "Despachar", o en un retiro "Marcar como entregado".
 *
 * Es un botón y no un efecto de otra cosa: imprimir una etiqueta no despacha
 * (se reimprime, se prueba la impresora). Solo aparece cuando el pedido está
 * listo; si no, dice qué falta, prenda por prenda. El servidor lo exige igual.
 */
const SalidaPedido = ({ pedido, onCambio }) => {
    const { toast, confirm } = useNotification();
    const [enviando, setEnviando] = useState(false);
    const retiro = pedido.modo_entrega === 'RETIRO';
    const { listo = false, falta = [], bodega = 0 } = pedido.produccion || {};

    const cambiar = async (estado, pregunta, exito) => {
        if (!await confirm(pregunta)) return;
        setEnviando(true);
        try {
            onCambio(await actualizarEstadoCotizacion(pedido.id, estado));
            toast.success(exito);
        } catch (err) {
            toast.error(mensajeDeError(err?.message, 'No se pudo cambiar el estado'));
        } finally {
            setEnviando(false);
        }
    };

    if (pedido.estado === 'DESPACHADA') {
        return (
            <div className="sp-salida">
                <p className="sp-aviso">{retiro ? 'La clienta ya lo retiró.' : 'Ya salió del local.'}</p>
                <button type="button" className="sp-boton" disabled={enviando}
                    onClick={() => cambiar('CONFIRMADA',
                        `¿Deshacer ${retiro ? 'la entrega' : 'el despacho'} del pedido N° ${pedido.numero}? Vuelve a Confirmado y lo que salió de bodega vuelve a ella.`,
                        retiro ? 'Se deshizo la entrega' : 'Se deshizo el despacho')}>
                    {retiro ? 'Deshacer entrega' : 'Deshacer despacho'}
                </button>
            </div>
        );
    }

    if (!listo) {
        return (
            <div className="sp-salida">
                <p className="sp-aviso">Todavía no está listo para salir. Falta:</p>
                <ul className="sp-falta">{falta.map(f => <li key={f}>{f}</li>)}</ul>
            </div>
        );
    }

    const deBodega = bodega ? ' Lo que va por bodega sale de la bodega.' : '';
    return (
        <div className="sp-salida">
            <p className="sp-aviso">Todo está listo.</p>
            <button type="button" className="sp-boton sp-boton--principal" disabled={enviando}
                onClick={() => cambiar('DESPACHADA',
                    retiro
                        ? `¿La clienta retiró el pedido N° ${pedido.numero}?${deBodega}`
                        : `¿Despachar el pedido N° ${pedido.numero}?${deBodega}`,
                    retiro ? `Pedido N° ${pedido.numero} entregado` : `Pedido N° ${pedido.numero} despachado`)}>
                {retiro ? 'Marcar como entregado' : 'Despachar'}
            </button>
        </div>
    );
};

export default SalidaPedido;
