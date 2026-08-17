import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, Search, Tag, ImageIcon, Check, Layers, ArrowLeft, Save, 
    Sparkles, Package, AlertCircle, Loader2, ChevronRight, Hash 
} from 'lucide-react';
import Button from '../../../ui/Button';
import Accordion from '../../../ui/Accordion';
import MediaGallery from '../media/MediaGallery';
import { useNotification } from '../../../../context/NotificationContext';

const API_BASE = `/api/v1/admin/catalog`;

/**
 * BatchVariantEditor — Mesa de trabajo masiva para variantes.
 * Permite editar precios y fotos de múltiples variantes a la vez usando
 * lógica de selección por atributos.
 */
const BatchVariantEditor = ({ product, initialVariants = [], allAttributes = [], categoryAttributes = [], onClose, onSave }) => {
    const { toast } = useNotification();
    const [variants, setVariants] = useState([]);
    const [selection, setSelection] = useState(new Set()); // IDs de variantes seleccionadas
    const [activeFilters, setActiveFilters] = useState({}); // { attrName: Set(values) }
    const [showGlobalGallery, setShowGlobalGallery] = useState(false);
    const [saving, setSaving] = useState(false);
    const [bulkPriceInput, setBulkPriceInput] = useState('');
    const [viewFilter, setViewFilter] = useState('all'); // 'all' | 'selected' | 'unselected' | 'sin_precio'
    const [editingVariantId, setEditingVariantId] = useState(null); // ID de variante para edición individual de fotos

    // Una variante en $0 casi siempre es carga de precios incompleta, no un
    // regalo: se muestra en el catálogo con precio 0 y no se puede comprar.
    const sinPrecioCount = useMemo(() => variants.filter(v => !v.price).length, [variants]);

    const getImageUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        const cleanUrl = url.startsWith('/') ? url : `/${url}`;
        return `${cleanUrl}`;
    };

    // Inicialización blindada: Solo cargamos si el estado local está vacío
    useEffect(() => {
        if (variants.length > 0) return; // Evitar sobreescritura si ya hay datos trabajando
        
        const normalized = initialVariants.map(v => {
            return {
                ...v,
                price: v.price || 0,
                media_ids: Array.isArray(v.media_ids) ? v.media_ids : [],
                media_assets: Array.isArray(v.media_assets) ? v.media_assets : []
            };
        });
        setVariants(normalized);
    }, [initialVariants]); // Mantenemos la dependencia pero el guard arriba evita el reset indeseado

    // 1. CÁLCULO DINÁMICO DE ATRIBUTOS (Todas las características del catálogo y del producto)
    const attributesInUse = useMemo(() => {
        const finalAttrs = new Map();
        
        // A. Añadimos primero TODOS los atributos de la BIBLIOTECA GLOBAL (allAttributes)
        // para que TODAS las características creadas en "Gestión de Características" (ej. Estampado, Color, etc.) estén siempre disponibles
        if (allAttributes && allAttributes.length > 0) {
            allAttributes.forEach(attr => {
                if (!attr.name) return;
                const options = (attr.domain || []).map(d => typeof d === 'string' ? d : (d.value || d.name || '---'));
                finalAttrs.set(attr.name, new Set(options));
            });
        }

        // B. Añadimos cualquier atributo definido en la categoría por si aún no está en la biblioteca
        if (categoryAttributes && categoryAttributes.length > 0) {
            categoryAttributes.forEach(catAttr => {
                const name = typeof catAttr === 'string' ? catAttr : catAttr.name;
                if (!name) return;
                let targetName = name;
                for (const existingName of finalAttrs.keys()) {
                    if (existingName.toLowerCase() === name.toLowerCase()) {
                        targetName = existingName;
                        break;
                    }
                }
                if (!finalAttrs.has(targetName)) {
                    finalAttrs.set(targetName, new Set());
                }
            });
        }

        // C. Fusionamos con cualquier valor que venga directamente en los SKUs (config de cada variante)
        variants.forEach(v => {
            if (v.config) {
                Object.entries(v.config).forEach(([name, val]) => {
                    if (!name) return;
                    let targetName = name;
                    for (const existingName of finalAttrs.keys()) {
                        if (existingName.toLowerCase() === name.toLowerCase()) {
                            targetName = existingName;
                            break;
                        }
                    }
                    if (!finalAttrs.has(targetName)) {
                        finalAttrs.set(targetName, new Set());
                    }
                    if (val !== undefined && val !== null && val !== '') {
                        finalAttrs.get(targetName).add(val);
                    }
                });
            }
        });

        // Convertir el Map a array ordenado alfabéticamente para el UI
        return Array.from(finalAttrs.entries())
            .map(([name, valuesSet]) => ({
                name,
                values: Array.from(valuesSet).sort()
            }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [variants, allAttributes, categoryAttributes]);

    // 2. LÓGICA DE FILTRADO Y SELECCIÓN INTELIGENTE
    useEffect(() => {
        const activeCriteria = Object.entries(activeFilters).filter(([_, s]) => s && s.size > 0);
        
        if (activeCriteria.length > 0) {
            const nextSelection = new Set();
            variants.forEach(v => {
                let matchesAll = true;
                for (const [attrName, activeValues] of activeCriteria) {
                    const rowValue = v.config?.[attrName];
                    if (!activeValues.has(rowValue)) {
                        matchesAll = false;
                        break;
                    }
                }
                if (matchesAll) nextSelection.add(v.id);
            });
            setSelection(nextSelection);
        } else {
            // Si no hay filtros activos, limpiamos la selección para que la barra desaparezca
            setSelection(new Set());
        }
    }, [activeFilters, variants]);

    const toggleQuickFilter = (attrName, value) => {
        setActiveFilters(prev => {
            const next = { ...prev };
            if (!next[attrName]) next[attrName] = new Set();
            else next[attrName] = new Set(next[attrName]);

            if (next[attrName].has(value)) next[attrName].delete(value);
            else next[attrName].add(value);

            if (next[attrName].size === 0) delete next[attrName];
            return next;
        });
    };

    const toggleSelect = (id) => {
        setSelection(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // 3. ACCIONES EN LOTE
    const applyBulkPrice = (price) => {
        if (isNaN(price)) return;
        setVariants(prev => prev.map(v => 
            selection.has(v.id) ? { ...v, price } : v
        ));
    };

    const applyBulkImages = (selectedAssets) => {
        if (!selectedAssets) return;
        const assets = Array.isArray(selectedAssets) ? selectedAssets : [selectedAssets];
        const newIds = assets.map(a => a.id);

        setVariants(prev => prev.map(v => {
            const isTarget = editingVariantId 
                ? String(v.id) === String(editingVariantId)
                : selection.has(v.id);

            if (isTarget) {
                if (editingVariantId) {
                    // MODO INDIVIDUAL: Reemplazamos
                    return { ...v, media_ids: newIds, media_assets: assets };
                } else {
                    // MODO LOTE: Sumamos IDs únicos
                    const currentIds = v.media_ids || [];
                    const currentAssets = v.media_assets || [];
                    const combinedIds = [...new Set([...currentIds, ...newIds])];
                    const combinedAssets = [...currentAssets];
                    assets.forEach(newAsset => {
                        if (!combinedAssets.find(a => a.id === newAsset.id)) {
                            combinedAssets.push(newAsset);
                        }
                    });
                    return { ...v, media_ids: combinedIds, media_assets: combinedAssets };
                }
            }
            return v;
        }));
        setShowGlobalGallery(false);
        setEditingVariantId(null);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Usamos el endpoint de actualización masiva del producto, que es el oficial y robusto
            const payload = {
                ...product,
                skus: variants // Enviamos el set completo de variantes actualizado
            };

            const res = await fetch(`${API_BASE}/products/${product.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "Error al guardar los cambios masivos");
            }

            toast.success("Workspace sincronizado con el servidor con éxito");
            if (onSave) onSave();
        } catch (err) {
            console.error(err);
            toast.error("Error al guardar algunos cambios");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="batch-editor-container">
            {/* HEADER */}
            <div className="batch-editor-header">
                <div className="batch-editor-header-left">
                    <button onClick={onClose} className="batch-editor-btn-back">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="batch-editor-title">
                            Workspace: {product?.name}
                        </h2>
                    </div>
                </div>
                <div className="batch-editor-header-actions">
                    <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
                    <Button variant="primary" onClick={handleSave} disabled={saving} className="batch-editor-save-btn">
                        {saving ? <Loader2 className="batch-editor-spin" size={18} /> : <><Save size={18} className="batch-editor-save-icon" /> Guardar Cambios</>}
                    </Button>
                </div>
            </div>

            {/* AREA DE TRABAJO */}
            <div className="batch-editor-workspace">
                
                {/* 1. ACCIONES RÁPIDAS DE SELECCIÓN (Acordeón Maestro) */}
                <Accordion 
                    title="Acciones Rápidas de Selección" 
                    icon={<Sparkles size={18} />}
                    initialOpen={true}
                    className="batch-editor-master-accordion"
                    contentClassName="batch-editor-filters-area"
                    extraHeader={
                        <div className="batch-editor-accordion-actions">
                            <button onClick={(e) => { e.stopPropagation(); setSelection(new Set(variants.map(v => v.id))); }} className="batch-editor-accordion-btn">Todo</button>
                            <button onClick={(e) => { e.stopPropagation(); setSelection(new Set()); setActiveFilters({}); }} className="batch-editor-accordion-btn">Limpiar</button>
                        </div>
                    }
                >
                    <div className="batch-editor-quick-scroll-box">
                        {attributesInUse.map(attr => (
                            <Accordion 
                                key={attr.name}
                                title={attr.name}
                                initialOpen={attr.values && attr.values.length > 0}
                                showArrow={true}
                                className="batch-editor-inner-accordion"
                            >
                                <div className="batch-editor-filters-grid">
                                    {attr.values && attr.values.length > 0 ? (
                                        attr.values.map(val => {
                                            const isActive = activeFilters[attr.name]?.has(val);
                                            
                                            return (
                                                <button 
                                                    key={val}
                                                    onClick={() => toggleQuickFilter(attr.name, val)}
                                                    className={`batch-editor-filter-btn ${isActive ? 'active' : 'inactive'}`}
                                                >
                                                    {val}
                                                </button>
                                            );
                                        })
                                    ) : (
                                        <div className="batch-editor-no-options-msg">
                                            Sin opciones asignadas para esta característica en este producto.
                                        </div>
                                    )}
                                </div>
                            </Accordion>
                        ))}
                    </div>
                </Accordion>

                {/* 2. BARRA DE ACCIÓN MASIVA (Flotante o fija si hay selección) */}
                {selection.size > 0 && (
                    <div className="batch-editor-floating-bar">
                        <div className="batch-editor-selection-count">
                            <span className="batch-editor-count-number">{selection.size}</span>
                            <span className="batch-editor-count-label">SELECCIONADOS</span>
                        </div>
                        
                        <div className="batch-editor-bulk-actions">
                            <div className="batch-editor-price-input-wrapper">
                                <div className="batch-editor-price-input-inner">
                                    <Tag size={14} color="rgba(255,255,255,0.4)" />
                                    <input 
                                        type="number" 
                                        placeholder="Precio lote..."
                                        value={bulkPriceInput}
                                        onChange={(e) => setBulkPriceInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && bulkPriceInput) {
                                                applyBulkPrice(parseFloat(bulkPriceInput));
                                                setBulkPriceInput('');
                                            }
                                        }}
                                        className="batch-editor-price-input"
                                    />
                                </div>
                                {bulkPriceInput && (
                                    <button 
                                        onClick={() => {
                                            applyBulkPrice(parseFloat(bulkPriceInput));
                                            setBulkPriceInput('');
                                        }}
                                        className="batch-editor-btn-apply"
                                    >
                                        Aplicar
                                    </button>
                                )}
                            </div>
                            <button 
                                onClick={() => setShowGlobalGallery(true)}
                                className="batch-editor-btn-photos"
                            >
                                <ImageIcon size={18} /> Asignar Fotos
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. TABLA DE VARIANTES */}
                <div className="batch-editor-table-container">
                    {/* Filtro de Visibilidad de la Tabla */}
                    <div className="batch-editor-table-header-controls">
                        <div className="batch-editor-table-title">
                            <Layers size={14} color="#64748b" />
                            <span>Vista de Tabla</span>
                        </div>
                        <div className="batch-editor-view-filters">
                            {[
                                { id: 'all', label: 'Todos' },
                                { id: 'selected', label: 'Seleccionados' },
                                { id: 'unselected', label: 'Restantes' },
                                { id: 'sin_precio', label: `Sin precio${sinPrecioCount ? ` (${sinPrecioCount})` : ''}` }
                            ].map(btn => (
                                <button
                                    key={btn.id}
                                    onClick={() => setViewFilter(btn.id)}
                                    className={`batch-editor-view-btn ${viewFilter === btn.id ? 'active' : 'inactive'}`}
                                    title={btn.id === 'sin_precio' ? 'Variantes en $0: normalmente es carga incompleta, no un regalo' : undefined}
                                >
                                    {btn.label}
                                </button>
                            ))}
                            {sinPrecioCount > 0 && (
                                <button
                                    onClick={() => {
                                        setViewFilter('sin_precio');
                                        setSelection(new Set(variants.filter(v => !v.price).map(v => v.id)));
                                    }}
                                    className="batch-editor-view-btn inactive"
                                    title="Selecciona las variantes sin precio para corregirlas de una vez"
                                >
                                    ⚠ Seleccionar sin precio
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="batch-editor-table-scroll">
                        <table className="batch-editor-table">
                            <thead className="batch-editor-th-container">
                                <tr>
                                    <th className="batch-editor-th checkbox">
                                        <input 
                                            type="checkbox" 
                                            checked={selection.size === variants.length && variants.length > 0}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelection(new Set(variants.map(v => v.id)));
                                                else setSelection(new Set());
                                            }}
                                        />
                                    </th>
                                    <th className="batch-editor-th sku">IDENTIFICADOR (SKU)</th>
                                    {attributesInUse.map(attr => (
                                        <th key={attr.name} className="batch-editor-th attr">{attr.name.toUpperCase()}</th>
                                    ))}
                                    <th className="batch-editor-th attr">FOTOS</th>
                                    <th className="batch-editor-th price">PRECIO $</th>
                                </tr>
                            </thead>
                            <tbody>
                                {variants
                                    .filter(v => {
                                        if (viewFilter === 'selected') return selection.has(v.id);
                                        if (viewFilter === 'unselected') return !selection.has(v.id);
                                        if (viewFilter === 'sin_precio') return !v.price;
                                        return true;
                                    })
                                    .map((v) => (
                                        <tr key={v.id} className={`batch-editor-tr ${selection.has(v.id) ? 'selected' : 'unselected'}`}>
                                            <td className="batch-editor-td">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selection.has(v.id)}
                                                    onChange={() => toggleSelect(v.id)}
                                                />
                                            </td>
                                            <td className="batch-editor-td sku">{v.sku}</td>
                                            {attributesInUse.map(attr => (
                                                <td key={attr.name} className="batch-editor-td">
                                                    <span className="batch-editor-attr-tag">
                                                        {v.config?.[attr.name] || '---'}
                                                    </span>
                                                </td>
                                            ))}
                                            <td 
                                                className="batch-editor-td photos"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Capturamos el ID y abrimos la galería en un solo paso
                                                    setEditingVariantId(v.id);
                                                    setShowGlobalGallery(true);
                                                }}
                                            >
                                                <div className="batch-editor-photos-wrapper">
                                                    {v.media_assets?.map((asset, i) => (
                                                        <div key={asset.id || i} className="batch-editor-photo-thumb">
                                                            <img src={getImageUrl(asset.url)} className="batch-editor-photo-img" />
                                                        </div>
                                                    ))}
                                                    {(!v.media_assets || v.media_assets.length === 0) && (
                                                        <div className="batch-editor-photo-empty">
                                                            <ImageIcon size={16} />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="batch-editor-td">
                                                <input 
                                                    type="number" 
                                                    value={v.price}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value);
                                                        setVariants(prev => prev.map(item => item.id === v.id ? { ...item, price: val } : item));
                                                    }}
                                                    className="batch-editor-price-input-table"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* OVERLAY DE GALERIA */}
            {showGlobalGallery && (
                <div className="batch-editor-gallery-overlay">
                    <div className="batch-editor-gallery-content">
                        <div className="batch-editor-gallery-header">
                            <div>
                                <h3 className="batch-editor-gallery-title">Asignar Fotos al Lote</h3>
                                <p className="batch-editor-gallery-subtitle">Selecciona las imágenes que se añadirán a las {selection.size} variantes seleccionadas.</p>
                            </div>
                            <button onClick={() => setShowGlobalGallery(false)} className="batch-editor-gallery-close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="batch-editor-gallery-body">
                            <MediaGallery 
                                key={showGlobalGallery ? (editingVariantId || 'bulk') : 'none'}
                                selectionMode 
                                allowMultiple={true}
                                initialSelected={
                                    editingVariantId 
                                        ? (variants.find(v => String(v.id) === String(editingVariantId))?.media_ids || [])
                                        : []
                                }
                                contextInfo={
                                    editingVariantId 
                                        ? `VARIANTE: ${variants.find(v => String(v.id) === String(editingVariantId))?.sku}`
                                        : `${selection.size} VARIANTES SELECCIONADAS`
                                }
                                onClose={() => {
                                    setShowGlobalGallery(false);
                                    setEditingVariantId(null);
                                }}
                                onSelect={(data) => {
                                    applyBulkImages(data);
                                }} 
                            />
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

export default BatchVariantEditor;
