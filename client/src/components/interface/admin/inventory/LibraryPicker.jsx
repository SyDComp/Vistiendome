import React, { useState, useEffect } from 'react';
import { X, Search, Check, Folder, ChevronRight, Hash, Layers, List, Package, Tag, Box, Palette, Sparkles } from 'lucide-react';
import Button from '../../../ui/Button';

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

    const isExplorer = !!onItemClick && !internalSelectMode; // Si estamos en internalSelectMode, NO somos explorer

    // Sincronizar selección inicial cada vez que se abre
    useEffect(() => {
        if (isOpen) {
            // Normalizamos a Strings para evitar fallos de comparación (Number vs String)
            setSelectedIds((initialSelectedIds || []).map(id => String(id)));
        }
    }, [isOpen, initialSelectedIds]);

    if (!isOpen) return null;

    const filtered = items.filter(a => {
        const name = typeof a === 'string' ? a : (a.name || a.value || '');
        const parentName = typeof a === 'object' ? (a.parent_name || '') : '';
        return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
               parentName.toLowerCase().includes(searchTerm.toLowerCase());
    });

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
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
                    {item.domain.slice(0, 4).map((d, i) => (
                        <span key={i} style={{ padding: '4px 8px', background: '#f8fafc', borderRadius: '6px', fontSize: '11px', color: '#64748b', border: '1px solid #f1f5f9' }}>
                            {d.value}
                        </span>
                    ))}
                    {item.domain.length > 4 && <span style={{ fontSize: '11px', color: '#94a3b8' }}>+{item.domain.length - 4} más</span>}
                </div>
            );
        }
        if (type === 'products') {
            return (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Folder size={12} color="#94a3b8" />
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>{item.category}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Box size={12} color="#94a3b8" />
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{item.stock_total || 0} unidades totales</span>
                    </div>
                </div>
            );
        }
        if (type === 'variants') {
            const variantImage = item.image || item.fullData?.images?.find(img => img.is_main)?.url;
            return (
                <div style={{ marginTop: '12px', display: 'flex', gap: '16px' }}>
                    {variantImage && (
                        <div style={{ width: '64px', height: '64px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #f1f5f9', flexShrink: 0 }}>
                            <img src={`http://localhost:8000${variantImage}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            {Object.entries(item.config || {}).map(([k, v]) => (
                                <span key={k} style={{ padding: '2px 6px', background: '#fdf2f8', color: '#8f0653', borderRadius: '4px', fontSize: '10px', fontWeight: '700' }}>{v}</span>
                            ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Tag size={12} color="#16a34a" />
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#16a34a' }}>${item.price?.toLocaleString()}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Box size={12} color="#94a3b8" />
                                <span style={{ fontSize: '12px', color: '#64748b' }}>{item.stock} un.</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
        if (type === 'options') {
            const hex = typeof item === 'object' ? item.hex_code : null;
            return (
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {hex ? (
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: hex, border: '2px solid #fff', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }} />
                    ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                            <Sparkles size={16} />
                        </div>
                    )}
                    {hex && <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace', fontWeight: '700' }}>{hex.toUpperCase()}</span>}
                </div>
            );
        }
        return item.description ? <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>{item.description}</p> : null;
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(16px)',
            zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px',
            animation: 'pickerFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            <div style={{
                width: '100%', maxWidth: '1040px', height: '85vh',
                background: '#fff', borderRadius: '32px', display: 'flex',
                flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                overflow: 'hidden', border: '1px solid #f1f5f9'
            }}>
                {/* HEADER */}
                <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                        <div style={{ width: '56px', height: '56px', background: '#fdf2f8', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8f0653' }}>
                             {getIcon(type)}
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#1e1b4b' }}>{title}</h2>
                            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px', fontWeight: '500' }}>{description}</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {enableSelectionMode && (
                            <button 
                                type="button"
                                onClick={() => {
                                    setInternalSelectMode(!internalSelectMode);
                                    setSelectedIds([]); // Limpiamos al cambiar de modo para evitar confusiones
                                }}
                                style={{ 
                                    padding: '10px 20px', 
                                    borderRadius: '14px', 
                                    border: '2px solid',
                                    borderColor: internalSelectMode ? '#8f0653' : '#e2e8f0',
                                    background: internalSelectMode ? '#fdf2f8' : 'transparent',
                                    color: internalSelectMode ? '#8f0653' : '#64748b',
                                    fontSize: '12px',
                                    fontWeight: '800',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}
                            >
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: internalSelectMode ? '#8f0653' : '#cbd5e1' }} />
                                {internalSelectMode ? 'DESACTIVAR SELECCIÓN' : 'ACTIVAR SELECCIÓN'}
                            </button>
                        )}
                        <button 
                            type="button"
                            onClick={onClose}
                            style={{ width: '44px', height: '44px', borderRadius: '50%', border: 'none', background: '#f8fafc', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* SEARCH & ACTIONS */}
                <div style={{ padding: '24px 40px', background: '#fff', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ position: 'relative', marginBottom: !isExplorer ? '16px' : '0' }}>
                        <Search style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={20} />
                        <input 
                            type="text" 
                            placeholder={`Buscar por nombre o descripción...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ 
                                width: '100%', padding: '18px 20px 18px 56px', 
                                borderRadius: '20px', border: '2px solid #f1f5f9', 
                                fontSize: '16px', outline: 'none', transition: 'all 0.2s', 
                                background: '#f8fafc', boxSizing: 'border-box'
                            }}
                        />
                    </div>

                    {!isExplorer && allowMultiple && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <div style={{ padding: '6px 12px', background: '#f1f5f9', borderRadius: '10px', fontSize: '11px', fontWeight: '800', color: '#64748b' }}>
                                    {filtered.length} DE {items.length} {labelPlural.toUpperCase()}
                                </div>
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm('')}
                                        style={{ border: 'none', background: 'none', color: '#8f0653', fontSize: '11px', fontWeight: '800', cursor: 'pointer', padding: '0 8px' }}
                                    >
                                        LIMPIAR BÚSQUEDA
                                    </button>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        const filteredIds = filtered.map(i => getItemId(i));
                                        setSelectedIds([...new Set([...selectedIds, ...filteredIds])]);
                                    }}
                                    style={{ background: 'none', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '800', color: '#1e1b4b', cursor: 'pointer' }}
                                >
                                    Seleccionar Todo
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setSelectedIds([])}
                                    style={{ background: 'none', border: '1px solid #e2e8f0', padding: '8px 16px', borderRadius: '12px', fontSize: '12px', fontWeight: '800', color: '#8f0653', cursor: 'pointer' }}
                                >
                                    Limpiar Todo
                                </button>
                            </div>
                        </div>
                    )}
                    {!isExplorer && !allowMultiple && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <div style={{ padding: '6px 12px', background: '#f1f5f9', borderRadius: '10px', fontSize: '11px', fontWeight: '800', color: '#64748b' }}>
                                    {filtered.length} DE {items.length} {labelPlural.toUpperCase()}
                            </div>
                        </div>
                    )}
                </div>

                {/* CONTENT */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
                    {filtered.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                            {filtered.map((item, i) => {
                                    const idOrVal = getItemId(item);
                                    const isSelected = selectedIds.includes(idOrVal);
                                    return (
                                        <div 
                                            key={idOrVal || i}
                                            onClick={() => {
                                                if (isExplorer) onItemClick(item);
                                                else toggleSelect(idOrVal);
                                            }}
                                        style={{
                                            padding: '24px', borderRadius: '24px', border: '2px solid',
                                            borderColor: (!isExplorer && isSelected) ? '#8f0653' : '#f1f5f9',
                                            background: '#fff',
                                            cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            transform: (!isExplorer && isSelected) ? 'scale(1.02)' : 'none',
                                            boxShadow: (!isExplorer && isSelected) ? '0 12px 30px -10px rgba(143, 6, 83, 0.15)' : 'none',
                                            position: 'relative'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                            <div style={{ width: '36px', height: '36px', background: (!isExplorer && isSelected) ? '#8f0653' : '#f8fafc', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: (!isExplorer && isSelected) ? '#fff' : '#64748b' }}>
                                                {getIcon(type)}
                                            </div>
                                            {!isExplorer && isSelected && (
                                                <div style={{ width: '24px', height: '24px', background: '#8f0653', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                                                    <Check size={14} strokeWidth={4} />
                                                </div>
                                            )}
                                        </div>
                                        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '800', color: '#1e1b4b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {typeof item === 'string' ? item : (item.name || item.value || '---')}
                                        </h3>
                                        {getPreview(item)}
                                        
                                        {/* Overlay de Selección Visual */}
                                        {!isExplorer && (
                                            <div style={{ 
                                                position: 'absolute', inset: 0, borderRadius: '24px',
                                                border: isSelected ? '3px solid #8f0653' : 'none',
                                                pointerEvents: 'none'
                                            }} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '100px 0' }}>
                            <div style={{ width: '80px', height: '80px', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                <Search size={32} color="#cbd5e1" />
                            </div>
                            <h3 style={{ margin: 0, color: '#1e1b4b', fontSize: '18px', fontWeight: '700' }}>Sin resultados</h3>
                            <p style={{ color: '#94a3b8', fontSize: '15px' }}>{emptyMessage}</p>
                        </div>
                    )}
                </div>

                {/* FOOTER - Solo se muestra si NO estamos en modo exploración */}
                {!isExplorer && (
                    <div style={{ padding: '24px 40px', borderTop: '1px solid #f1f5f9', background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: selectedIds.length > 0 ? '#8f0653' : '#e2e8f0' }}></div>
                            <span style={{ fontSize: '15px', fontWeight: '700', color: '#1e1b4b' }}>
                                {selectedIds.length === 0 ? 'Nada seleccionado' : `${selectedIds.length} ${selectedIds.length === 1 ? labelSingular : labelPlural} seleccionados`}
                            </span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
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
            <style>{`
                @keyframes pickerFadeIn {
                    from { opacity: 0; transform: scale(0.98) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default LibraryPicker;
