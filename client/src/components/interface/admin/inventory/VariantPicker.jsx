import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Check, Search, Layers, Box, Tag, ArrowLeft, Info, Hash, List, Sparkles, BookOpen, Image as ImageIcon, Upload, Trash2, Star, Palette } from 'lucide-react';
import Button from '../../../ui/Button';
import Accordion from '../../../ui/Accordion';
import LibraryPicker from './LibraryPicker';
import MediaGallery from '../media/MediaGallery';
import { formatChar, formatOpt } from '../../../../utils/formatters';

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
    categoryId,
    productId,
    baseSlug = ''
}) => {
    const [selectedAttrs, setSelectedAttrs] = useState([]); // [{id, name, values: []}]
    const [variantImages, setVariantImages] = useState([]); // Array para batch upload/selection
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

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelectedAttrs([]);
            setVariantImages([]);
            setGeneratedPreview([]);
            setSelection(new Set());
            setActiveFilters({});
            setCommercialData({ price: 0, stock: 0, sku: '', barcode: '' });
        }
    }, [isOpen]);

    // EFECTO: Sincronizar selección con filtros activos
    useEffect(() => {
        if (step !== 3) return;

        // Lógica: AND entre atributos con filtros, OR entre valores del mismo atributo
        const filteredIndices = new Set();
        const activeCriteria = Object.entries(activeFilters).filter(([_, s]) => s && s.size > 0);
        
        if (activeCriteria.length > 0) {
            generatedPreview.forEach((row, idx) => {
                let matchesAllAttrs = true;

                for (const [attrName, activeValues] of activeCriteria) {
                    const rowValue = row.config[attrName];
                    if (!activeValues.has(rowValue)) {
                        matchesAllAttrs = false;
                        break;
                    }
                }

                if (matchesAllAttrs) {
                    filteredIndices.add(idx);
                }
            });
            setSelection(filteredIndices);
        } else {
            // Si se limpian todos los filtros, limpiamos la selección automáticamente
            // para mantener la consistencia visual total.
            setSelection(new Set());
        }
    }, [activeFilters, generatedPreview, step]);

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
                    values: [], 
                    allowed_values: sa.allowed_values || [] 
                });
            } else if (sa.allowed_values?.length > 0) {
                const idx = newAttrs.indexOf(alreadyExists);
                newAttrs[idx] = { ...alreadyExists, allowed_values: sa.allowed_values };
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

    // --- LÓGICA DE IMÁGENES (PASO 4) ---
    const handleTransparentUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('http://localhost:8000/api/v1/media/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                // data.url es la ruta relativa devuelta por el servidor
                const newImg = { 
                    url: data.url, 
                    is_main: variantImages.length === 0,
                    ui_config: { zoom: 1, x: 0, y: 0, rotate: 0, brightness: 100 }
                };
                setVariantImages([...variantImages, newImg]);
            }
        } catch (err) {
            console.error("Error en subida transparente:", err);
        } finally {
            setUploading(false);
        }
    };

    const addFromLibrary = (url) => {
        if (variantImages.some(img => img.url === url)) return;
        const newImg = { 
            url, 
            is_main: variantImages.length === 0,
            ui_config: { zoom: 1, x: 0, y: 0, rotate: 0, brightness: 100 }
        };
        setVariantImages([...variantImages, newImg]);
        setShowGlobalGallery(false);
    };

    const removeImage = (url) => {
        const filtered = variantImages.filter(img => img.url !== url);
        // Si borramos la principal, asignamos la siguiente si existe
        if (variantImages.find(img => img.url === url)?.is_main && filtered.length > 0) {
            filtered[0].is_main = true;
        }
        setVariantImages(filtered);
    };

    const setMainVariantImage = (url) => {
        setVariantImages(variantImages.map(img => ({ 
            ...img, 
            is_main: img.url === url 
        })));
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
                style={{
                    padding: '20px', borderRadius: '24px', border: '2px solid',
                    borderColor: isSelected ? '#8f0653' : '#f1f5f9',
                    background: '#fff',
                    cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isSelected ? 'scale(1.02)' : 'none',
                    boxShadow: isSelected ? '0 12px 30px -10px rgba(143, 6, 83, 0.15)' : 'none',
                    position: 'relative',
                    display: 'flex', flexDirection: 'column', gap: '12px'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ 
                        width: '36px', height: '36px', 
                        background: isSelected ? '#8f0653' : '#f8fafc', 
                        borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        color: isSelected ? '#fff' : '#64748b' 
                    }}>
                        <Layers size={18} />
                    </div>
                    {isSelected && (
                        <div style={{ width: '24px', height: '24px', background: '#8f0653', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            <Check size={14} strokeWidth={4} />
                        </div>
                    )}
                </div>
                <div>
                    <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '900', color: '#1e1b4b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {item.name}
                    </h3>
                    <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#94a3b8', fontWeight: '500' }}>Característica individual</p>
                </div>
            </div>
        );

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', height: '100%' }}>
                <button 
                    type="button"
                    onClick={() => setShowSpecLibrary(true)}
                    style={{
                        padding: '32px', borderRadius: '24px', background: '#1e1b4b', color: '#fff',
                        border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '20px',
                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: '0 20px 40px -12px rgba(30,27,75,0.25)',
                        position: 'relative', overflow: 'hidden'
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.1)', borderRadius: '18px', color: '#fff' }}>
                        <BookOpen size={28} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <span style={{ display: 'block', fontSize: '18px', fontWeight: '900', letterSpacing: '0.02em' }}>Usar una Especificación</span>
                        <span style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginTop: '4px' }}>
                            Inicia con un conjunto predefinido de características técnicas.
                        </span>
                    </div>
                    <div style={{ marginLeft: 'auto', width: '44px', height: '44px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ChevronRight size={20} />
                    </div>
                    <div style={{ position: 'absolute', top: '-50%', left: '-20%', width: '100%', height: '200%', background: 'linear-gradient(45deg, transparent, rgba(255,255,255,0.03), transparent)', transform: 'rotate(25deg)', pointerEvents: 'none' }}></div>
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }}></div>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>o selecciona individualmente</span>
                    <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }}></div>
                </div>

                <div style={{ position: 'relative' }}>
                    <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar característica específica..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ width: '100%', padding: '18px 18px 18px 48px', borderRadius: '20px', border: '2px solid #f1f5f9', outline: 'none', fontSize: '15px', background: '#f8fafc', transition: 'all 0.2s', boxSizing: 'border-box' }}
                    />
                </div>

                <div>
                    <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: '800', color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Layers size={16} color="#64748b" /> Características del Catálogo
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h3 style={{ margin: 0, fontSize: '12px', fontWeight: '900', color: '#1e1b4b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Características del Grupo
                    </h3>
                    <div style={{ background: '#8f0653', color: '#fff', fontSize: '10px', fontWeight: '900', padding: '2px 8px', borderRadius: '8px' }}>
                        {selectedAttrs.length} Elementos
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                                    <div style={{ fontSize: '10px', fontWeight: '800', color: '#8f0653', background: '#fdf2f8', padding: '2px 8px', borderRadius: '6px' }}>
                                        {currentValues.length} SELECCIONADOS
                                    </div>
                                }
                            >
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    marginBottom: '16px',
                                    gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Sparkles size={14} color="#8f0653" />
                                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Selecciona Opciones Disponibles</span>
                                    </div>
                                    
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setActiveAttrIndex(idx);
                                            setShowOptionsPicker(true);
                                        }}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            border: '1px solid #e2e8f0',
                                            background: '#fff',
                                            color: '#64748b',
                                            fontSize: '10px',
                                            fontWeight: '800',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            transition: 'all 0.2s ease',
                                            textTransform: 'uppercase'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8f0653'; e.currentTarget.style.color = '#8f0653'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
                                    >
                                        <Layers size={12} />
                                        Ver biblioteca de opciones
                                    </button>
                                </div>

                                <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                                    gap: '10px' 
                                }}>
                                    {domain.map((opt, oIdx) => {
                                        const val = typeof opt === 'string' ? opt : (opt.value || opt.name || '---');
                                        const isSelected = currentValues.includes(val);
                                        const hex = typeof opt === 'string' ? null : opt.hex_code;
                                        
                                        return (
                                            <button 
                                                key={oIdx} 
                                                type="button" 
                                                onClick={() => toggleValueInAttr(idx, val)} 
                                                style={{ 
                                                    padding: '10px 12px', 
                                                    borderRadius: '12px', 
                                                    border: '2px solid', 
                                                    borderColor: isSelected ? '#8f0653' : '#f1f5f9', 
                                                    background: isSelected ? '#fdf2f8' : '#fff', 
                                                    color: isSelected ? '#8f0653' : '#1e1b4b', 
                                                    fontSize: '12px',
                                                    fontWeight: '700',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    transition: 'all 0.2s',
                                                    textAlign: 'left'
                                                }}
                                            >
                                                {isColor && hex && (
                                                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: hex, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                                                )}
                                                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{val}</span>
                                                {isSelected && <Check size={14} style={{ flexShrink: 0 }} />}
                                            </button>
                                        );
                                    })}
                                    {domain.length === 0 && (
                                        <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
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

        setActiveFilters(nextFilters);
    };

    const selectByValue = (attrName, value) => {
        // Obsoleto pero mantenido por compatibilidad si se llama, 
        // aunque ahora preferimos toggleQuickFilter
        const next = new Set();
        generatedPreview.forEach((v, idx) => {
            if (v.config[attrName] === value) next.add(idx);
        });
        setSelection(next);
    };

    const applyBulk = (field, value) => {
        const next = [...generatedPreview];
        selection.forEach(idx => {
            next[idx][field] = value;
        });
        setGeneratedPreview(next);
    };

    const renderStep3 = () => {
        const selectionCount = selection.size;
        
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', position: 'relative' }}>
                {/* 1. SELECTION HELPERS */}
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <Search size={16} color="#64748b" />
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#1e1b4b' }}>Acciones Rápidas de Selección</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        <button 
                            type="button"
                            onClick={() => setSelection(new Set(generatedPreview.map((_, i) => i)))}
                            style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                        >
                            Seleccionar Todo
                        </button>
                        <button 
                            type="button"
                            onClick={() => {
                                setSelection(new Set());
                                setActiveFilters({});
                            }}
                            style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                        >
                            Limpiar Selección
                        </button>
                        
                        {selectedAttrs.map(attr => (
                            <div key={attr.id} style={{ display: 'flex', gap: '4px', alignItems: 'center', padding: '4px', background: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                <span style={{ fontSize: '10px', fontWeight: '900', color: '#94a3b8', padding: '0 8px', textTransform: 'uppercase' }}>{attr.name}:</span>
                                {attr.values.map(val => {
                                    const isActive = activeFilters[attr.name]?.has(val);
                                    return (
                                        <button 
                                            key={val}
                                            type="button"
                                            onClick={() => toggleQuickFilter(attr.name, val)}
                                            style={{ 
                                                padding: '4px 12px', 
                                                borderRadius: '8px', 
                                                border: isActive ? '1px solid #8f0653' : '1px solid transparent', 
                                                background: isActive ? '#8f0653' : '#f1f5f9', 
                                                color: isActive ? '#fff' : '#1e1b4b',
                                                fontSize: '11px', 
                                                fontWeight: '800', 
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
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
                    <div style={{ 
                        background: '#1e1b4b', color: '#fff', padding: '16px 32px', borderRadius: '24px',
                        display: 'flex', alignItems: 'center', gap: '24px', boxShadow: '0 20px 40px rgba(30,27,75,0.2)',
                        animation: 'slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        marginBottom: '24px'
                    }}>
                        <div style={{ borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '20px' }}>
                            <span style={{ fontSize: '14px', fontWeight: '900', color: '#8f0653' }}>{selectionCount}</span>
                            <span style={{ fontSize: '11px', fontWeight: '700', marginLeft: '8px', color: 'rgba(255,255,255,0.6)' }}>SELECCIONADOS</span>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1 }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <Tag size={16} color="rgba(255,255,255,0.4)" />
                                <input 
                                    type="number" 
                                    placeholder="Precio lote"
                                    onBlur={(e) => { if(e.target.value) applyBulk('price', parseFloat(e.target.value)); }}
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '12px', fontSize: '12px', width: '120px', outline: 'none' }} 
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <Box size={16} color="rgba(255,255,255,0.4)" />
                                <input 
                                    type="number" 
                                    placeholder="Stock lote"
                                    onBlur={(e) => { if(e.target.value) applyBulk('stock', parseInt(e.target.value)); }}
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px 14px', borderRadius: '12px', fontSize: '12px', width: '120px', outline: 'none' }} 
                                />
                            </div>
                            <button 
                                type="button"
                                onClick={() => setShowGlobalGallery(true)}
                                style={{ 
                                    background: '#8f0653', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '14px', 
                                    fontSize: '12px', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px',
                                    marginLeft: 'auto', transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                            >
                                <ImageIcon size={16} /> Asignar Fotos al Lote
                            </button>
                        </div>
                    </div>
                )}

                {/* 2. MAIN TABLE */}
                <div style={{ flex: 1, overflow: 'auto', background: '#fff', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10, borderBottom: '2px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '16px', textAlign: 'left', width: '40px' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={selection.size === generatedPreview.length && generatedPreview.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelection(new Set(generatedPreview.map((_, i) => i)));
                                            else setSelection(new Set());
                                        }}
                                    />
                                </th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '900', color: '#64748b' }}>IDENTIFICADOR (SKU)</th>
                                {selectedAttrs.map(attr => (
                                    <th key={attr.id} style={{ padding: '16px', textAlign: 'left', fontWeight: '900', color: '#64748b' }}>{attr.name.toUpperCase()}</th>
                                ))}
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '900', color: '#64748b' }}>FOTOS</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '900', color: '#64748b', width: '100px' }}>PRECIO $</th>
                                <th style={{ padding: '16px', textAlign: 'left', fontWeight: '900', color: '#64748b', width: '80px' }}>STOCK</th>
                            </tr>
                        </thead>
                        <tbody>
                            {generatedPreview.map((row, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: selection.has(idx) ? '#fdf2f8' : '#fff', transition: 'all 0.1s' }}>
                                    <td style={{ padding: '16px' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={selection.has(idx)}
                                            onChange={() => toggleSelect(idx)}
                                        />
                                    </td>
                                    <td style={{ padding: '16px', fontWeight: '800', color: '#1e1b4b' }}>{row.sku}</td>
                                    {selectedAttrs.map(attr => (
                                        <td key={attr.id} style={{ padding: '16px' }}>
                                            <span style={{ padding: '4px 8px', background: '#f1f5f9', borderRadius: '6px', fontWeight: '700', fontSize: '11px' }}>
                                                {row.config[attr.name]}
                                            </span>
                                        </td>
                                    ))}
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {row.image_urls?.map((url, iIdx) => (
                                                <div key={iIdx} style={{ width: '24px', height: '24px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                                    <img src={`http://localhost:8000${url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                </div>
                                            ))}
                                            {(row.image_urls?.length === 0) && <div style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px dashed #cbd5e1', background: '#f8fafc' }} />}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <input 
                                            type="number" 
                                            value={row.price}
                                            onChange={(e) => {
                                                const next = [...generatedPreview];
                                                next[idx].price = parseFloat(e.target.value);
                                                setGeneratedPreview(next);
                                            }}
                                            style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: '900', color: '#16a34a' }}
                                        />
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <input 
                                            type="number" 
                                            value={row.stock}
                                            onChange={(e) => {
                                                const next = [...generatedPreview];
                                                next[idx].stock = parseInt(e.target.value);
                                                setGeneratedPreview(next);
                                            }}
                                            style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #e2e8f0', fontWeight: '900', textAlign: 'center' }}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>


                {/* 4. OVERLAYS */}
                {showGlobalGallery && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
                        <div style={{ width: '100%', maxWidth: '900px', height: '80vh', background: '#fff', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <h3 style={{ margin: 0, fontWeight: '900' }}>Asignar Fotos a la Selección</h3>
                                <button type="button" onClick={() => setShowGlobalGallery(false)} style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer' }}>✕</button>
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto' }}>
                                <MediaGallery 
                                    selectionMode 
                                    allowMultiple={true}
                                    onSelect={(data) => {
                                        const urls = Array.isArray(data) ? data : [data];
                                        const next = [...generatedPreview];
                                        
                                        selection.forEach(idx => {
                                            const current = next[idx].image_urls || [];
                                            // Mecla sin duplicados
                                            const combined = [...new Set([...current, ...urls])];
                                            next[idx].image_urls = combined;
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(16px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ width: '100%', maxWidth: step === 3 ? '1200px' : '750px', background: '#fff', borderRadius: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid #f1f5f9', overflow: 'hidden', transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ padding: '4px 10px', background: '#fdf2f8', borderRadius: '6px', fontSize: '11px', color: '#8f0653', fontWeight: '900' }}>PASO {step} DE 3</div>
                            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '900', color: '#1e1b4b' }}>
                                {step === 1 && "Características Base"}
                                {step === 2 && "Selección de Rangos"}
                                {step === 3 && "Workspace de Transformación"}
                            </h3>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} style={{ width: '40px', height: '40px', background: '#f8fafc', border: 'none', borderRadius: '50%', color: '#94a3b8', cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ padding: '0 40px 40px', minHeight: '400px', maxHeight: '72vh', overflowY: 'auto' }}>
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                </div>

                {/* MODAL FOOTER ESTANDARIZADO (Cimentado) */}
                <div style={{ padding: '24px 40px', background: '#fff', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center' }}>
                    {step === 1 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div style={{ width: '48px', height: '48px', background: '#fdf2f8', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8f0653' }}>
                                    <List size={20} />
                                </div>
                                <div>
                                    <span style={{ display: 'block', fontSize: '11px', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase' }}>Ficha de Versión</span>
                                    <span style={{ display: 'block', fontSize: '15px', color: '#1e1b4b', fontWeight: '900' }}>
                                        {selectedAttrs.length} {selectedAttrs.length === 1 ? 'característica' : 'características'}
                                    </span>
                                </div>
                            </div>
                            <Button 
                                variant="primary" 
                                disabled={selectedAttrs.length === 0}
                                onClick={() => setStep(2)}
                                style={{ padding: '0 40px', height: '56px', borderRadius: '18px', boxShadow: '0 10px 15px -3px rgba(143, 6, 83, 0.2)' }}
                            >
                                Siguiente <ChevronRight size={18} style={{ marginLeft: '4px' }} />
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
                            <Button variant="outline" onClick={() => setStep(1)} style={{ flex: 1, height: '56px', borderRadius: '18px' }}>Atrás</Button>
                            <Button 
                                variant="primary" 
                                onClick={async () => {
                                    const payload = {
                                        product_name: baseSlug.replace('pr-', '').replace(/_/g, ' '),
                                        category_id: categoryId,
                                        attributes: selectedAttrs.map(a => ({ 
                                            name: formatChar(a.name), 
                                            values: a.values.map(v => formatOpt(v)) 
                                        }))
                                    };
                                    try {
                                        const res = await fetch('http://localhost:8000/api/v1/admin/catalog/generate-variants', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(payload)
                                        });
                                        if (res.ok) {
                                            const data = await res.json();
                                            setGeneratedPreview(data.map(v => ({ ...v, images: [], image_urls: [] })));
                                            setStep(3);
                                        }
                                    } catch (err) { console.error(err); }
                                }} 
                                disabled={selectedAttrs.some(a => !a.values || a.values.length === 0)} 
                                style={{ flex: 2, height: '56px', borderRadius: '18px', background: '#8f0653', boxShadow: '0 10px 15px -3px rgba(143, 6, 83, 0.2)' }}
                            >
                                Generar Espacio de Trabajo <ChevronRight size={18} />
                            </Button>
                        </div>
                    )}

                    {step === 3 && (
                        <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
                            <Button variant="outline" onClick={() => setStep(2)} style={{ flex: 1, height: '56px', borderRadius: '18px' }}>Atrás</Button>
                            <Button 
                                variant="primary" 
                                onClick={() => {
                                    onConfirm(generatedPreview);
                                    onClose();
                                }}
                                style={{ flex: 2, height: '56px', borderRadius: '18px', background: '#8f0653', boxShadow: '0 10px 15px -3px rgba(143, 6, 83, 0.2)' }}
                            > 
                                Confirmar y Crear {generatedPreview.length} Versiones <Check size={20} style={{ marginLeft: '10px' }} />
                            </Button>
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
