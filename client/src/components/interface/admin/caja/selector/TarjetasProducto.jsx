import React from 'react';
import { Gem, Shirt } from 'lucide-react';
import { getImageUrl, getSrcSet } from '../../../../../lib/api/endpoints';
import TeclaOpcion from './TeclaOpcion';

/**
 * El primer paso: qué prenda. Lo más vendido primero, con su foto (las
 * derivadas webp, no el original), cuántas quedan libres y cuántas se
 * vendieron en 30 días. Las piezas únicas van al final, como un grupo.
 */
const TarjetasProducto = ({ productos, piezas, marcada, onElegir }) => (
    <div className="cj-sel-grilla" role="listbox" aria-label="Productos">
        {productos.map((p, i) => (
            <button key={p.id} type="button" role="option" aria-selected={i === marcada}
                className={`cj-sel-tarjeta${i === marcada ? ' cj-sel-tarjeta--marcada' : ''}`} onClick={() => onElegir(i)}>
                <TeclaOpcion indice={i} />
                <span className="cj-sel-foto">
                    {p.imagen
                        ? <img src={getImageUrl(p.imagen)} srcSet={getSrcSet(p.imagen_srcset) || undefined}
                            sizes="160px" loading="lazy" alt="" />
                        : <Shirt size={32} aria-hidden="true" />}
                </span>
                <strong>{p.nombre}</strong>
                <span className="cj-sel-dato">
                    {p.libres} libres{p.vendidos ? ` · ${p.vendidos} vendidas en 30 días` : ''}
                </span>
            </button>
        ))}
        {piezas > 0 && (
            <button type="button" role="option" aria-selected={productos.length === marcada}
                className={`cj-sel-tarjeta${productos.length === marcada ? ' cj-sel-tarjeta--marcada' : ''}`}
                onClick={() => onElegir(productos.length)}>
                <TeclaOpcion indice={productos.length} />
                <span className="cj-sel-foto"><Gem size={32} aria-hidden="true" /></span>
                <strong>Piezas únicas</strong>
                <span className="cj-sel-dato">{piezas} {piezas === 1 ? 'pieza' : 'piezas'}</span>
            </button>
        )}
    </div>
);

export default TarjetasProducto;
