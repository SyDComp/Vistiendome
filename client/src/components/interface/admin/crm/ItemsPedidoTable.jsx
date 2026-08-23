import React from 'react';
import { formatCurrency } from '../../../../utils/cartUtils';

/**
 * Tabla de ítems de un pedido — usada tanto en la planilla (con precios, para
 * el taller) como en el comprobante (sin precios, para la clienta). Misma
 * pieza técnica, un solo prop decide qué columnas mostrar.
 */
const ItemsPedidoTable = ({ items = [], mostrarPrecios = true }) => {
    const total = items.reduce((acc, it) => acc + (it.cantidad || 0) * (it.precio_unitario_estimado || 0), 0);

    return (
        <table className="items-pedido-table">
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Características</th>
                    <th className="col-num">Cant.</th>
                    {mostrarPrecios && <th className="col-num">Precio</th>}
                    {mostrarPrecios && <th className="col-num">Subtotal</th>}
                </tr>
            </thead>
            <tbody>
                {items.map((it) => (
                    <tr key={it.id}>
                        <td>{it.producto_nombre || it.sku_name}</td>
                        <td>
                            <div className="config-badges">
                                {Object.entries(it.config || {}).filter(([, v]) => v).map(([k, v]) => (
                                    <span key={k} className="config-badge">{k}: {v}</span>
                                ))}
                            </div>
                        </td>
                        <td className="col-num">{it.cantidad}</td>
                        {mostrarPrecios && <td className="col-num">{formatCurrency(it.precio_unitario_estimado)}</td>}
                        {mostrarPrecios && <td className="col-num">{formatCurrency((it.cantidad || 0) * (it.precio_unitario_estimado || 0))}</td>}
                    </tr>
                ))}
            </tbody>
            {mostrarPrecios && (
                <tfoot>
                    <tr>
                        <td colSpan={4} className="col-num total-label">Total</td>
                        <td className="col-num total-value">{formatCurrency(total)}</td>
                    </tr>
                </tfoot>
            )}
        </table>
    );
};

export default ItemsPedidoTable;
