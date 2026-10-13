import { useEffect, useState } from 'react';
import { getProducts } from '../lib/api/endpoints/products.api';
import { getAdminAttributes } from '../lib/api/endpoints/admin.api';

/** {CARACTERÍSTICA: [valores en su orden]} a partir de las características del catálogo. */
const mapaDeAtributos = (attrs) => {
    const mapa = {};
    (attrs || []).forEach(a => {
        const valores = (a.domain || [])
            .slice()
            .sort((x, y) => (x?.order ?? 9999) - (y?.order ?? 9999))
            .map(o => (typeof o === 'string' ? o : o?.value))
            .filter(Boolean);
        if (valores.length) mapa[a.name] = valores;
    });
    return mapa;
};

/**
 * Los productos y las características para armar una prenda en el panel, cada
 * vez que `activo` pasa a verdadero.
 *
 * El panel NO come de la mesa del público: las características se piden por
 * el endpoint privado. El público (/products/filters-metadata) devuelve solo
 * las filtrables, y una que no lo fuera no se podía usar para armar una pieza.
 *
 * Si algo falla, se puede armar igual: sin productos queda "Otra", y sin
 * características la pieza va sin ellas.
 */
export default function useCatalogoParaArmar(activo = true) {
    const [productos, setProductos] = useState([]);
    const [atributos, setAtributos] = useState({});

    useEffect(() => {
        if (!activo) return undefined;
        let vigente = true;
        getProducts()
            .then(data => { if (vigente) setProductos(data || []); })
            .catch(e => console.error('Error al cargar productos:', e));
        getAdminAttributes()
            .then(attrs => { if (vigente) setAtributos(mapaDeAtributos(attrs)); })
            .catch(() => { /* la pieza se arma igual, sin características */ });
        return () => { vigente = false; };
    }, [activo]);

    return { productos, atributos };
}
