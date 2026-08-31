import React from 'react';
import TablaPrendas from './TablaPrendas';
import { formatCurrency } from '../../../../utils/cartUtils';

/**
 * Las prendas de un pedido: planilla para el taller (con precios) o comprobante
 * para la clienta (sin precios). Misma pieza, un prop decide.
 *
 * Una columna por característica, agrupado por modelo — igual que la planilla
 * de papel que ya usa la clienta, que en esto acertaba. Antes iba todo apilado
 * en una celda ("CUELLO: En V · MANGAS: Larga · COLOR: Negro · TALLA: XS"), que
 * obliga a leer una frase por fila en vez de bajar la vista por una columna.
 */
const ItemsPedidoTable = ({ items = [], mostrarPrecios = true }) => {
    const total = items.reduce(
        (acc, it) => acc + (it.cantidad || 0) * (it.precio_unitario_estimado || 0), 0
    );

    const columnasExtra = mostrarPrecios ? [
        {
            clave: 'precio', etiqueta: 'Precio', alinear: 'derecha',
            valor: (i) => formatCurrency(i.precio_unitario_estimado),
        },
        {
            clave: 'subtotal', etiqueta: 'Subtotal', alinear: 'derecha',
            valor: (i) => formatCurrency((i.cantidad || 0) * (i.precio_unitario_estimado || 0)),
        },
    ] : [];

    return (
        <div className="items-pedido">
            <TablaPrendas
                items={items}
                columnasExtra={columnasExtra}
                // El taller marca sobre la hoja lo que va saliendo; la clienta
                // recibe un comprobante, no una lista de tareas.
                casilla={mostrarPrecios}
                filasEnBlanco={mostrarPrecios ? 1 : 0}
                vacio="Este pedido no tiene prendas."
            />

            {mostrarPrecios && items.length > 0 && (
                <div className="items-pedido-total">
                    <span>Total del pedido</span>
                    <strong>{formatCurrency(total)}</strong>
                </div>
            )}

            <style>{`
                .items-pedido-total {
                    display: flex; justify-content: space-between; align-items: baseline;
                    margin-top: 16px; padding-top: 12px; border-top: 2px solid #000;
                    font-size: 14px; font-weight: 800;
                }
                .items-pedido-total strong { font-size: 16px; }
            `}</style>
        </div>
    );
};

export default ItemsPedidoTable;
