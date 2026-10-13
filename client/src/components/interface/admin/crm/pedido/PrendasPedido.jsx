import React from 'react';
import { textoTotal } from '../../../../../utils/precioPrenda';
import { activas } from '../../../../../utils/cancelarPrenda';
import AgregarPrenda from './AgregarPrenda';
import PrendaPedido from './PrendaPedido';

// Mientras se conversa, el precio se cotiza. Confirmar es aceptarlo.
const SE_COTIZA = ['NUEVA', 'EN_CONVERSACION'];

/**
 * Las prendas del pedido, su precio y el total dicho entero. Mientras el
 * pedido se conversa se pueden agregar prendas (`onCotizada` recarga) y
 * `onConfirmar` abre la confirmación.
 */
const PrendasPedido = ({ pedido, cargando, error, onReintentar, onCotizada, onConfirmar, onCambio }) => {
    if (cargando && !pedido) return <p className="sp-aviso" aria-busy="true">Cargando las prendas…</p>;
    if (error && !pedido) {
        return (
            <div className="sp-aviso sp-aviso--error" role="alert">
                <span>{error}</span>
                <button type="button" className="sp-boton" onClick={onReintentar}>Reintentar</button>
            </div>
        );
    }
    const items = pedido?.items || [];
    const editable = SE_COTIZA.includes(pedido.estado);
    if (!items.length) {
        return (
            <>
                <p className="sp-aviso">
                    {editable
                        ? 'Este pedido todavía no tiene prendas. Agrega las que acuerden con la clienta.'
                        : 'Este pedido no tiene prendas.'}
                </p>
                {editable && <AgregarPrenda pedidoId={pedido.id} onAgregada={onCotizada} />}
            </>
        );
    }

    return (
        <>
            <ul className="sp-prendas">
                {items.map(prenda => (
                    <PrendaPedido key={prenda.id} pedido={pedido} prenda={prenda}
                        editable={editable} onCotizada={onCotizada} onCambio={onCambio} />
                ))}
            </ul>
            <div className="sp-total">
                <span>Total estimado</span>
                {/* Lo cancelado no se cobra. */}
                <span>{textoTotal(activas(items))}</span>
            </div>
            {editable && (
                <div className="sp-acciones sp-acciones--separadas">
                    <AgregarPrenda pedidoId={pedido.id} onAgregada={onCotizada} />
                    {onConfirmar && (
                        <button type="button" className="sp-boton sp-boton--principal" onClick={onConfirmar}>
                            Confirmar pedido…
                        </button>
                    )}
                </div>
            )}
            {!editable && (
                <p className="sp-nota">El precio se cotiza mientras el pedido está nuevo o en conversación.</p>
            )}
        </>
    );
};

export default PrendasPedido;
