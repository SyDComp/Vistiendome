import { useState, useEffect, useRef, useMemo } from 'react';
import { Filter, X } from 'lucide-react';
import FilterDrawer from './FilterDrawer';
import './FilterBar.css';

const FilterBar = ({
    categories,
    selectedCategory,
    setSelectedCategory,
    filtersMetadata,
    activeFilters,
    setFilters,
    hideSpecs = false,
}) => {
    const [scrolledDown, setScrolledDown] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const lastScrollY = useRef(0);

    const activeFilterTags = useMemo(() => {
        const tags = [];
        
        if (activeFilters.category) {
            const catName = filtersMetadata?.categories?.find(c => c.slug === activeFilters.category)?.name;
            if (catName) {
                tags.push({ type: 'category', label: `Categoría: ${catName}`, value: activeFilters.category });
            } else {
                tags.push({ type: 'category', label: `Categoría: Seleccionada`, value: activeFilters.category });
            }
        }
        
        if (activeFilters.specs) {
            Object.entries(activeFilters.specs).forEach(([key, values]) => {
                values.forEach(val => {
                    tags.push({ type: 'spec', key, label: `${key}: ${val}`, value: val });
                });
            });
        }
        
        if (activeFilters.priceRange) {
            const { min, max } = activeFilters.priceRange;
            if (min !== null || max !== null) {
                let label = 'Precio: ';
                if (min && max) label += `$${min.toLocaleString()} - $${max.toLocaleString()}`;
                else if (min) label += `Desde $${min.toLocaleString()}`;
                else if (max) label += `Hasta $${max.toLocaleString()}`;
                tags.push({ type: 'price', label });
            }
        }
        
        return tags;
    }, [activeFilters, filtersMetadata]);

    const activeFiltersCount = activeFilterTags.length;

    const handleRemoveFilter = (tag) => {
        setFilters(prev => {
            const next = { ...prev };
            if (tag.type === 'category') {
                next.category = null;
                setSelectedCategory(null);
            } else if (tag.type === 'price') {
                next.priceRange = null;
            } else if (tag.type === 'spec') {
                next.specs = { ...prev.specs };
                next.specs[tag.key] = next.specs[tag.key].filter(v => v !== tag.value);
                if (next.specs[tag.key].length === 0) delete next.specs[tag.key];
            }
            return next;
        });
    };

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            if (currentScrollY > lastScrollY.current && currentScrollY > 150) {
                setScrolledDown(true);
            } else if (currentScrollY < lastScrollY.current) {
                setScrolledDown(false);
            }
            lastScrollY.current = currentScrollY;
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const handleClearAll = () => {
        setFilters({ category: null, specs: {}, priceRange: null });
        setSelectedCategory(null);
    };

    return (
        <>
            <aside>
                <div className="container">
                    <div className="filtros-container">
                        <button
                            type="button"
                            onClick={() => setIsDrawerOpen(true)}
                            className={`btn-open-filters ${activeFiltersCount > 0 ? 'active' : ''}`}
                        >
                            <Filter size={16} />
                            Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                        </button>

                        <div className="filtros-divider" />

                        <div className="filtros-chips-wrapper">
                            <button
                                type="button"
                                onClick={handleClearAll}
                                className={`filtro-chip ${!selectedCategory && activeFiltersCount === 0 ? 'active' : ''}`}
                            >
                                Todo
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedCategory(cat);
                                        setFilters(prev => ({ ...prev, category: cat.slug }));
                                    }}
                                    className={`filtro-chip ${selectedCategory?.id === cat.id ? 'active' : ''}`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {activeFilterTags.length > 0 && (
                        <div className="active-filters-container" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b' }}>Filtros activos:</span>
                            {activeFilterTags.map((tag, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleRemoveFilter(tag)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '4px',
                                        padding: '6px 12px', borderRadius: '16px',
                                        background: '#fdf2f8', border: '1px solid #fbcfe8',
                                        color: '#8f0653', fontSize: '12px', fontWeight: '700',
                                        cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    {tag.label}
                                    <X size={14} />
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={handleClearAll}
                                style={{
                                    fontSize: '12px', fontWeight: '600', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline'
                                }}
                            >
                                Limpiar todos
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            <FilterDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                metadata={filtersMetadata}
                categoriesTree={categories}
                activeFilters={activeFilters}
                onApply={setFilters}
                onClear={handleClearAll}
                hideSpecs={hideSpecs}
            />
        </>
    );
};

export default FilterBar;
