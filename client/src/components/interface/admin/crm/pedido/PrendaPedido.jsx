import React, { useState } from 'react';
import { useNotification } from '../../../../../context/NotificationContext';
import { cotizarPrenda } from '../../../../../lib/api/endpoints';
import { textoPrecio, textoSubtotal, estadoPrecio, valorDesde, esValido, paraServidor } from '../../../../../utils/precioPrenda';
import { esperaBodega, textoCamino } from '../../../../../utils/caminoPrenda';
import CancelarPrenda from './CancelarPrenda';
import SelectorPrecio from './SelectorPrecio';

/** Las características de una pieza personalizada, con lo propuesto marcado. */
const detalleDe = (prenda) => {
    if (prenda.sku_id) return null; // el nombre de la variante ya las dice
    const propuestas = prenda.config_propuesta || {};
    const partes = Object.entries(prenda.config || {}).map(([k, v]) =>
        `${k}: ${propuestas[k] ? `${propuestas[k]} (propuesto)` : v}`);
    Object.entries(propuestas).forEach(([k, v]) => {
        if (!(k in (prenda.config || {}))) partes.push(`${k}: ${v} (propuesto)`);
    });
    const tipo = prenda.producto_id ? 'Personalizada' : 'Pieza escrita a mano';
    return [tipo, ...partes].join(' · ');
};

/**
 * Una prenda del pedido con su precio. Si el pedido todavía se cotiza
 * (`editable`), se le puede poner, cambiar o dejar sin costo. Si está
 * confirmado, se puede cancelar (`pedido` y `onCambio`). Una cancelada se ve
 * tachada: no se borra.
 */
const PrendaPedido = ({ pedido, prenda, editable, onCotizada, onCambio }) => {
    const pedidoId = pedido.id;
    const cancelada = Boolean(prenda.cancelada_en);
    const { toast } = useNotification();
    const [editando, setEditando] = useState(false);
    const [valor, setValor] = useState(() => valorDesde(prenda.precio_unitario_estimado));
    const [guardando, setGuardando] = useState(false);

    const precio = prenda.precio_unitario_estimado;
    const pendiente = estadoPrecio(precio) !== 'monto';
    const detalle = detalleDe(prenda);
    const camino = textoCamino(prenda);

    const abrir = () => { setValor(valorDesde(precio)); setEditando(true); };

    const guardar = async () => {
        setGuardando(true);
        try {
            await cotizarPrenda(pedidoId, prenda.id, paraServidor(valor));
            setEditando(false);
            toast.success('Precio anotado');
            onCotizada?.();
        } catch (err) {
            toast.error(err?.message || 'No se pudo guardar el precio');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <li className={cancelada ? 'sp-prenda sp-prenda--cancelada' : 'sp-prenda'}>
            <div className="sp-prenda-fila">
                <div>
                    <p className="sp-prenda-nombre">{prenda.cantidad}× {prenda.sku_name}</p>
                    {detalle && <p className="sp-prenda-detalle">{detalle}</p>}
                    {cancelada
                        ? <span className="sp-camino sp-camino--cancelada">Cancelada</span>
                        : camino && (
                            <span className={esperaBodega(prenda) ? 'sp-camino sp-camino--espera' : 'sp-camino'}>{camino}</span>
                        )}
                </div>
                <div className="sp-prenda-precio">
                    <span className={pendiente ? 'sp-prenda-monto sp-prenda-monto--pendiente' : 'sp-prenda-monto'}>
                        {textoSubtotal(prenda)}
                    </span>
                    {!pendiente && prenda.cantidad > 1 && (
                        <span className="sp-prenda-detalle">{textoPrecio(precio)} c/u</span>
                    )}
                </div>
            </div>

            {pedido.estado === 'CONFIRMADA' && !cancelada && (
                <div className="sp-acciones">
                    <CancelarPrenda pedido={pedido} prenda={prenda} onCambio={onCambio} />
                </div>
            )}

            {editable && !editando && !cancelada && (
                <div className="sp-acciones">
                    <button type="button" className="sp-boton" onClick={abrir}>
                        {estadoPrecio(precio) === 'por_cotizar' ? 'Cotizar' : 'Cambiar precio'}
                    </button>
                </div>
            )}

            {editando && (
                <div className="sp-canal-edicion">
                    <SelectorPrecio id={`precio-${prenda.id}`} valor={valor} onChange={setValor} disabled={guardando} />
                    <div className="sp-acciones">
                        <button type="button" className="sp-boton" onClick={() => setEditando(false)} disabled={guardando}>
                            Cancelar
                        </button>
                        <button type="button" className="sp-boton sp-boton--principal" onClick={guardar}
                            disabled={guardando || !esValido(valor)}>
                            {guardando ? 'Guardando…' : 'Guardar'}
                        </button>
                    </div>
                </div>
            )}
        </li>
    );
};

export default PrendaPedido;
