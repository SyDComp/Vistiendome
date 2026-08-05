import React, { useState, useEffect } from 'react';
import { Home, Link2, Package, Layers } from 'lucide-react';
import { getProducts } from '../../../lib/api/endpoints/products.api';
import { getCollections } from '../../../lib/api/endpoints/collections.api';

/**
 * Campo reutilizable de enlace. Permite elegir:
 *  - Página interna fija (Inicio, Catálogo, ...)
 *  - Un producto (y opcionalmente una variante)
 *  - Una colección
 *  - URL externa
 * onChange(value, label): value = ruta/URL; label = nombre amigable sugerido.
 */
const INTERNAL_PAGES = [
    { value: '/', label: 'Inicio' },
    { value: '/catalogo', label: 'Catálogo' },
    { value: '/explorador', label: 'Explorador' },
    { value: '/colecciones', label: 'Colecciones' },
    { value: '/nosotros', label: 'Nosotros' },
    { value: '/contacto', label: 'Contacto' },
    { value: '/ayuda', label: 'Atención al Cliente' },
];

const collName = (c) => c?.name || c?.nombre || c?.titulo || c?.slug || '';

const LinkField = ({ value, onChange, label }) => {
    const looksExternal = !!value && /^https?:\/\//i.test(value);
    const [mode, setMode] = useState(looksExternal ? 'external' : 'internal');

    const initialKind = (!value || INTERNAL_PAGES.some(p => p.value === value)) ? 'page'
        : value.startsWith('/catalogo/producto/') ? 'product'
        : value.startsWith('/coleccion/') ? 'collection' : 'page';
    const [kind, setKind] = useState(initialKind);

    const [products, setProducts] = useState([]);
    const [collections, setCollections] = useState([]);

    useEffect(() => {
        if (mode !== 'internal') return;
        if (kind === 'product' && products.length === 0) getProducts().then(d => setProducts(d || [])).catch(() => {});
        if (kind === 'collection' && collections.length === 0) getCollections().then(d => setCollections(d || [])).catch(() => {});
    }, [mode, kind]); // eslint-disable-line

    // Derivar selección actual desde el value
    const prodMatch = (value || '').match(/^\/catalogo\/producto\/([^/]+)(?:\/([^/]+))?/);
    const selSlug = prodMatch ? prodMatch[1] : '';
    const selSku = prodMatch ? (prodMatch[2] || '') : '';
    const collMatch = (value || '').match(/^\/coleccion\/([^/]+)/);
    const selColl = collMatch ? collMatch[1] : '';
    const selProduct = products.find(p => p.slug === selSlug);

    const emitPage = (v) => {
        const p = INTERNAL_PAGES.find(x => x.value === v);
        onChange(v, p ? p.label : '');
    };
    const emitProduct = (slug, sku) => {
        if (!slug) { onChange('', ''); return; }
        const prod = products.find(p => p.slug === slug);
        const route = sku ? `/catalogo/producto/${slug}/${sku}` : `/catalogo/producto/${slug}`;
        let lbl = prod?.name || '';
        if (sku && prod) {
            const v = prod.variants?.find(x => x.sku === sku);
            if (v?.config) lbl += ' · ' + Object.values(v.config).join(' / ');
        }
        onChange(route, lbl);
    };
    const emitCollection = (slug) => {
        if (!slug) { onChange('', ''); return; }
        const c = collections.find(x => x.slug === slug);
        onChange(`/coleccion/${slug}`, collName(c));
    };

    const btn = (active) => ({
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '700',
        cursor: 'pointer', border: '1px solid ' + (active ? '#8f0653' : '#e2e8f0'),
        background: active ? '#fdf2f8' : '#fff', color: active ? '#8f0653' : '#64748b',
    });
    const inputStyle = { width: '100%', height: '44px', padding: '0 14px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '14px', marginTop: '10px', boxSizing: 'border-box' };

    return (
        <div>
            {label && <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" style={btn(mode === 'internal')} onClick={() => setMode('internal')}>
                    <Home size={14} /> Interno
                </button>
                <button type="button" style={btn(mode === 'external')} onClick={() => setMode('external')}>
                    <Link2 size={14} /> URL externa
                </button>
            </div>

            {mode === 'external' ? (
                <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value, '')}
                    placeholder="https://..."
                    style={inputStyle}
                />
            ) : (
                <>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' }}>
                        <button type="button" style={btn(kind === 'page')} onClick={() => setKind('page')}><Home size={13} /> Página</button>
                        <button type="button" style={btn(kind === 'product')} onClick={() => setKind('product')}><Package size={13} /> Producto</button>
                        <button type="button" style={btn(kind === 'collection')} onClick={() => setKind('collection')}><Layers size={13} /> Colección</button>
                    </div>

                    {kind === 'page' && (
                        <select value={INTERNAL_PAGES.some(p => p.value === value) ? value : ''} onChange={(e) => emitPage(e.target.value)} style={inputStyle}>
                            <option value="">— Sin enlace —</option>
                            {INTERNAL_PAGES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                    )}

                    {kind === 'product' && (
                        <>
                            <select value={selSlug} onChange={(e) => emitProduct(e.target.value, '')} style={inputStyle}>
                                <option value="">— Elegir producto —</option>
                                {products.map(p => <option key={p.id} value={p.slug}>{p.name}</option>)}
                            </select>
                            {selProduct?.variants?.length > 0 && (
                                <select value={selSku} onChange={(e) => emitProduct(selSlug, e.target.value)} style={inputStyle}>
                                    <option value="">Todo el producto (sin variante)</option>
                                    {selProduct.variants.map(v => (
                                        <option key={v.sku} value={v.sku}>{Object.values(v.config || {}).join(' / ') || v.sku}</option>
                                    ))}
                                </select>
                            )}
                        </>
                    )}

                    {kind === 'collection' && (
                        <select value={selColl} onChange={(e) => emitCollection(e.target.value)} style={inputStyle}>
                            <option value="">— Elegir colección —</option>
                            {collections.map(c => <option key={c.id || c.slug} value={c.slug}>{collName(c)}</option>)}
                        </select>
                    )}
                </>
            )}
        </div>
    );
};

export default LinkField;
