import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Search, Check, Package } from 'lucide-react';
import { get } from '../../../../lib/api/client';
import { getImageUrl, getSrcSet } from '../../../../lib/api/endpoints';
import { ordenarCaracteristicas } from '../../../../utils/prendas';

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
                <Estilos />
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
            <Estilos />
        </div>
    );
};

const Estilos = () => (
    <style>{`
        .sv-buscador { display:flex; align-items:center; gap:8px; border:1px solid #e2e8f0; border-radius:10px; padding:0 12px; height:40px; margin-bottom:12px; background:#fff; color:#94a3b8; }
        .sv-buscador input { border:none; outline:none; flex:1; font-size:14px; color:#1e1b4b; background:transparent; }
        .sv-grilla { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:10px; max-height:330px; overflow-y:auto; padding:2px; }
        .sv-tarjeta { display:flex; flex-direction:column; gap:8px; align-items:center; background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:10px; cursor:pointer; text-align:center; }
        .sv-tarjeta:hover { border-color:#8f0653; box-shadow:0 4px 12px rgba(143,6,83,.1); }
        .sv-foto { width:100%; aspect-ratio:3/4; border-radius:8px; overflow:hidden; background:#f8fafc; display:flex; align-items:center; justify-content:center; color:#cbd5e1; }
        .sv-foto img { width:100%; height:100%; object-fit:cover; }
        .sv-nombre { font-size:12px; font-weight:700; color:#334155; line-height:1.3; }
        .sv-cabecera { display:flex; align-items:center; gap:12px; margin-bottom:10px; flex-wrap:wrap; }
        .sv-cabecera strong { font-size:14px; color:#1e1b4b; }
        .sv-cuenta { font-size:12px; color:#64748b; margin-left:auto; }
        .sv-volver { display:flex; align-items:center; gap:5px; background:#f1f5f9; border:none; padding:6px 12px; border-radius:8px; font-size:12px; font-weight:700; color:#475569; cursor:pointer; }
        .sv-filtros { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px; }
        .sv-filtros select { height:34px; padding:0 10px; border:1px solid #e2e8f0; border-radius:8px; font-size:12px; background:#fff; color:#334155; }
        .sv-lista { display:flex; flex-direction:column; gap:5px; max-height:300px; overflow-y:auto; padding:2px; }
        /* El encabezado y las filas comparten la MISMA rejilla: si no, los
           valores no quedan bajo su etiqueta y volvemos al problema original. */
        .sv-cab-cols, .sv-variante { display:grid; grid-template-columns:34px repeat(var(--cols), minmax(0,1fr)) 60px; align-items:center; gap:10px; }
        .sv-cab-cols { padding:0 10px 5px; font-size:10px; text-transform:uppercase; letter-spacing:.5px; color:#94a3b8; font-weight:800; }
        .sv-variante { background:#fff; border:1px solid #e2e8f0; border-radius:10px; padding:7px 10px; cursor:pointer; text-align:left; }
        .sv-valor { font-size:13px; color:#334155; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .sv-sin { color:#cbd5e1; }
        .sv-variante:hover { background:#f8fafc; border-color:#8f0653; }
        .sv-variante.ya { opacity:.55; cursor:default; }
        .sv-mini { width:34px; height:42px; border-radius:6px; overflow:hidden; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#cbd5e1; flex-shrink:0; }
        .sv-mini img { width:100%; height:100%; object-fit:cover; }
        .sv-etiqueta { flex:1; font-size:13px; color:#334155; }
        .sv-mas { font-size:18px; font-weight:800; color:#8f0653; }
        .sv-ya { display:flex; align-items:center; gap:4px; font-size:11px; font-weight:700; color:#15803d; }
        .sv-vacio { padding:26px; text-align:center; color:#64748b; font-size:13px; background:#f8fafc; border-radius:10px; }
    `}</style>
);

export default SelectorVariantes;
