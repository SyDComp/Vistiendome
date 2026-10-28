import React from 'react';
import { Shirt } from 'lucide-react';
import { getImageUrl, getSrcSet } from '../../../../../lib/api/endpoints';
import TeclaOpcion from './TeclaOpcion';

/**
 * Una página de productos: lo más vendido primero, con su foto (las derivadas
 * webp, no el original), cuántas quedan libres con los filtros puestos y
 * cuántas se vendieron en 30 días. Los sin stock salen al final, apagados:
 * se pueden abrir para ver sus variantes, pero no venderse.
 */
const TarjetasProducto = ({ productos, marcada, onElegir }) => (
    <div className="cj-sel-grilla" role="listbox" aria-label="Productos">
        {productos.map((p, i) => (
            <button key={p.id} type="button" role="option" aria-selected={i === marcada}
                className={`cj-sel-tarjeta${i === marcada ? ' cj-sel-tarjeta--marcada' : ''}${p.libres > 0 ? '' : ' cj-sel-tarjeta--sin'}`}
                onClick={() => onElegir(i)}>
                <TeclaOpcion indice={i} />
                <span className="cj-sel-foto">
                    {p.imagen
                        ? <img src={getImageUrl(p.imagen)} srcSet={getSrcSet(p.imagen_srcset) || undefined}
                            sizes="160px" loading="lazy" alt="" />
                        : <Shirt size={32} aria-hidden="true" />}
                </span>
                <strong>{p.nombre}</strong>
                <span className="cj-sel-dato">
                    {p.libres > 0 ? `${p.libres} libres` : 'Sin stock'}{p.vendidos ? ` · ${p.vendidos} vendidas en 30 días` : ''}
                </span>
            </button>
        ))}
    </div>
);

export default TarjetasProducto;
