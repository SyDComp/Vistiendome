import React, { useState } from 'react';
import { useNotification } from '../../../../../../context/NotificationContext';
import { cotizarPrenda } from '../../../../../../lib/api/endpoints';
import { textoPrecio, esValido, paraServidor } from '../../../../../../utils/precioPrenda';
import { mensajeDeError } from '../../../../../../utils/errorServidor';
import SelectorPrecio from '../SelectorPrecio';

/**
 * Ponerle precio a una prenda "Por cotizar" sin salir de la confirmación.
 *
 * Las personalizadas de Contacto llegan siempre sin precio (no calzan con una
 * variante exacta), y antes había que cerrar, cotizarlas en el pedido y volver
 * (reportado por QA 2026-11-09). Es el mismo cotizar del pedido: se puede
 * porque todavía no está confirmado. De referencia, entre cuánto y cuánto van
 * las variantes del modelo.
 */
const CotizarAlConfirmar = ({ pedidoId, prenda, onCotizada, disabled }) => {
    const { toast } = useNotification();
    const [valor, setValor] = useState({ tipo: 'monto', monto: '' });
    const [guardando, setGuardando] = useState(false);
    const rango = prenda.rango_modelo;

    const guardar = async () => {
        setGuardando(true);
        try {
            await cotizarPrenda(pedidoId, prenda.item_id, paraServidor(valor));
            toast.success('Precio anotado');
            onCotizada();
        } catch (err) {
            toast.error(mensajeDeError(err?.message, 'No se pudo guardar el precio'));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="cfp-cotizar">
            {rango && (
                <p className="cfp-ayuda">
                    {rango[0] === rango[1]
                        ? `Este modelo vale ${textoPrecio(rango[0])}.`
                        : `Este modelo va de ${textoPrecio(rango[0])} a ${textoPrecio(rango[1])}.`}
                </p>
            )}
            <SelectorPrecio id={`cfp-precio-${prenda.item_id}`} valor={valor} onChange={setValor} disabled={guardando || disabled} />
            <div>
                <button type="button" className="sp-boton sp-boton--principal" onClick={guardar}
                    disabled={guardando || disabled || valor.tipo === 'por_cotizar' || !esValido(valor)}>
                    {guardando ? 'Guardando…' : 'Poner precio'}
                </button>
            </div>
        </div>
    );
};

export default CotizarAlConfirmar;
