import { useState, useEffect, useRef, useMemo } from 'react';
import { Filter } from 'lucide-react';
import FilterDrawer from './FilterDrawer';
import './FilterBar.css';

const FilterBar = ({
    categories,
    selectedCategory,
    setSelectedCategory,
    filtersMetadata,
    activeFilters,
    setFilters,
}) => {
    const [scrolledDown, setScrolledDown] = useState(false);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const lastScrollY = useRef(0);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (activeFilters.category) count++;
        if (activeFilters.specs) {
            Object.values(activeFilters.specs).forEach(vals => count += vals.length);
        }
        return count;
    }, [activeFilters]);

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
                </div>
            </aside>

            <FilterDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                metadata={filtersMetadata}
                activeFilters={activeFilters}
                onApply={setFilters}
                onClear={handleClearAll}
            />
        </>
    );
};

export default FilterBar;
