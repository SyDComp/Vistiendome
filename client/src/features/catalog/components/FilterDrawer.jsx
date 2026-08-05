import { useState, useEffect, Fragment } from 'react';
import { X, ChevronDown, ChevronUp, RotateCcw, Check } from 'lucide-react';
import Button from '../../../components/ui/Button';
import './FilterDrawer.css';

const FilterDrawer = ({
    isOpen,
    onClose,
    metadata,
    categoriesTree = [],
    activeFilters,
    onApply,
    onClear,
    hideSpecs = false,
}) => {
    const [localFilters, setLocalFilters] = useState(activeFilters);
    const [expandedSections, setExpandedSections] = useState({
        categories: true,
        price: true,
    });
    const [expandedCategories, setExpandedCategories] = useState({});

    const toggleCategoryAccordion = (id) => {
        setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }));
    };

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
                    [key]: next,
                },
            };
        });
    };

    const handleCategorySelect = (slug) => {
        setLocalFilters(prev => ({
            ...prev,
            category: prev.category === slug ? null : slug,
        }));
    };

    const handlePriceChange = (type, value) => {
        setLocalFilters(prev => ({
            ...prev,
            priceRange: {
                ...(prev.priceRange || {}),
                [type]: value === '' ? null : Number(value)
            }
        }));
    };

    const isSpecSelected = (key, value) => localFilters.specs?.[key]?.includes(value);

    const sortCategories = (cats) => {
        return [...cats].sort((a, b) => {
            const aHasChildren = a.children && a.children.length > 0;
            const bHasChildren = b.children && b.children.length > 0;
            
            if (aHasChildren && !bHasChildren) return -1;
            if (!aHasChildren && bHasChildren) return 1;
            
            return a.name.localeCompare(b.name);
        });
    };

    const renderCategoryNode = (cat, depth = 0) => {
        const categoryKey = cat.slug || cat.id || cat.name;
        const isSelected = localFilters.category === cat.slug;
        const hasChildren = cat.children && cat.children.length > 0;

        return (
            <div key={categoryKey} style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: `8px 0 8px ${depth * 16}px`,
                    borderBottom: depth === 0 ? '1px solid #f8fafc' : 'none',
                    marginTop: depth === 0 ? '8px' : '0'
                }}>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            if (hasChildren) {
                                toggleCategoryAccordion(categoryKey);
                            } else {
                                handleCategorySelect(cat.slug);
                            }
                        }}
                        style={{
                            flex: 1,
                            background: 'none',
                            border: 'none',
                            color: isSelected && !hasChildren ? '#8f0653' : '#1e1b4b',
                            fontWeight: isSelected && !hasChildren ? '800' : (depth === 0 ? '700' : '500'),
                            fontSize: depth === 0 ? '14px' : '13px',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'color 0.2s',
                            padding: '4px 0'
                        }}
                    >
                        {cat.name}
                    </button>
                    {hasChildren && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleCategoryAccordion(categoryKey);
                            }}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: isSelected ? '#8f0653' : '#1e1b4b',
                                transition: 'color 0.2s'
                            }}
                        >
                            {expandedCategories[categoryKey] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    )}
                </div>
                {hasChildren && expandedCategories[categoryKey] && (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            padding: `8px 0 8px ${(depth + 1) * 16}px`
                        }}>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleCategorySelect(cat.slug);
                                }}
                                style={{
                                    flex: 1,
                                    background: 'none',
                                    border: 'none',
                                    color: isSelected ? '#8f0653' : '#64748b',
                                    fontWeight: isSelected ? '800' : '500',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'color 0.2s',
                                    padding: '4px 0',
                                    fontStyle: 'italic'
                                }}
                            >
                                Ver todo {cat.name}
                            </button>
                        </div>
                        {sortCategories(cat.children).map(child => renderCategoryNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    // Fallback if categoriesTree is not ready
    const catsToRender = categoriesTree && categoriesTree.length > 0 
        ? categoriesTree 
        : (metadata.categories || []);

    return (
        <>
            <div
                className="filter-drawer-backdrop"
                onClick={onClose}
            />

            <div className="filter-drawer-container">
                <div className="filter-drawer-header">
                    <h2 className="filter-drawer-title">Filtros</h2>
                    <button
                        onClick={onClose}
                        className="filter-drawer-close"
                        type="button"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="filter-drawer-content">
                    {hideSpecs ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginBottom: '24px' }}>
                            {sortCategories(catsToRender).map(cat => renderCategoryNode(cat, 0))}
                        </div>
                    ) : (
                        <div className="filter-section">
                            <button
                                onClick={() => toggleSection('categories')}
                                className="filter-section-toggle"
                                type="button"
                            >
                                <span className="filter-section-title">Categoría</span>
                                {expandedSections['categories'] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                            {expandedSections['categories'] && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0', marginTop: '16px', marginBottom: '24px' }}>
                                    {sortCategories(catsToRender).map(cat => renderCategoryNode(cat, 0))}
                                </div>
                            )}
                        </div>
                    )}

                    {!hideSpecs && Object.entries(metadata.attributes || {}).map(([key, values]) => (
                        <div key={key} className="filter-section">
                            <button
                                onClick={() => toggleSection(key)}
                                className="filter-section-toggle"
                                type="button"
                            >
                                <span className="filter-section-title">{key}</span>
                                {expandedSections[key] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                            {expandedSections[key] && (
                                <div className="filter-options-grid">
                                    {values.map(val => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => handleSpecToggle(key, val)}
                                            className={`filter-option-btn ${isSpecSelected(key, val) ? 'active' : ''}`}
                                        >
                                            {isSpecSelected(key, val) && <Check size={14} />}
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}

                    <div className="filter-section">
                        <button
                            onClick={() => toggleSection('price')}
                            className="filter-section-toggle"
                            type="button"
                        >
                            <span className="filter-section-title">Rango de Precio</span>
                            {expandedSections.price ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        {expandedSections.price && (
                            <div className="filter-price-range" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '16px' }}>
                                <input 
                                    type="number" 
                                    placeholder={`Mín ($${metadata.price_range?.min?.toLocaleString()})`} 
                                    value={localFilters.priceRange?.min ?? ''}
                                    onChange={(e) => handlePriceChange('min', e.target.value)}
                                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                                />
                                <span>-</span>
                                <input 
                                    type="number" 
                                    placeholder={`Máx ($${metadata.price_range?.max?.toLocaleString()})`} 
                                    value={localFilters.priceRange?.max ?? ''}
                                    onChange={(e) => handlePriceChange('max', e.target.value)}
                                    style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="filter-drawer-footer">
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
        </>
    );
};

export default FilterDrawer;
