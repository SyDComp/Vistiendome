import React from 'react';
import { textoTotal } from '../../../../../utils/precioPrenda';
import PrendaPedido from './PrendaPedido';

// Mientras se conversa, el precio se cotiza. Confirmar es aceptarlo.
const SE_COTIZA = ['NUEVA', 'EN_CONVERSACION'];

/** Las prendas del pedido, su precio y el total dicho entero. Solo pinta. */
const PrendasPedido = ({ pedido, cargando, error, onReintentar, onCotizada }) => {
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
    if (!items.length) return <p className="sp-aviso">Este pedido no tiene prendas.</p>;

    const editable = SE_COTIZA.includes(pedido.estado);
    return (
        <>
            <ul className="sp-prendas">
                {items.map(prenda => (
                    <PrendaPedido key={prenda.id} pedidoId={pedido.id} prenda={prenda}
                        editable={editable} onCotizada={onCotizada} />
                ))}
            </ul>
            <div className="sp-total">
                <span>Total estimado</span>
                <span>{textoTotal(items)}</span>
            </div>
            {!editable && (
                <p className="sp-nota">El precio se cotiza mientras el pedido está nuevo o en conversación.</p>
            )}
        </>
    );
};

export default PrendasPedido;
