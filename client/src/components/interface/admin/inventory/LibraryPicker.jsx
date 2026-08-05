import React, { useState, useEffect } from 'react';
import { X, Search, Check, Folder, ChevronRight, Hash, Layers, List, Package, Tag, Box, Palette, Sparkles, Lock, SlidersHorizontal } from 'lucide-react';
import Button from '../../../ui/Button';

const CATEGORY_FACET = '__category';
const PRODUCT_FACET = '__product';

// Orden canónico de tallas para ordenar esa faceta de menor a mayor
const SIZE_ORDER = ['12', '14', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL'];
const sortFacetValues = (field, values) => {
    if (/talla|size/i.test(field)) {
        return [...values].sort((a, b) => {
            const ia = SIZE_ORDER.indexOf(a.toUpperCase());
            const ib = SIZE_ORDER.indexOf(b.toUpperCase());
            return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
        });
    }
    return [...values].sort((a, b) => a.localeCompare(b));
};

// Descubre facetas escaneando los ítems según el contexto (data-driven)
const computeFacets = (items, type) => {
    if (type === 'variants') {
        const order = [];
        const byKey = {};
        const products = new Set();
        items.forEach((it) => {
            if (it && it.product_name) products.add(String(it.product_name));
            const cfg = (it && it.config) || {};
            Object.entries(cfg).forEach(([k, v]) => {
                if (v === null || v === undefined || v === '') return;
                if (!byKey[k]) { byKey[k] = new Set(); order.push(k); }
                byKey[k].add(String(v));
            });
        });
        const facets = [];
        // Faceta jerárquica clave: el producto base al que pertenece la variante
        if (products.size) {
            facets.push({ field: PRODUCT_FACET, label: 'Producto', values: [...products].sort((a, b) => a.localeCompare(b)) });
        }
        order.forEach((k) => facets.push({
            field: k,
            label: k.charAt(0).toUpperCase() + k.slice(1).toLowerCase(),
            values: sortFacetValues(k, [...byKey[k]]),
        }));
        return facets;
    }
    if (type === 'products') {
        const set = new Set();
        items.forEach((it) => { if (it && it.category) set.add(String(it.category)); });
        return set.size ? [{ field: CATEGORY_FACET, label: 'Categoría', values: [...set].sort((a, b) => a.localeCompare(b)) }] : [];
    }
    return [];
};

/**
 * LibraryPicker: Componente inmersivo universal para la "Mecánica de Biblioteca".
 * Se utiliza para seleccionar Características, Especificaciones o Categorías.
 */
const LibraryPicker = ({ 
    isOpen, 
    onClose, 
    onSelect, 
    onItemClick, // Nueva prop para modo exploración
    items = [], 
    initialSelectedIds = [],
    title = "Biblioteca",
    description = "Selecciona elementos para cargarlos en este contexto.",
    emptyMessage = "No se encontraron elementos.",
    labelSingular = "elemento",
    labelPlural = "elementos",
    type = "generic", // 'characteristics' | 'specifications' | 'categories' | 'variants' | 'generic'
    enableSelectionMode = false, // Nueva prop para forzar modo selección en modo exploración
    confirmLabel = "Confirmar Selección", // Prop personalizable para el botón final
    allowMultiple = true // Nueva prop para restringir a selección única
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [internalSelectMode, setInternalSelectMode] = useState(false);
    const [activeFacets, setActiveFacets] = useState({}); // { field: [valores] }
    const [showFacets, setShowFacets] = useState(false);

    const facetDefs = React.useMemo(() => computeFacets(items, type), [items, type]);
    const activeFacetCount = React.useMemo(
        () => Object.values(activeFacets).reduce((n, arr) => n + (arr?.length || 0), 0),
        [activeFacets]
    );

    const toggleFacet = (field, value) => {
        setActiveFacets((prev) => {
            const cur = prev[field] || [];
            const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
            const out = { ...prev, [field]: next };
            if (next.length === 0) delete out[field];
            return out;
        });
    };

    const isExplorer = !!onItemClick && !internalSelectMode; // Si estamos en internalSelectMode, NO somos explorer

    const initialIdsKey = React.useMemo(
        () => JSON.stringify((initialSelectedIds || []).map(id => String(id))),
        [initialSelectedIds]
    );

    // Sincronizar selección inicial cada vez que se abre
    useEffect(() => {
        if (isOpen) {
            const parsedIds = JSON.parse(initialIdsKey);
            setSelectedIds(prev => {
                if (prev.length === parsedIds.length && prev.every((v, i) => v === parsedIds[i])) {
                    return prev;
                }
                return parsedIds;
            });
            setActiveFacets(prev => Object.keys(prev).length === 0 ? prev : {});
        }
    }, [isOpen, initialIdsKey]);

    // No retornamos null para que el componente mantenga su estado interno (como el scroll)
    // cuando se oculta temporalmente durante la navegación.
    
    const matchesFacets = (item) => {
        if (!item || typeof item !== 'object') return Object.keys(activeFacets).length === 0;
        return Object.entries(activeFacets).every(([field, sel]) => {
            if (!sel || sel.length === 0) return true;
            const val = field === CATEGORY_FACET ? item.category
                : field === PRODUCT_FACET ? item.product_name
                : item.config?.[field];
            return sel.includes(String(val));
        });
    };

    const filtered = React.useMemo(() => {
        const q = searchTerm.toLowerCase();
        return items.filter(a => {
            const name = typeof a === 'string' ? a : (a.sku || a.name || a.value || '');
            const parentName = typeof a === 'object' ? (a.parent_name || '') : '';
            const textOk = name.toLowerCase().includes(q) || parentName.toLowerCase().includes(q);
            return textOk && matchesFacets(a);
        });
    }, [items, searchTerm, activeFacets]);

    const getItemId = (item) => {
        if (!item) return '';
        if (typeof item === 'string') return item;
        return String(item.id || item.value || '');
    };

    const toggleSelect = (item) => {
        const id = getItemId(item);
        if (!allowMultiple) {
            // Si ya está seleccionado, lo quitamos. Si no, lo ponemos como ÚNICO.
            setSelectedIds(selectedIds.includes(id) ? [] : [id]);
        } else {
            const next = selectedIds.includes(id)
                ? selectedIds.filter(i => i !== id)
                : [...selectedIds, id];
            setSelectedIds(next);
        }
    };

    const handleConfirm = () => {
        const selected = items.filter(a => {
            const idOrVal = getItemId(a);
            return selectedIds.includes(idOrVal);
        });
        onSelect(selected);
        onClose();
    };

    // Lógica de iconos y vistas previas según el tipo
    const getIcon = (t) => {
        if (t === 'specifications') return <List size={22} />;
        if (t === 'categories') return <Folder size={22} />;
        if (t === 'characteristics') return <Layers size={22} />;
        if (t === 'variants') return <Tag size={20} />;
        if (t === 'products') return <Package size={22} />;
        if (t === 'options') {
            const isColor = title?.toLowerCase().includes('color');
            return isColor ? <Palette size={22} /> : <Hash size={22} />;
        }
        return <Hash size={22} />;
    };

    const getPreview = (item) => {
        if (type === 'characteristics' && item.domain?.length) {
            return (
                <div className="library-picker-preview-tags">
                    {item.domain.slice(0, 4).map((d, i) => (
                        <span key={i} className="library-picker-preview-tag">
                            {d.value}
                        </span>
                    ))}
                    {item.domain.length > 4 && <span className="library-picker-preview-more">+{item.domain.length - 4} más</span>}
                </div>
            );
        }
        if (type === 'products') {
            return (
                <div className="library-picker-preview-prod">
                    <div className="library-picker-preview-prod-row">
                        <Folder size={12} color="#94a3b8" />
                        <span className="library-picker-preview-prod-cat">{item.category}</span>
                    </div>
                    <div className="library-picker-preview-prod-row">
                        <Box size={12} color="#94a3b8" />
                        <span className="library-picker-preview-prod-desc">Línea de diseño exclusiva</span>
                    </div>
                </div>
            );
        }
        if (type === 'variants') {
            const variantImage = item.image || item.image_url || item.image_urls?.[0] || item.media_assets?.[0]?.url || item.fullData?.images?.find(img => img.is_main)?.url;
            return (
                <div className="library-picker-preview-variant">
                    {variantImage && (
                        <div className="library-picker-preview-variant-img-wrap">
                            <img src={`${variantImage}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    )}
                    <div className="library-picker-preview-variant-info">
                        <div className="library-picker-preview-variant-configs">
                            {Object.entries(item.config || {}).map(([k, v]) => (
                                <span key={k} className="library-picker-preview-variant-config">{v}</span>
                            ))}
                        </div>
                        <div className="library-picker-preview-variant-meta">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Tag size={12} color="#16a34a" />
                                <span className="library-picker-preview-variant-price">${item.price?.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        if (type === 'options') {
            const hex = typeof item === 'object' ? item.hex_code : null;
            return (
                <div className="library-picker-preview-options">
                    {hex ? (
                        <div className="library-picker-preview-options-color" style={{ background: hex }} />
                    ) : (
                        <div className="library-picker-preview-options-nocolor">
                            <Sparkles size={16} />
                        </div>
                    )}
                    {hex && <span className="library-picker-preview-options-hex">{hex.toUpperCase()}</span>}
                </div>
            );
        }
        return item.description ? <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>{item.description}</p> : null;
    };

    return (
        <div className="library-picker-overlay" style={{ display: isOpen ? 'flex' : 'none', pointerEvents: isOpen ? 'auto' : 'none' }}>
            <div 
                onClick={(e) => e.stopPropagation()} // PROTECCIÓN: Evitar que clics en la biblioteca cierren componentes padres
                className="library-picker-modal"
            >
                {/* HEADER */}
                <div className="library-picker-header">
                    <div className="library-picker-header-left">
                        <div className="library-picker-icon-wrap">
                             {getIcon(type)}
                        </div>
                        <div>
                            <h2 className="library-picker-title">{title}</h2>
                            <p className="library-picker-desc">{description}</p>
                        </div>
                    </div>
                    <div className="library-picker-header-right">
                        {enableSelectionMode && (
                            <button 
                                type="button"
                                onClick={() => {
                                    setInternalSelectMode(!internalSelectMode);
                                    setSelectedIds([]); // Limpiamos al cambiar de modo para evitar confusiones
                                }}
                                className={`library-picker-btn-mode ${internalSelectMode ? 'active' : ''}`}
                            >
                                <div className="library-picker-mode-dot" />
                                {internalSelectMode ? 'DESACTIVAR SELECCIÓN' : 'ACTIVAR SELECCIÓN'}
                            </button>
                        )}
                        <button 
                            type="button"
                            onClick={onClose}
                            className="library-picker-close-btn"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* SEARCH & ACTIONS */}
                <div className="library-picker-search-wrapper">
                    <div className={`library-picker-search-container ${isExplorer ? 'is-explorer' : ''}`}>
                        <Search className="library-picker-search-icon" size={20} />
                        <input 
                            type="text" 
                            placeholder={`Buscar por nombre o descripción...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="library-picker-search-input"
                        />
                    </div>

                    {facetDefs.length > 0 && (
                        <div style={{ marginTop: '12px' }}>
                            <button
                                type="button"
                                onClick={() => setShowFacets(s => !s)}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                                    padding: '8px 14px', borderRadius: '12px', cursor: 'pointer',
                                    border: '1px solid ' + (activeFacetCount > 0 ? '#8f0653' : '#e2e8f0'),
                                    background: activeFacetCount > 0 ? '#fdf2f8' : '#fff',
                                    color: activeFacetCount > 0 ? '#8f0653' : '#475569',
                                    fontSize: '13px', fontWeight: '700',
                                }}
                            >
                                <SlidersHorizontal size={15} />
                                Filtros{activeFacetCount > 0 ? ` (${activeFacetCount})` : ''}
                                <ChevronRight size={14} style={{ transform: showFacets ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                            </button>
                            {activeFacetCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setActiveFacets({})}
                                    style={{ marginLeft: '10px', border: 'none', background: 'none', color: '#ef4444', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    Limpiar filtros
                                </button>
                            )}

                            {showFacets && (
                                <div style={{ marginTop: '12px', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', maxHeight: '220px', overflowY: 'auto' }}>
                                    {facetDefs.map(fd => (
                                        <div key={fd.field} style={{ marginBottom: '14px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>{fd.label}</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {fd.values.map(v => {
                                                    const on = (activeFacets[fd.field] || []).includes(v);
                                                    return (
                                                        <button
                                                            key={v}
                                                            type="button"
                                                            onClick={() => toggleFacet(fd.field, v)}
                                                            style={{
                                                                padding: '5px 12px', borderRadius: '999px', cursor: 'pointer',
                                                                fontSize: '12px', fontWeight: '600',
                                                                border: '1px solid ' + (on ? '#8f0653' : '#e2e8f0'),
                                                                background: on ? '#8f0653' : '#fff',
                                                                color: on ? '#fff' : '#475569',
                                                            }}
                                                        >
                                                            {v}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {!isExplorer && allowMultiple && (
                        <div className="library-picker-toolbar">
                            <div className="library-picker-toolbar-left">
                                <div className="library-picker-badge">
                                    {filtered.length} DE {items.length} {labelPlural.toUpperCase()}
                                </div>
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm('')}
                                        className="library-picker-btn-clear-search"
                                    >
                                        LIMPIAR BÚSQUEDA
                                    </button>
                                )}
                            </div>
                            <div className="library-picker-toolbar-right">
                                <button 
                                    type="button"
                                    onClick={() => {
                                        const filteredIds = filtered.map(i => getItemId(i));
                                        setSelectedIds([...new Set([...selectedIds, ...filteredIds])]);
                                    }}
                                    className="library-picker-btn-action"
                                >
                                    Seleccionar Todo
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setSelectedIds([])}
                                    className="library-picker-btn-clear-all"
                                >
                                    Limpiar Todo
                                </button>
                            </div>
                        </div>
                    )}
                    {!isExplorer && !allowMultiple && (
                        <div className="library-picker-toolbar-left">
                             <div className="library-picker-badge">
                                    {filtered.length} DE {items.length} {labelPlural.toUpperCase()}
                            </div>
                        </div>
                    )}
                </div>

                {/* CONTENT */}
                {/* CONTENT */}
                <div className="library-picker-content">
                    {filtered.length > 0 ? (
                        <div className="library-picker-grid">
                            {filtered.map((item, i) => {
                                    const idOrVal = getItemId(item);
                                    const isSelected = selectedIds.includes(idOrVal);
                                    return (
                                        <div 
                                            key={`${idOrVal}-${i}`}
                                            onClick={() => {
                                                if (isExplorer) onItemClick(item);
                                                else toggleSelect(idOrVal);
                                            }}
                                            className={`library-picker-card ${isExplorer ? 'selectable' : ''} ${(!isExplorer && isSelected) ? 'selected' : ''}`}
                                        >
                                        <div className="library-picker-card-header">
                                            {type !== 'variants' && type !== 'products' && (
                                                <div className="library-picker-card-icon">
                                                    {getIcon(type)}
                                                </div>
                                            )}
                                            <div className="library-picker-card-actions">
                                                {item.is_system && (
                                                    <div className="library-picker-system-badge" title="Protegido por el sistema">
                                                        <Lock size={12} />
                                                    </div>
                                                )}
                                                {!isExplorer && isSelected && (
                                                    <div className="library-picker-check">
                                                        <Check size={14} strokeWidth={4} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <h3 className="library-picker-card-title">
                                            {typeof item === 'string' ? item : (item.sku || item.name || item.value || '---')}
                                        </h3>
                                        {getPreview(item)}
                                        

                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="library-picker-empty">
                            <div className="library-picker-empty-icon">
                                <Search size={32} color="#cbd5e1" />
                            </div>
                            <h3 className="library-picker-empty-title">Sin resultados</h3>
                            <p className="library-picker-empty-desc">{emptyMessage}</p>
                        </div>
                    )}
                </div>

                {/* FOOTER - Solo se muestra si NO estamos en modo exploración */}
                {!isExplorer && (
                    <div className="library-picker-footer">
                        <div className="library-picker-footer-info">
                            <div className={`library-picker-footer-dot ${selectedIds.length > 0 ? 'active' : ''}`}></div>
                            <span className="library-picker-footer-label">
                                {selectedIds.length === 0 ? 'Nada seleccionado' : `${selectedIds.length} ${selectedIds.length === 1 ? labelSingular : labelPlural} seleccionados`}
                            </span>
                        </div>
                        <div className="library-picker-footer-actions">
                            <Button type="button" variant="outline" onClick={onClose} style={{ height: '52px', padding: '0 24px', borderRadius: '16px' }}>Cerrar</Button>
                            <Button 
                                type="button"
                                onClick={handleConfirm} 
                                variant="primary" 
                                disabled={selectedIds.length === 0}
                                style={{ height: '52px', padding: '0 32px', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(143, 6, 83, 0.2)' }}
                            >
                                {confirmLabel} <ChevronRight size={18} style={{ marginLeft: '8px' }} />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LibraryPicker;
