import React, { useState } from 'react';
import { X, ChevronRight, Check, Search, Layers, Box, Tag, ArrowLeft, Info, Hash, List, Sparkles, BookOpen, Image as ImageIcon, Upload, Trash2, Star, Palette } from 'lucide-react';
import Button from '../../../ui/Button';
import Accordion from '../../../ui/Accordion';
import LibraryPicker from './LibraryPicker';
import MediaGallery from '../media/MediaGallery';
import { generateEAN13 } from '../../../../features/productDetail/utils/skuUtils';

// Calcula qué filas (índices) coinciden con los filtros rápidos activos.
// Semántica: AND entre atributos con filtro, OR entre los valores de un mismo atributo.
const computeSelectionFromFilters = (filters, preview) => {
    const activeCriteria = Object.entries(filters).filter(([, s]) => s && s.size > 0);
    if (activeCriteria.length === 0) return new Set();

    const indices = new Set();
    preview.forEach((row, idx) => {
        const matchesAll = activeCriteria.every(
            ([attrName, activeValues]) => activeValues.has(row.config[attrName])
        );
        if (matchesAll) indices.add(idx);
    });
    return indices;
};

/**
 * VariantPicker — Asistente procedural para crear una nueva versión específica.
 */
const VariantPicker = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    suggestedSpecs = [], 
    allSpecs = [],
    allAttributes = [],
    baseSlug = ''
}) => {
    const [selectedAttrs, setSelectedAttrs] = useState([]); // [{id, name, values: []}]
    const [generatedPreview, setGeneratedPreview] = useState([]); // Matriz generada antes de confirmar
    const [selection, setSelection] = useState(new Set()); // Índices seleccionados en la pre-visualización

    const [step, setStep] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [showSpecLibrary, setShowSpecLibrary] = useState(false);
    const [showGlobalGallery, setShowGlobalGallery] = useState(false);
    
    // Estado para la librería de opciones por atributo
    const [showOptionsPicker, setShowOptionsPicker] = useState(false);
    const [activeAttrIndex, setActiveAttrIndex] = useState(null);

    // NUEVO: Filtros inteligentes para el Workspace (Paso 3)
    const [activeFilters, setActiveFilters] = useState({}); // { attrName: Set(values) }
    
    const [commercialData, setCommercialData] = useState({
        price: 0,
        stock: 0,
        sku: '',
        barcode: ''
    });

    // Rastrea el valor previo de isOpen para detectar la transición cerrado -> abierto.
    const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

    const semanticClean = (text) => {
        if (!text) return "";
        return text.toString()
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_');
    };

    // Reset del asistente cada vez que pasa de cerrado a abierto.
    // Se ajusta el estado DURANTE el render (patrón oficial de React para
    // "resetear estado cuando cambia una prop"), en vez de un setState síncrono
    // dentro de un useEffect que provocaría renders en cascada.
    if (isOpen !== prevIsOpen) {
        setPrevIsOpen(isOpen);
        if (isOpen) {
            setStep(1);
            setSelectedAttrs([]);
            setGeneratedPreview([]);
            setSelection(new Set());
            setActiveFilters({});
            setSearchTerm('');
            setCommercialData({ price: 0, stock: 0, sku: '', barcode: '' });
        }
    }

    if (!isOpen) return null;

    // --- LÓGICA DE SELECCIÓN (PASO 1) ---
    const toggleAttr = (attr) => {
        if (selectedAttrs.find(a => a.id === attr.id)) {
            setSelectedAttrs(selectedAttrs.filter(a => a.id !== attr.id));
        } else {
            setSelectedAttrs([...selectedAttrs, { ...attr, values: [] }]);
        }
    };

    const applySpec = (spec) => {
        const specAttrs = spec.characteristics || [];
        const newAttrs = [...selectedAttrs];
        
        specAttrs.forEach(sa => {
            const alreadyExists = newAttrs.find(a => 
                (a.id && sa.id && a.id === sa.id) || 
                (a.name.toLowerCase() === sa.name.toLowerCase())
            );

            if (!alreadyExists) {
                newAttrs.push({ 
                    ...sa, 
                    values: sa.allowed_values || [], 
                    allowed_values: sa.allowed_values || [] 
                });
            } else {
                const idx = newAttrs.indexOf(alreadyExists);
                newAttrs[idx] = { 
                    ...alreadyExists, 
                    values: sa.allowed_values || alreadyExists.values || [],
                    allowed_values: sa.allowed_values || alreadyExists.allowed_values || [] 
                };
            }
        });
        
        setSelectedAttrs(newAttrs);
        setShowSpecLibrary(false);
    };

    const toggleValueInAttr = (attrIdx, val) => {
        const next = [...selectedAttrs];
        const currentValues = next[attrIdx].values || [];
        
        if (currentValues.includes(val)) {
            next[attrIdx].values = currentValues.filter(v => v !== val);
        } else {
            next[attrIdx].values = [...currentValues, val];
        }
        setSelectedAttrs(next);
    };

    // --- RENDERIZADO DE PASOS ---

    const renderStep1 = () => {
        const filteredAll = allAttributes.filter(a => 
            a.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const renderCard = (item, isSelected, onClick) => (
            <div 
                key={item.id}
                onClick={onClick}
                className={`variant-picker-attr-card ${isSelected ? 'selected' : 'unselected'}`}
            >
                <div className="variant-picker-attr-card-header">
                    <div className="variant-picker-attr-icon">
                        <Layers size={18} />
                    </div>
                    {isSelected && (
                        <div className="variant-picker-attr-check">
                            <Check size={14} strokeWidth={4} />
                        </div>
                    )}
                </div>
                <div>
                    <h3 className="variant-picker-attr-name">
                        {item.name}
                    </h3>
                    <p className="variant-picker-attr-sub">Característica individual</p>
                </div>
            </div>
        );

        return (
            <div className="variant-picker-step1-container">
                <button 
                    type="button"
                    onClick={() => setShowSpecLibrary(true)}
                    className="variant-picker-spec-btn"
                >
                    <div className="variant-picker-spec-icon-wrap">
                        <BookOpen size={28} />
                    </div>
                    <div className="variant-picker-spec-text">
                        <span className="variant-picker-spec-title">Usar una Especificación</span>
                        <span className="variant-picker-spec-desc">
                            Inicia con un conjunto predefinido de características técnicas.
                        </span>
                    </div>
                    <div className="variant-picker-spec-arrow">
                        <ChevronRight size={20} />
                    </div>
                    <div className="variant-picker-spec-glow"></div>
                </button>

                <div className="variant-picker-divider">
                    <div className="variant-picker-divider-line"></div>
                    <span className="variant-picker-divider-text">o selecciona individualmente</span>
                    <div className="variant-picker-divider-line"></div>
                </div>

                <div className="variant-picker-search-container">
                    <Search className="variant-picker-search-icon" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar característica específica..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="variant-picker-search-input"
                    />
                </div>

                <div>
                    <h4 className="variant-picker-attr-header">
                        <Layers size={16} color="#64748b" /> Características del Catálogo
                    </h4>
                    <div className="variant-picker-attr-grid">
                        {filteredAll.map(attr => {
                            const isSelected = selectedAttrs.find(a => a.id === attr.id);
                            return renderCard(attr, isSelected, () => toggleAttr(attr));
                        })}
                    </div>
                </div>

                <LibraryPicker 
                    isOpen={showSpecLibrary}
                    onClose={() => setShowSpecLibrary(false)}
                    onSelect={(selected) => {
                        if(selected.length > 0) applySpec(selected[0]);
                    }}
                    title="Biblioteca de Especificaciones"
                    description={`Elige una ficha técnica para este producto.`}
                    type="specifications"
                    labelSingular="especificación"
                    labelPlural="especificaciones"
                    items={[
                        ...suggestedSpecs.map(s => ({ ...s, is_recommended: true })),
                        ...allSpecs.filter(s => !suggestedSpecs.some(ss => ss.id === s.id))
                    ]}
                />
            </div>
        );
    };

    const renderStep2 = () => {
        return (
            <div className="variant-picker-step2-container">
                <div className="variant-picker-step2-header">
                    <h3 className="variant-picker-step2-title">
                        Características del Grupo
                    </h3>
                    <div className="variant-picker-step2-badge">
                        {selectedAttrs.length} Elementos
                    </div>
                </div>

                <div className="variant-picker-accordion-list">
                    {selectedAttrs.map((attr, idx) => {
                        const isColor = attr.name.toLowerCase().includes('color');
                        const domain = attr.domain || [];
                        const currentValues = attr.values || [];
                        
                        return (
                                <Accordion 
                                key={idx}
                                title={attr.name}
                                icon={<Hash size={16} />}
                                initialOpen={true}
                                extraHeader={
                                    <div className="variant-picker-accordion-badge">
                                        {currentValues.length} SELECCIONADOS
                                    </div>
                                }
                            >
                                <div className="variant-picker-accordion-header">
                                    <div className="variant-picker-accordion-title">
                                        <Sparkles size={14} color="#8f0653" />
                                        <span>Selecciona Opciones Disponibles</span>
                                    </div>
                                    
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveAttrIndex(idx);
                                            setShowOptionsPicker(true);
                                        }}
                                        className="variant-picker-btn-lib"
                                    >
                                        <Layers size={12} />
                                        Ver biblioteca de opciones
                                    </button>
                                </div>

                                <div className="variant-picker-options-grid">
                                    {domain.map((opt, oIdx) => {
                                        const val = typeof opt === 'string' ? opt : (opt.value || opt.name || '---');
                                        const isSelected = currentValues.includes(val);
                                        const hex = typeof opt === 'string' ? null : opt.hex_code;
                                        
                                        return (
                                            <button 
                                                key={oIdx} 
                                                type="button" 
                                                onClick={() => toggleValueInAttr(idx, val)} 
                                                className={`variant-picker-option-btn ${isSelected ? 'selected' : 'unselected'}`}
                                            >
                                                {isColor && hex && (
                                                    <div className="variant-picker-option-color" style={{ background: hex }} />
                                                )}
                                                <span className="variant-picker-option-text">{val}</span>
                                                {isSelected && <Check size={14} style={{ flexShrink: 0 }} />}
                                            </button>
                                        );
                                    })}
                                    {domain.length === 0 && (
                                        <p className="variant-picker-empty-options">
                                            No hay opciones en la biblioteca para {attr.name}.
                                        </p>
                                    )}
                                </div>
                            </Accordion>
                        );
                    })}
                </div>
            </div>
        );
    };

    const toggleSelect = (idx) => {
        const next = new Set(selection);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        
        // Si el usuario toca manualmente, limpiamos filtros visuales para evitar inconsistencias
        if (Object.keys(activeFilters).length > 0) {
            setActiveFilters({});
        }
        setSelection(next);
    };

    const toggleQuickFilter = (attrName, value) => {
        const nextFilters = { ...activeFilters };
        if (!nextFilters[attrName]) {
            nextFilters[attrName] = new Set();
        } else {
            // Copia del Set para disparar reactividad
            nextFilters[attrName] = new Set(nextFilters[attrName]);
        }

        if (nextFilters[attrName].has(value)) {
            nextFilters[attrName].delete(value);
        } else {
            nextFilters[attrName].add(value);
        }

        // Limpieza si el set queda vacío
        if (nextFilters[attrName].size === 0) {
            delete nextFilters[attrName];
        }

        // Derivamos la selección directamente en el handler (en vez de vía useEffect),
        // manteniendo sincronizadas la selección visual y los filtros activos.
        setActiveFilters(nextFilters);
        setSelection(computeSelectionFromFilters(nextFilters, generatedPreview));
    };

    const applyBulk = (field, value) => {
        const next = [...generatedPreview];
        selection.forEach(idx => {
            next[idx][field] = value;
        });
        setGeneratedPreview(next);
    };

    // Genera el producto cartesiano de los valores seleccionados por atributo
    // y construye la matriz de variantes que se editará en el Workspace (Paso 3).
    const generateCombinations = () => {
        const attrs = selectedAttrs.filter(a => (a.values || []).length > 0);
        if (attrs.length === 0) {
            setGeneratedPreview([]);
            setSelection(new Set());
            setActiveFilters({});
            return;
        }

        // Cada combinación es un objeto config { [attr.name]: value }
        let combos = [{}];
        attrs.forEach(attr => {
            const next = [];
            combos.forEach(combo => {
                attr.values.forEach(val => {
                    next.push({ ...combo, [attr.name]: val });
                });
            });
            combos = next;
        });

        const rows = combos.map(config => {
            const sku = [baseSlug, ...Object.values(config)]
                .map(semanticClean)
                .filter(Boolean)
                .join('-')
                .toUpperCase();
            return {
                config,
                sku,
                barcode: generateEAN13(sku),
                price: commercialData.price || 0,
                stock: 0,
                media_ids: [],
                media_assets: [],
            };
        });

        setGeneratedPreview(rows);
        setSelection(new Set());
        setActiveFilters({});
    };

    const renderStep3 = () => {
        const selectionCount = selection.size;
        
        return (
            <div className="variant-picker-step3-container">
                {/* 1. SELECTION HELPERS */}
                <div className="variant-picker-helpers">
                    <div className="variant-picker-helpers-header">
                        <Search size={16} color="#64748b" />
                        <span>Acciones Rápidas de Selección</span>
                    </div>
                    <div className="variant-picker-helpers-actions">
                        <button 
                            type="button"
                            onClick={() => setSelection(new Set(generatedPreview.map((_, i) => i)))}
                            className="variant-picker-helpers-btn"
                        >
                            Seleccionar Todo
                        </button>
                        <button 
                            type="button"
                            onClick={() => {
                                setSelection(new Set());
                                setActiveFilters({});
                            }}
                            className="variant-picker-helpers-btn"
                        >
                            Limpiar Selección
                        </button>
                        
                        {selectedAttrs.map(attr => (
                            <div key={attr.id} className="variant-picker-helpers-attr-group">
                                <span className="variant-picker-helpers-attr-name">{attr.name}:</span>
                                {attr.values.map(val => {
                                    const isActive = activeFilters[attr.name]?.has(val);
                                    return (
                                        <button 
                                            key={val}
                                            type="button"
                                            onClick={() => toggleQuickFilter(attr.name, val)}
                                            className={`variant-picker-helpers-attr-val ${isActive ? 'active' : 'inactive'}`}
                                        >
                                            {val}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. TRANSFORMATION HUB (Bulk Action Bar) */}
                {selectionCount > 0 && (
                    <div className="variant-picker-bulk-bar">
                        <div className="variant-picker-bulk-count">
                            <span className="variant-picker-bulk-number">{selectionCount}</span>
                            <span className="variant-picker-bulk-label">SELECCIONADOS</span>
                        </div>
                        
                        <div className="variant-picker-bulk-actions">
                            <div className="variant-picker-bulk-price-wrap">
                                <Tag size={16} color="rgba(255,255,255,0.4)" />
                                <input 
                                    type="number" 
                                    placeholder="Precio lote"
                                    onBlur={(e) => { if(e.target.value) applyBulk('price', parseFloat(e.target.value)); }}
                                    className="variant-picker-bulk-price-input" 
                                />
                            </div>
                            {/* Stock oculto pero mantenido internamente */}
                            <button 
                                type="button"
                                onClick={() => setShowGlobalGallery(true)}
                                className="variant-picker-bulk-btn-photos"
                            >
                                <ImageIcon size={16} /> Asignar Fotos al Lote
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. MAIN TABLE */}
                <div className="variant-picker-table-container">
                    <table className="variant-picker-table">
                        <thead className="variant-picker-th-container" style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>
                            <tr>
                                <th className="variant-picker-th checkbox">
                                    <input 
                                        type="checkbox" 
                                        checked={selection.size === generatedPreview.length && generatedPreview.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelection(new Set(generatedPreview.map((_, i) => i)));
                                            else setSelection(new Set());
                                        }}
                                    />
                                </th>
                                <th className="variant-picker-th sku">IDENTIFICADOR (SKU)</th>
                                <th className="variant-picker-th barcode">CÓD. BARRAS</th>
                                {selectedAttrs.map(attr => (
                                    <th key={attr.id} className="variant-picker-th attr">{attr.name.toUpperCase()}</th>
                                ))}
                                <th className="variant-picker-th attr">FOTOS</th>
                                <th className="variant-picker-th price">PRECIO $</th>
                            </tr>
                        </thead>
                        <tbody>
                            {generatedPreview.map((row, idx) => (
                                <tr key={idx} className={`variant-picker-tr ${selection.has(idx) ? 'selected' : 'unselected'}`}>
                                    <td className="variant-picker-td">
                                        <input 
                                            type="checkbox" 
                                            checked={selection.has(idx)}
                                            onChange={() => toggleSelect(idx)}
                                        />
                                    </td>
                                    <td className="variant-picker-td sku">{row.sku}</td>
                                    <td className="variant-picker-td barcode">{row.barcode || generateEAN13(row.sku)}</td>
                                    {selectedAttrs.map(attr => (
                                        <td key={attr.id} className="variant-picker-td">
                                            <span className="variant-picker-attr-tag">
                                                {row.config[attr.name]}
                                            </span>
                                        </td>
                                    ))}
                                    <td className="variant-picker-td">
                                        <div className="variant-picker-photos-wrap">
                                            {row.media_assets?.map((asset, iIdx) => (
                                                <div key={asset.id || iIdx} className="variant-picker-photo-thumb">
                                                    <img src={`${asset.url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                            ))}
                                            {(!row.media_assets || row.media_assets?.length === 0) && <div className="variant-picker-photo-empty" />}
                                        </div>
                                    </td>
                                    <td className="variant-picker-td">
                                        <input 
                                            type="number" 
                                            value={row.price}
                                            onChange={(e) => {
                                                const next = [...generatedPreview];
                                                next[idx].price = parseFloat(e.target.value);
                                                setGeneratedPreview(next);
                                            }}
                                            className="variant-picker-price-input"
                                        />
                                    </td>
                                    {/* Stock 0 implícito */}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>


                {/* 4. OVERLAYS */}
                {showGlobalGallery && (
                    <div className="variant-picker-gallery-overlay">
                        <div className="variant-picker-gallery-modal">
                            <div className="variant-picker-gallery-header">
                                <h3 className="variant-picker-gallery-title">Asignar Fotos a la Selección</h3>
                                <button type="button" onClick={() => setShowGlobalGallery(false)} className="variant-picker-gallery-close">✕</button>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                <MediaGallery 
                                    selectionMode 
                                    allowMultiple={true}
                                    onSelect={(selectedAssets) => {
                                        if (!selectedAssets) return;
                                        const assets = Array.isArray(selectedAssets) ? selectedAssets : [selectedAssets];
                                        const newIds = assets.map(a => a.id);
                                        const next = [...generatedPreview];
                                        
                                        selection.forEach(idx => {
                                            const currentIds = next[idx].media_ids || [];
                                            const currentAssets = next[idx].media_assets || [];
                                            const combinedIds = [...new Set([...currentIds, ...newIds])];
                                            const combinedAssets = [...currentAssets];
                                            assets.forEach(newAsset => {
                                                if (!combinedAssets.find(a => a.id === newAsset.id)) {
                                                    combinedAssets.push(newAsset);
                                                }
                                            });
                                            next[idx].media_ids = combinedIds;
                                            next[idx].media_assets = combinedAssets;
                                        });
                                        
                                        setGeneratedPreview(next);
                                        setShowGlobalGallery(false);
                                    }} 
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="variant-picker-overlay">
            <div className={`variant-picker-modal ${step === 3 ? 'step-3' : 'step-normal'}`}>
                <div className="variant-picker-header">
                    <div>
                        <div className="variant-picker-header-left">
                            <div className="variant-picker-step-badge">PASO {step} DE 3</div>
                            <h3 className="variant-picker-title">
                                {step === 1 && "Características Base"}
                                {step === 2 && "Selección de Rangos"}
                                {step === 3 && "Workspace de Transformación"}
                            </h3>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="variant-picker-close-btn">✕</button>
                </div>
                <div className="variant-picker-content">
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                </div>



                {/* MODAL FOOTER ESTANDARIZADO */}
                <div className="variant-picker-footer">
                    {step === 1 && (
                        <div className="variant-picker-footer-step1">
                            <div className="variant-picker-footer-info">
                                <div className="variant-picker-footer-icon">
                                    <List size={20} />
                                </div>
                                <div>
                                    <span className="variant-picker-footer-label">Ficha de Versión</span>
                                    <span className="variant-picker-footer-value">
                                        {selectedAttrs.length} {selectedAttrs.length === 1 ? 'Grupo' : 'Grupos'}
                                    </span>
                                </div>
                            </div>
                            <div className="variant-picker-footer-actions">
                                <button type="button" onClick={onClose} className="variant-picker-footer-btn-back">Cancelar</button>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        if (selectedAttrs.length === 0) return alert("Selecciona al menos una característica.");
                                        setStep(2);
                                    }}
                                    disabled={selectedAttrs.length === 0}
                                    className="variant-picker-footer-btn-next"
                                >
                                    Siguiente Paso <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {step === 2 && (
                        <div className="variant-picker-footer-step1">
                            <div className="variant-picker-footer-info">
                                <div className="variant-picker-footer-icon">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <span className="variant-picker-footer-label">Proyección</span>
                                    <span className="variant-picker-footer-value">
                                        Generará {selectedAttrs.reduce((acc, curr) => acc * (curr.values.length || 1), 1)} variantes
                                    </span>
                                </div>
                            </div>
                            <div className="variant-picker-footer-actions">
                                <button type="button" onClick={() => setStep(1)} className="variant-picker-footer-btn-back">Atrás</button>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        const missing = selectedAttrs.find(a => a.values.length === 0);
                                        if (missing) return alert(`Selecciona opciones para ${missing.name}`);
                                        generateCombinations();
                                        setStep(3);
                                    }}
                                    className="variant-picker-footer-btn-next"
                                >
                                    Generar Workspace <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="variant-picker-footer-step1">
                            <div className="variant-picker-footer-info">
                                <div className="variant-picker-footer-icon">
                                    <Box size={20} />
                                </div>
                                <div>
                                    <span className="variant-picker-footer-label">Lote Listo</span>
                                    <span className="variant-picker-footer-value">
                                        {generatedPreview.length} Variantes Configurales
                                    </span>
                                </div>
                            </div>
                            <div className="variant-picker-footer-actions">
                                <button type="button" onClick={() => setStep(2)} className="variant-picker-footer-btn-back">Revisar Rangos</button>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        onConfirm(generatedPreview);
                                        onClose();
                                    }}
                                    className="variant-picker-footer-btn-confirm"
                                >
                                    <Check size={18} /> Confirmar Lote
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <LibraryPicker 
                    isOpen={showOptionsPicker}
                    onClose={() => setShowOptionsPicker(false)}
                    title={`Biblioteca de Opciones: ${activeAttrIndex !== null ? selectedAttrs[activeAttrIndex].name : ''}`}
                    description="Selecciona los valores permitidos para este atributo."
                    type="options"
                    labelSingular="opción"
                    labelPlural="opciones"
                    items={activeAttrIndex !== null ? (selectedAttrs[activeAttrIndex].domain || []) : []}
                    initialSelectedIds={activeAttrIndex !== null ? (selectedAttrs[activeAttrIndex].values || []) : []}
                    onSelect={(selected) => {
                        const next = [...selectedAttrs];
                        // Normalizamos a valores simples (strings) que es lo que espera VariantPicker
                        next[activeAttrIndex].values = selected.map(item => 
                            typeof item === 'string' ? item : (item.value || item.name)
                        );
                        setSelectedAttrs(next);
                        setShowOptionsPicker(false);
                    }}
                />
            </div>
        </div>
    );
};

export default VariantPicker;
