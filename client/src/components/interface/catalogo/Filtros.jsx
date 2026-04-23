import { useState, useEffect, useRef, useMemo } from 'react';
import { Filter, ArrowUpDown, ChevronLeft } from 'lucide-react';
import FilterDrawer from './FilterDrawer';

const Filtros = ({ 
    categorias, 
    categoriaSeleccionada, 
    setCategoriaSeleccionada, 
    filtersMetadata,
    activeFilters,
    setFilters
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
        setCategoriaSeleccionada(null);
    };

    return (
        <>
            <aside className={`catalogo-filtros ${scrolledDown ? 'scrolled-down' : ''}`} style={{
                position: 'sticky',
                top: '70px',
                zIndex: 1000,
                backgroundColor: 'rgba(255, 255, 255, 0.90)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid #f1f5f9',
                padding: '12px 0',
                width: '100%',
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: scrolledDown ? 'translateY(-100%)' : 'translateY(0)'
            }}>
                <div className="container">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        
                        <button 
                            onClick={() => setIsDrawerOpen(true)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: activeFiltersCount > 0 ? '#1e1b4b' : '#fff',
                                color: activeFiltersCount > 0 ? '#fff' : '#1e1b4b',
                                border: '1px solid #e2e8f0',
                                padding: '8px 16px', borderRadius: '12px',
                                fontSize: '13px', fontWeight: '800', cursor: 'pointer',
                                transition: 'all 0.2s', flexShrink: 0
                            }}
                        >
                            <Filter size={16} />
                            Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                        </button>

                        <div style={{ width: '1px', height: '24px', background: '#e2e8f0', margin: '0 4px' }} />

                        <div style={{ 
                            display: 'flex', gap: '8px', overflowX: 'auto', 
                            scrollbarWidth: 'none', flex: 1, padding: '4px 0' 
                        }}>
                            <button 
                                onClick={handleClearAll}
                                style={chipStyle(!categoriaSeleccionada && activeFiltersCount === 0)}
                            >
                                Todo
                            </button>
                            {categorias.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        setCategoriaSeleccionada(cat);
                                        setFilters(prev => ({ ...prev, category: cat.slug }));
                                    }}
                                    style={chipStyle(categoriaSeleccionada?.id === cat.id)}
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

            <style>{`
                .filtro-opciones-horizontal::-webkit-scrollbar { display: none; }
            `}</style>
        </>
    );
};

const chipStyle = (isActive) => ({
    flexShrink: 0,
    border: '1px solid ' + (isActive ? '#1e1b4b' : '#e2e8f0'),
    padding: '8px 18px',
    borderRadius: '50px',
    fontSize: '13px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: isActive ? '#1e1b4b' : '#fff',
    color: isActive ? '#fff' : '#475569',
});

const subChipStyle = (isActive) => ({
    flexShrink: 0,
    border: 'none',
    padding: '6px 14px',
    borderRadius: '10px',
    fontSize: '12px',
    fontWeight: isActive ? '900' : '600',
    cursor: 'pointer',
    backgroundColor: isActive ? '#fdf2f8' : 'transparent',
    color: isActive ? '#8f0653' : '#64748b',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s'
});

export default Filtros;
