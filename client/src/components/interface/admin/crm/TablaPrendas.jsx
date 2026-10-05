import React from 'react';
import { agrupar, nombreDeProducto, describirPedidos } from '../../../../utils/prendas';
import './TablaPrendas.css';

/**
 * Las prendas de un pedido, con UNA COLUMNA POR CARACTERÍSTICA.
 *
 * Sólo pinta. Quién va en qué grupo y qué columnas hay lo decide
 * `agrupar` (utils/prendas.js), para que la pantalla y el papel no se separen.
 *
 * La lee gente que está cosiendo, no mirando una pantalla: por eso una tabla
 * por modelo, la talla siempre en el mismo lugar, y el total de cada modelo a
 * la vista en vez de tener que contar filas.
 *
 * @param columnasExtra  columnas propias de cada uso (origen, precio...):
 *                       `{ clave, etiqueta, alinear, valor: (fila) => nodo }`
 * @param casilla        `true` pinta un cuadro para tildar a mano; una función
 *                       `(fila) => nodo` deja poner un control de verdad (por
 *                       ejemplo el checkbox con el que se eligen las piezas).
 * @param cantidad       cómo se muestra la cantidad. Por omisión el número; se
 *                       pasa una función cuando es editable.
 * @param claseFila      clase extra por fila (marcar la elegida, por ejemplo).
 * @param filasEnBlanco  filas vacías al final de cada modelo, para anotar a
 *                       mano. La planilla de papel las tiene y se usan.
 * @param columnasPermitidas `Set` de características que la clienta eligió
 *                       mostrar. `null` = todas.
 * @param agruparPor     'producto' (para cortar) o 'cliente' (para entregar).
 *                       Ver `utils/prendas.js` para por qué existen las dos.
 */
const TablaPrendas = ({
    items = [],
    columnasExtra = [],
    casilla = false,
    cantidad,
    claseFila,
    filasEnBlanco = 0,
    columnasPermitidas = null,
    agruparPor = 'producto',
    vacio = 'Este pedido no tiene prendas.',
}) => {
    const hayCasilla = Boolean(casilla);
    const pintarCasilla = typeof casilla === 'function'
        ? casilla
        : () => <span className="tp-cuadro" />;
    const grupos = agrupar(items, { por: agruparPor, permitidas: columnasPermitidas });

    if (!grupos.length) return <p className="tp-vacio">{vacio}</p>;

    return (
        <div>
            {grupos.map(({ titulo, columnas, filas, unidades, pedidos, conColumnaProducto }) => (
                <section key={titulo} className="tp-grupo">
                    <header className="tp-grupo-cab">
                        <div className="tp-grupo-titulo">
                            <h4 className="tp-producto">{titulo}</h4>
                            {/* Por clienta, de qué pedido es: con eso se arma y
                                se despacha el paquete. Por modelo ya lo dice
                                cada fila. */}
                            {conColumnaProducto && pedidos.length > 0 && (
                                <span className="tp-pedidos">{describirPedidos(pedidos)}</span>
                            )}
                        </div>
                        <span className="tp-unidades">
                            {unidades} {unidades === 1 ? 'unidad' : 'unidades'}
                        </span>
                    </header>

                    <div className="tp-scroll">
                        <table className="tp-tabla">
                            <thead>
                                <tr>
                                    {hayCasilla && <th className="tp-casilla" aria-label="Marcar" />}
                                    {conColumnaProducto && <th className="tp-producto-col">Producto</th>}
                                    {columnas.map(c => <th key={c}>{c}</th>)}
                                    <th className="tp-cant">Cant.</th>
                                    {columnasExtra.map(c => (
                                        <th key={c.clave} className={c.alinear === 'derecha' ? 'tp-num' : ''}>
                                            {c.etiqueta}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filas.map((fila, i) => (
                                    <tr key={fila.id ?? i} className={claseFila?.(fila) || ''}>
                                        {hayCasilla && <td className="tp-casilla">{pintarCasilla(fila)}</td>}
                                        {conColumnaProducto && (
                                            <td className="tp-producto-col">{nombreDeProducto(fila)}</td>
                                        )}
                                        {columnas.map(c => (
                                            // Una celda vacía se marca: si no, no se distingue
                                            // "no aplica" de "se les olvidó".
                                            <td key={c} className={fila.config?.[c] ? '' : 'tp-sin-dato'}>
                                                {fila.config?.[c] || '—'}
                                            </td>
                                        ))}
                                        <td className="tp-cant">
                                            {cantidad ? cantidad(fila) : fila.cantidad}
                                        </td>
                                        {columnasExtra.map(c => (
                                            <td key={c.clave} className={c.alinear === 'derecha' ? 'tp-num' : ''}>
                                                {c.valor(fila)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {Array.from({ length: filasEnBlanco }, (_, i) => (
                                    <tr key={`blanco-${i}`} className="tp-blanca">
                                        {hayCasilla && <td className="tp-casilla"><span className="tp-cuadro" /></td>}
                                        {conColumnaProducto && <td/>}
                                        {columnas.map(c => <td key={c}>&nbsp;</td>)}
                                        <td/>
                                        {columnasExtra.map(c => <td key={c.clave} />)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ))}

        </div>
    );
};

export default TablaPrendas;
