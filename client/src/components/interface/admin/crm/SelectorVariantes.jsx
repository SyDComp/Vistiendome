import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, Check, Package } from 'lucide-react';
import { get } from '../../../../lib/api/client';
import { getImageUrl, getSrcSet } from '../../../../lib/api/endpoints';
import { ordenarCaracteristicas } from '../../../../utils/prendas';
import './SelectorVariantes.css';

/**
 * Explorador de variantes en dos niveles: producto base → sus variantes.
 *
 * Se navega mirando, no escribiendo un SKU de memoria. El buscador está para
 * acortar la lista, no para reemplazarla: nadie recuerda
 * "MAG-TAP_MAG_IN-V-XS-LARGA-NEGRO-TEL_SOF".
 *
 * Los filtros de característica salen de las propias variantes del producto:
 * si mañana hay biblias con Idioma y Tapa, aparecen esos filtros solos.
 */
const SelectorVariantes = ({ onElegir, yaElegidas = new Set() }) => {
    const [productos, setProductos] = useState([]);
    const [producto, setProducto] = useState(null);   // nivel 2
    const [variantes, setVariantes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtros, setFiltros] = useState({});       // caracteristica -> valor

    useEffect(() => {
        get('/api/v1/admin/catalog/products?page=1&page_size=500')
            .then(d => setProductos(d?.items || d?.data || d || []))
            .catch(() => setProductos([]))
            .finally(() => setCargando(false));
    }, []);

    const abrir = async (p) => {
        setProducto(p);
        setVariantes([]);
        setFiltros({});
        setBusqueda('');
        setCargando(true);
        try {
            const det = await get(`/api/v1/admin/catalog/products/${p.id}`);
            setVariantes(det?.skus || []);
        } catch {
            setVariantes([]);
        } finally {
            setCargando(false);
        }
    };

    // Características disponibles y sus valores, deducidas de las variantes
    const caracteristicas = useMemo(() => {
        const mapa = {};
        variantes.forEach(v => {
            Object.entries(v.config || {}).forEach(([k, val]) => {
                if (!val) return;
                (mapa[k] = mapa[k] || new Set()).add(val);
            });
        });
        return Object.fromEntries(Object.entries(mapa).map(([k, s]) => [k, [...s]]));
    }, [variantes]);

    const variantesFiltradas = useMemo(() => {
        const t = busqueda.trim().toLowerCase();
        return variantes.filter(v => {
            const cumpleFiltros = Object.entries(filtros).every(([k, val]) => !val || v.config?.[k] === val);
            if (!cumpleFiltros) return false;
            if (!t) return true;
            const texto = `${v.sku} ${Object.values(v.config || {}).join(' ')}`.toLowerCase();
            return texto.includes(t);
        });
    }, [variantes, filtros, busqueda]);

    const productosFiltrados = useMemo(() => {
        const t = busqueda.trim().toLowerCase();
        if (!t) return productos;
        return productos.filter(p => (p.name || '').toLowerCase().includes(t));
    }, [productos, busqueda]);

    // Las columnas de la lista: en este nivel todas las variantes son del MISMO
    // producto, así que comparten las mismas características y se pueden
    // alinear. Antes se mostraban los valores corridos y sin su etiqueta
    // ("En V · Larga · Negro · Tela Sofia · XS"): había que adivinar cuál era
    // cuál, y como los valores no quedaban alineados entre filas, tampoco se
    // podía recorrer una columna con la vista.
    const columnas = useMemo(
        () => ordenarCaracteristicas(Object.keys(caracteristicas)),
        [caracteristicas]
    );

    // Sólo si una variante no tiene ninguna característica cargada.
    const etiqueta = (config) =>
        Object.entries(config || {}).filter(([, v]) => v).map(([, v]) => v).join(' · ');

    // --- Nivel 1: productos ---
    if (!producto) {
        return (
            <div className="sv">
                <div className="sv-buscador">
                    <Search size={15} />
                    <input placeholder="Buscar producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                </div>
                {cargando ? (
                    <div className="sv-vacio">Cargando productos...</div>
                ) : (
                    <div className="sv-grilla">
                        {productosFiltrados.map(p => (
                            <button key={p.id} type="button" className="sv-tarjeta" onClick={() => abrir(p)}>
                                <div className="sv-foto">
                                    {p.image
                                        ? <img src={getImageUrl(p.image)} srcSet={getSrcSet(p.image_srcset) || undefined}
                                               sizes="120px" loading="lazy" alt={p.name} />
                                        : <Package size={22} />}
                                </div>
                                <span className="sv-nombre">{p.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // --- Nivel 2: variantes del producto ---
    return (
        <div className="sv">
            <div className="sv-cabecera">
                <button type="button" className="sv-volver" onClick={() => { setProducto(null); setBusqueda(''); }}>
                    <ArrowLeft size={14} /> Productos
                </button>
                <strong>{producto.name}</strong>
                <span className="sv-cuenta">{variantesFiltradas.length} de {variantes.length}</span>
            </div>

            {Object.keys(caracteristicas).length > 0 && (
                <div className="sv-filtros">
                    {Object.entries(caracteristicas).map(([k, valores]) => (
                        <select key={k} value={filtros[k] || ''}
                            onChange={e => setFiltros(f => ({ ...f, [k]: e.target.value }))}>
                            <option value="">{k}: todas</option>
                            {valores.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    ))}
                </div>
            )}

            <div className="sv-buscador">
                <Search size={15} />
                <input placeholder="Afinar dentro de este producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>

            {cargando ? (
                <div className="sv-vacio">Cargando variantes...</div>
            ) : variantesFiltradas.length === 0 ? (
                <div className="sv-vacio">Ninguna variante coincide con estos filtros.</div>
            ) : (
                <>
                    {columnas.length > 0 && (
                        <div className="sv-cab-cols" style={{ '--cols': columnas.length }} aria-hidden="true">
                            <span />
                            {columnas.map(c => <span key={c}>{c}</span>)}
                            <span />
                        </div>
                    )}
                    <div className="sv-lista">
                        {variantesFiltradas.map(v => {
                            const ya = yaElegidas.has(v.id);
                            return (
                                <button key={v.id} type="button" className={`sv-variante ${ya ? 'ya' : ''}`}
                                    style={{ '--cols': columnas.length }}
                                    onClick={() => !ya && onElegir({ ...v, product_name: producto.name })}>
                                    <div className="sv-mini">
                                        {v.image_urls?.[0]
                                            ? <img src={getImageUrl(v.image_urls[0])} loading="lazy" alt="" />
                                            : <Package size={15} />}
                                    </div>
                                    {columnas.length > 0
                                        ? columnas.map(c => (
                                            <span key={c} className={v.config?.[c] ? 'sv-valor' : 'sv-valor sv-sin'}>
                                                {v.config?.[c] || '—'}
                                            </span>
                                        ))
                                        : <span className="sv-etiqueta">{etiqueta(v.config) || v.sku}</span>}
                                    {ya ? <span className="sv-ya"><Check size={13} /> agregada</span> : <span className="sv-mas">+</span>}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
};


export default SelectorVariantes;
