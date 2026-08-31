import React from 'react';
import { agruparPorProducto } from '../../../../utils/prendas';

/**
 * Las prendas de un pedido, con UNA COLUMNA POR CARACTERÍSTICA.
 *
 * Sólo pinta. Quién va en qué grupo y qué columnas hay lo decide
 * `agruparPorProducto`, para que la pantalla y el papel no se separen.
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
 */
const TablaPrendas = ({
    items = [],
    columnasExtra = [],
    casilla = false,
    cantidad,
    claseFila,
    filasEnBlanco = 0,
    vacio = 'Este pedido no tiene prendas.',
}) => {
    const hayCasilla = Boolean(casilla);
    const pintarCasilla = typeof casilla === 'function'
        ? casilla
        : () => <span className="tp-cuadro" />;
    const grupos = agruparPorProducto(items);

    if (!grupos.length) return <p className="tp-vacio">{vacio}</p>;

    return (
        <div className="tabla-prendas">
            {grupos.map(({ producto, columnas, filas, unidades }) => (
                <section key={producto} className="tp-grupo">
                    <header className="tp-grupo-cab">
                        <h4 className="tp-producto">{producto}</h4>
                        <span className="tp-unidades">
                            {unidades} {unidades === 1 ? 'unidad' : 'unidades'}
                        </span>
                    </header>

                    <div className="tp-scroll">
                        <table className="tp-tabla">
                            <thead>
                                <tr>
                                    {hayCasilla && <th className="tp-casilla" aria-label="Marcar" />}
                                    {columnas.map(c => <th key={c}>{c}</th>)}
                                    <th className="tp-num">Cant.</th>
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
                                        {columnas.map(c => (
                                            // Una celda vacía se marca: si no, no se distingue
                                            // "no aplica" de "se les olvidó".
                                            <td key={c} className={fila.config?.[c] ? '' : 'tp-sin-dato'}>
                                                {fila.config?.[c] || '—'}
                                            </td>
                                        ))}
                                        <td className="tp-num tp-cant">
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
                                        {columnas.map(c => <td key={c}>&nbsp;</td>)}
                                        <td />
                                        {columnasExtra.map(c => <td key={c.clave} />)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            ))}

            <style>{`
                .tp-vacio { color: var(--color-text-light, #64748b); font-size: 13px; margin: 0; }
                .tp-grupo + .tp-grupo { margin-top: 26px; }
                /* El nombre del modelo tiene que dominar: quien lee esto está
                   cosiendo y busca "cuál prenda", no una fila. La línea debajo
                   separa un modelo del siguiente sin necesidad de leerlos. */
                .tp-grupo-cab {
                    display: flex; align-items: baseline; justify-content: space-between;
                    gap: 12px; flex-wrap: wrap;
                    border-bottom: 2px solid #1e1b4b; padding-bottom: 4px; margin-bottom: 0;
                }
                .tp-producto {
                    margin: 0; font-size: 15px; font-weight: 900; color: #1e1b4b;
                    text-transform: uppercase; letter-spacing: .4px;
                }
                .tp-unidades { font-size: 12px; font-weight: 800; color: #1e1b4b; }

                /* El ancho lo puede pasar el número de características: que
                   ruede la tabla, nunca la página. */
                .tp-scroll { overflow-x: auto; }
                .tp-tabla { width: 100%; border-collapse: collapse; font-size: 13px; }
                .tp-tabla th {
                    text-align: left; font-size: 10px; letter-spacing: .5px; text-transform: uppercase;
                    color: var(--color-text-light, #64748b); border-bottom: 1px solid #cbd5e1;
                    padding: 7px 8px; white-space: nowrap;
                }
                .tp-tabla td { padding: 9px 8px; border-bottom: 1px solid #e2e8f0; white-space: nowrap; }
                .tp-num { text-align: right; }
                .tp-cant { font-weight: 800; }
                .tp-sin-dato { color: #cbd5e1; }
                .tp-casilla { width: 30px; }
                .tp-cuadro { display: block; width: 14px; height: 14px; border: 1.5px solid #1e1b4b; border-radius: 3px; }
                .tp-blanca td { height: 30px; }
                .tp-elegida { background: #f0fdf4; }
            `}</style>
        </div>
    );
};

export default TablaPrendas;
