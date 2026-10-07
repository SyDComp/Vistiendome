import React from 'react';
import TablaPrendas from './TablaPrendas';
import { textoPrecio, textoSubtotal, textoTotal } from '../../../../utils/precioPrenda';
import './ItemsPedidoTable.css';

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
    // Una prenda sin precio dice "Por cotizar", y una regalada "Sin costo":
    // nunca "$0" (ver utils/precioPrenda).
    const columnasExtra = mostrarPrecios ? [
        {
            clave: 'precio', etiqueta: 'Precio', alinear: 'derecha',
            valor: (i) => textoPrecio(i.precio_unitario_estimado),
        },
        {
            clave: 'subtotal', etiqueta: 'Subtotal', alinear: 'derecha',
            valor: (i) => textoSubtotal(i),
        },
    ] : [];

    return (
        <div>
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
                    <strong>{textoTotal(items)}</strong>
                </div>
            )}

        </div>
    );
};

export default ItemsPedidoTable;
