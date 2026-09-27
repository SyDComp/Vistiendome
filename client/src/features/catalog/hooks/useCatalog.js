import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useWebSocket } from '../../../context/WebSocketContext';
import { getCatalogo, getCategoriesTree, getFiltersMetadata } from '../../../lib/api/endpoints/products.api';
import { filterByCategory, filterBySpecs, filterByPriceRange, sortProducts } from '../utils/filterUtils';
import { track } from '../../../lib/analytics';

/**
 * Hook que centraliza toda la lógica del catálogo:
 * fetching, filtrado, ordenamiento y reacción a WebSocket.
 */
export const useCatalog = () => {
    const location = useLocation();
    const { lastMessage } = useWebSocket();

    const [products, setProducts] = useState([]);
    const [looks, setLooks] = useState([]);
    const [categories, setCategories] = useState([]);
    const [filtersMetadata, setFiltersMetadata] = useState({});
    const [loading, setLoading] = useState(true);

    const [appliedFilters, setAppliedFilters] = useState({
        category: null,
        specs: {},
        priceRange: null,
    });
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [sortOrder, setSortOrder] = useState('relevancia');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [catalogo, tree, meta] = await Promise.all([
                getCatalogo(),
                getCategoriesTree(),
                getFiltersMetadata(),
            ]);
            setProducts(catalogo.products || []);
            setLooks(catalogo.looks || []);
            setCategories(tree);
            setFiltersMetadata(meta);
        } catch (error) {
            console.error('Error al cargar el catálogo:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    // Carga inicial
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Recargar cuando WebSocket notifique cambios
    useEffect(() => {
        if (
            lastMessage &&
            (lastMessage.resource === 'products' || lastMessage.resource === 'categories')
        ) {
            console.log('WebSocket: Actualización detectada, recargando catálogo...', lastMessage);
            loadData();
        }
    }, [lastMessage, loadData]);

    // Categoría y specs se evalúan a nivel de PRODUCTO: son "¿alguna variante
    // calza?", y el conjunto de valores del producto (`facets`) es la unión de
    // sus variantes, así que si el producto entra, hay al menos una variante
    // que también entra. El precio queda fuera a propósito — ver el porqué
    // donde se aplica más abajo.
    const productosPorCategoriaYSpecs = useMemo(() => {
        let result = filterByCategory(products, selectedCategory, appliedFilters.category, categories);
        result = filterBySpecs(result, appliedFilters.specs);
        return result;
    }, [products, selectedCategory, appliedFilters.category, appliedFilters.specs, categories]);

    // Filtrado y ordenamiento memoizado
    const filteredProducts = useMemo(() => {
        let result = filterByPriceRange(productosPorCategoriaYSpecs, appliedFilters.priceRange);
        result = sortProducts(result, sortOrder);
        return result;
    }, [productosPorCategoriaYSpecs, appliedFilters.priceRange, sortOrder]);

    // Looks de los productos que pasaron categoría y specs, más el filtro de
    // specs y de PRECIO aplicados otra vez sobre el look mismo. El catálogo
    // filtra productos; el explorador filtra looks. Misma fuente, distinta
    // proyección.
    //
    // POR QUÉ EL PRECIO NO SE HEREDA DE `filteredProducts`
    // `p.price` es el precio MÁS BAJO entre las variantes del producto (así lo
    // arma el backend, para el "Desde $X" de la tarjeta que representa al
    // producto entero). Que el producto pase un filtro de precio con su
    // variante más barata no dice nada del precio de las otras: heredar ese
    // resultado dejaba pasar looks más caros que el límite, y podía descartar
    // looks baratos si el producto entero quedaba fuera por tener el mínimo por
    // encima del límite. Cada look trae su propio `price`, así que se filtra
    // con él directamente.
    const filteredLooks = useMemo(() => {
        const idsVisibles = new Set(productosPorCategoriaYSpecs.map(p => p.id));
        const specs = appliedFilters.specs || {};
        const activos = Object.entries(specs).filter(([, v]) => v && v.length);

        let result = looks.filter(l => {
            if (!idsVisibles.has(l.product_id)) return false;
            return activos.every(([key, values]) => {
                const lk = key.toLowerCase().trim();
                const lv = values.map(v => String(v).toLowerCase().trim());
                // Se mira lo que hay DENTRO del look, no la variante que lo
                // representa: el look "Noemi · Negro" existe en todas las
                // tallas, así que filtrar por talla 12 no debe descartarlo.
                return Object.entries(l.facets || {}).some(
                    ([fk, fvals]) => fk.toLowerCase().trim() === lk &&
                        (fvals || []).some(fv => lv.includes(String(fv).toLowerCase().trim()))
                );
            });
        });

        return filterByPriceRange(result, appliedFilters.priceRange);
    }, [looks, productosPorCategoriaYSpecs, appliedFilters.specs, appliedFilters.priceRange]);

    // Analítica: registrar cada valor de filtro nuevo que el cliente aplica
    const prevSpecsRef = useRef({});
    useEffect(() => {
        const specs = appliedFilters.specs || {};
        const prev = prevSpecsRef.current || {};
        Object.entries(specs).forEach(([key, values]) => {
            const before = prev[key] || [];
            (values || []).forEach(v => {
                if (!before.includes(v)) track('filter', { query: `${key}: ${v}` });
            });
        });
        prevSpecsRef.current = specs;
    }, [appliedFilters.specs]);

    const isModalOpen = location.pathname.includes('/producto/');

    const clearAll = useCallback(() => {
        setAppliedFilters({ category: null, specs: {}, priceRange: null });
        setSelectedCategory(null);
    }, []);

    return {
        products,
        filteredProducts,
        looks,
        filteredLooks,
        categories,
        filtersMetadata,
        loading,
        appliedFilters,
        setAppliedFilters,
        selectedCategory,
        setSelectedCategory,
        sortOrder,
        setSortOrder,
        clearAll,
        isModalOpen,
        loadData,
    };
};

export default useCatalog;
