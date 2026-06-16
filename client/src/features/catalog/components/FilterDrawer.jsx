import { useState, useEffect } from 'react';
import { X, ChevronDown, ChevronUp, RotateCcw, Check } from 'lucide-react';
import Button from '../../../components/ui/Button';
import './FilterDrawer.css';

const FilterDrawer = ({
    isOpen,
    onClose,
    metadata,
    activeFilters,
    onApply,
    onClear,
}) => {
    const [localFilters, setLocalFilters] = useState(activeFilters);
    const [expandedSections, setExpandedSections] = useState({
        categories: true,
        price: true,
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

    const isSpecSelected = (key, value) => localFilters.specs?.[key]?.includes(value);

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
                    <div className="filter-section">
                        <button
                            onClick={() => toggleSection('categories')}
                            className="filter-section-toggle"
                            type="button"
                        >
                            <span className="filter-section-title">Categoría</span>
                            {expandedSections.categories ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </button>
                        {expandedSections.categories && (
                            <div className="filter-options-grid">
                                {metadata.categories?.map(cat => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => handleCategorySelect(cat.slug)}
                                        className={`filter-option-btn ${localFilters.category === cat.slug ? 'active-primary' : ''}`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {Object.entries(metadata.attributes || {}).map(([key, values]) => (
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
                            <div className="filter-price-range">
                                De ${metadata.price_range?.min?.toLocaleString()} a ${metadata.price_range?.max?.toLocaleString()}
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
