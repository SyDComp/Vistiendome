import React, { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, RotateCcw, Check } from 'lucide-react';
import Button from '../../ui/Button';

const FilterDrawer = ({ 
    isOpen, 
    onClose, 
    metadata, 
    activeFilters, 
    onApply, 
    onClear 
}) => {
    const [localFilters, setLocalFilters] = useState(activeFilters);
    const [expandedSections, setExpandedSections] = useState({
        categories: true,
        price: true
    });

    useEffect(() => {
        if (isOpen) {
            setLocalFilters(activeFilters);
        }
    }, [isOpen, activeFilters]);

    if (!isOpen) return null;

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleSpecToggle = (key, value) => {
        setLocalFilters(prev => {
            const current = prev.specs?.[key] || [];
            const next = current.includes(value)
                ? current.filter(v => v !== value)
                : [...current, value];
            
            return {
                ...prev,
                specs: {
                    ...prev.specs,
                    [key]: next
                }
            };
        });
    };

    const handleCategorySelect = (slug) => {
        setLocalFilters(prev => ({
            ...prev,
            category: prev.category === slug ? null : slug
        }));
    };

    const isSpecSelected = (key, value) => localFilters.specs?.[key]?.includes(value);

    return (
        <>
            {/* Backdrop */}
            <div 
                style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
                    backdropFilter: 'blur(4px)', zIndex: 1000,
                    animation: 'fadeIn 0.3s ease-out'
                }}
                onClick={onClose}
            />

            {/* Drawer */}
            <div style={{
                position: 'fixed', top: 0, right: 0, bottom: 0,
                width: '100%', maxWidth: '400px', background: '#fff',
                boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', zIndex: 1001,
                display: 'flex', flexDirection: 'column',
                animation: 'slideInRight 0.3s ease-out'
            }}>
                {/* Header */}
                <div style={{ 
                    padding: '20px', borderBottom: '1px solid #f1f5f9',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#1e1b4b' }}>
                        Filtros
                    </h2>
                    <button 
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                    
                    {/* Sección Categorías */}
                    <div style={{ marginBottom: '24px' }}>
                        <button 
                            onClick={() => toggleSection('categories')}
                            style={{ 
                                width: '100%', display: 'flex', justifyContent: 'space-between', 
                                padding: '12px 0', border: 'none', background: 'none', 
                                cursor: 'pointer', borderBottom: '1px solid #f8fafc' 
                            }}
                        >
                            <span style={{ fontWeight: '800', fontSize: '14px', color: '#1e1b4b', textTransform: 'uppercase' }}>Categoría</span>
                            {expandedSections.categories ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        {expandedSections.categories && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                                {metadata.categories?.map(cat => (
                                    <button
                                        key={cat.id}
                                        onClick={() => handleCategorySelect(cat.slug)}
                                        style={{
                                            padding: '8px 16px', borderRadius: '12px', fontSize: '13px',
                                            fontWeight: '700', border: '1px solid',
                                            borderColor: localFilters.category === cat.slug ? '#8f0653' : '#e2e8f0',
                                            background: localFilters.category === cat.slug ? '#8f0653' : '#fff',
                                            color: localFilters.category === cat.slug ? '#fff' : '#64748b',
                                            cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Atributos Dinámicos (Color, Material, etc.) */}
                    {Object.entries(metadata.attributes || {}).map(([key, values]) => (
                        <div key={key} style={{ marginBottom: '24px' }}>
                            <button 
                                onClick={() => toggleSection(key)}
                                style={{ 
                                    width: '100%', display: 'flex', justifyContent: 'space-between', 
                                    padding: '12px 0', border: 'none', background: 'none', 
                                    cursor: 'pointer', borderBottom: '1px solid #f8fafc' 
                                }}
                            >
                                <span style={{ fontWeight: '800', fontSize: '14px', color: '#1e1b4b', textTransform: 'uppercase' }}>{key}</span>
                                {expandedSections[key] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                            {expandedSections[key] && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
                                    {values.map(val => (
                                        <button
                                            key={val}
                                            onClick={() => handleSpecToggle(key, val)}
                                            style={{
                                                padding: '8px 16px', borderRadius: '12px', fontSize: '13px',
                                                fontWeight: '700', border: '1px solid',
                                                borderColor: isSpecSelected(key, val) ? '#8f0653' : '#e2e8f0',
                                                background: isSpecSelected(key, val) ? '#fdf2f8' : '#fff',
                                                color: isSpecSelected(key, val) ? '#8f0653' : '#64748b',
                                                cursor: 'pointer', transition: 'all 0.2s',
                                                display: 'flex', alignItems: 'center', gap: '6px'
                                            }}
                                        >
                                            {isSpecSelected(key, val) && <Check size={14} />}
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Precio (Placeholder por ahora) */}
                    <div style={{ marginBottom: '24px' }}>
                        <button 
                            onClick={() => toggleSection('price')}
                            style={{ 
                                width: '100%', display: 'flex', justifyContent: 'space-between', 
                                padding: '12px 0', border: 'none', background: 'none', 
                                cursor: 'pointer', borderBottom: '1px solid #f8fafc' 
                            }}
                        >
                            <span style={{ fontWeight: '800', fontSize: '14px', color: '#1e1b4b', textTransform: 'uppercase' }}>Rango de Precio</span>
                            {expandedSections.price ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        {expandedSections.price && (
                            <div style={{ marginTop: '16px', color: '#64748b', fontSize: '13px', fontWeight: '600' }}>
                                De ${metadata.price_range?.min?.toLocaleString()} a ${metadata.price_range?.max?.toLocaleString()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div style={{ 
                    padding: '20px', borderTop: '1px solid #f1f5f9',
                    display: 'flex', gap: '12px'
                }}>
                    <Button 
                        variant="outline" 
                        onClick={() => { onClear(); onClose(); }}
                        style={{ flex: 1, gap: '8px' }}
                    >
                        <RotateCcw size={16} /> Limpiar
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={() => { onApply(localFilters); onClose(); }}
                        style={{ flex: 2 }}
                    >
                        Aplicar Filtros
                    </Button>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
            `}</style>
        </>
    );
};

export default FilterDrawer;
