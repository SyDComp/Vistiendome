import React, { useState, useEffect, useMemo } from 'react';
import { 
    X, Search, Tag, ImageIcon, Check, Layers, ArrowLeft, Save, 
    Sparkles, Package, AlertCircle, Loader2, ChevronRight, Hash 
} from 'lucide-react';
import Button from '../../../ui/Button';
import Accordion from '../../../ui/Accordion';
import MediaGallery from '../media/MediaGallery';
import { useNotification } from '../../../../context/NotificationContext';

const API_BASE = `${(window.location.origin.includes('localhost') ? 'http://localhost:8000' : '')}/api/v1/admin/catalog`;

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
    const [viewFilter, setViewFilter] = useState('all'); // 'all', 'selected', 'unselected'
    const [editingVariantId, setEditingVariantId] = useState(null); // ID de variante para edición individual de fotos

    const getImageUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        const cleanUrl = url.startsWith('/') ? url : `/${url}`;
        return `${(window.location.origin.includes('localhost') ? 'http://localhost:8000' : '')}${cleanUrl}`;
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

    // 1. CÁLCULO DINÁMICO DE ATRIBUTOS (La unión de todo lo posible)
    const attributesInUse = useMemo(() => {
        const finalAttrs = new Map();
        
        // Identificar nombres de atributos permitidos (Normalizados a minúsculas para el cruce)
        const allowedNamesLower = new Set(categoryAttributes.map(n => n.toLowerCase()));
        variants.forEach(v => {
            if (v.config) Object.keys(v.config).forEach(k => allowedNamesLower.add(k.toLowerCase()));
        });

        // A. Añadimos primero TODOS los atributos de la BIBLIOTECA GLOBAL que coincidan con los permitidos
        if (allAttributes && allAttributes.length > 0) {
            allAttributes.forEach(attr => {
                if (allowedNamesLower.has(attr.name.toLowerCase())) {
                    const options = (attr.domain || []).map(d => typeof d === 'string' ? d : (d.value || d.name || '---'));
                    finalAttrs.set(attr.name, new Set(options));
                }
            });
        }

        // B. Fusionamos con cualquier valor que venga directamente en los SKUs 
        // (por si hay valores manuales o nuevos que no están en el dominio oficial todavía)
        variants.forEach(v => {
            if (v.config) {
                Object.entries(v.config).forEach(([name, val]) => {
                    // Normalize case to match category attributes if possible
                    let targetName = name;
                    for (const existingName of finalAttrs.keys()) {
                        if (existingName.toLowerCase() === name.toLowerCase()) {
                            targetName = existingName;
                            break;
                        }
                    }

                    if (!finalAttrs.has(targetName)) {
                        // Si no estaba en la biblioteca pero está en el SKU, lo añadimos (ad-hoc)
                        finalAttrs.set(targetName, new Set());
                    }
                    finalAttrs.get(targetName).add(val);
                });
            }
        });

        // Convertir el Map a array ordenado para el UI
        return Array.from(finalAttrs.entries()).map(([name, valuesSet]) => ({
            name,
            values: Array.from(valuesSet).sort()
        }));
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
                    <Button variant="primary" onClick={handleSave} disabled={saving} style={{ background: '#8f0653', minWidth: '160px' }}>
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} style={{ marginRight: '8px' }} /> Guardar Cambios</>}
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
                    extraHeader={
                        <div className="batch-editor-accordion-actions">
                            <button onClick={(e) => { e.stopPropagation(); setSelection(new Set(variants.map(v => v.id))); }} className="batch-editor-accordion-btn">Todo</button>
                            <button onClick={(e) => { e.stopPropagation(); setSelection(new Set()); setActiveFilters({}); }} className="batch-editor-accordion-btn">Limpiar</button>
                        </div>
                    }
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {attributesInUse.map(attr => (
                            <Accordion 
                                key={attr.name}
                                title={attr.name}
                                initialOpen={true}
                                showArrow={true}
                                style={{ border: '1px solid #f1f5f9', boxShadow: 'none', borderRadius: '14px' }}
                            >
                                <div className="batch-editor-filters-grid">
                                    {attr.values.map(val => {
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
                                    })}
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
                                { id: 'unselected', label: 'Restantes' }
                            ].map(btn => (
                                <button
                                    key={btn.id}
                                    onClick={() => setViewFilter(btn.id)}
                                    className={`batch-editor-view-btn ${viewFilter === btn.id ? 'active' : 'inactive'}`}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="batch-editor-table-scroll">
                        <table className="batch-editor-table">
                            <thead className="batch-editor-th-container" style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>
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
                                                            <img src={getImageUrl(asset.url)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                        <div style={{ flex: 1, overflowY: 'auto' }}>
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

            <style>{`
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .photo-thumb:hover {
                    transform: scale(1.1);
                    z-index: 5;
                    border-color: #8f0653;
                }
            `}</style>
        </div>
    );
};

export default BatchVariantEditor;
