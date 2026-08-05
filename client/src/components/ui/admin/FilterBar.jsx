import React, { useState, useCallback, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

/**
 * FilterBar — Barra de búsqueda y filtros desplegables.
 * Optimizado para ser responsivo.
 */
const FilterBar = ({
    searchPlaceholder = 'Buscar...',
    onSearchChange,
    activeFilters = {},
    filters = [],
    onFilterChange,
    initialSearchValue = ''
}) => {
    const [searchValue, setSearchValue] = useState(initialSearchValue);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

    useEffect(() => {
        setSearchValue(initialSearchValue);
    }, [initialSearchValue]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleSearch = useCallback((e) => {
        const val = e.target.value;
        setSearchValue(val);
        onSearchChange?.(val);
    }, [onSearchChange]);

    const handleFilterSelect = useCallback((key, value) => {
        const updated = { ...activeFilters, [key]: value };
        if (!value) delete updated[key];
        onFilterChange?.(updated);
    }, [activeFilters, onFilterChange]);

    const clearAll = () => {
        setSearchValue('');
        onSearchChange?.('');
        onFilterChange?.({});
    };

    const hasActiveFilters = searchValue || Object.keys(activeFilters).length > 0;

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '8px' : '10px',
            marginBottom: '16px',
            flex: '0 0 auto',
            flexWrap: 'wrap',
            flexDirection: isMobile ? 'column' : 'row'
        }}>
            {/* Barra de búsqueda */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flex: isMobile ? '0 0 auto' : '1 1 240px',
                minWidth: '200px',
                width: isMobile ? '100%' : 'auto',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '0 14px',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
            }}
                onFocusCapture={e => e.currentTarget.style.borderColor = '#8f0653'}
                onBlurCapture={e => e.currentTarget.style.borderColor = '#e2e8f0'}
            >
                <Search size={15} color="#94a3b8" />
                <input
                    value={searchValue}
                    onChange={handleSearch}
                    placeholder={searchPlaceholder}
                    style={{
                        flex: 1,
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        padding: '9px 0',
                        fontSize: '13.5px',
                        color: '#1e293b'
                    }}
                />
                {searchValue && (
                    <button onClick={() => { setSearchValue(''); onSearchChange?.(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                        <X size={14} color="#94a3b8" />
                    </button>
                )}
            </div>

            {/* Contenedor de Filtros (para que se apilen mejor en móvil) */}
            <div style={{ 
                display: 'flex', 
                gap: '8px', 
                flexWrap: 'wrap', 
                width: isMobile ? '100%' : 'auto',
                flexDirection: isMobile ? 'column' : 'row'
            }}>
                {filters.map(filter => (
                    <div key={filter.key} style={{ 
                        position: 'relative', 
                        width: isMobile ? '100%' : 'auto',
                        minWidth: isMobile ? '100%' : '150px' 
                    }}>
                        <select
                            value={activeFilters[filter.key] || ''}
                            onChange={e => handleFilterSelect(filter.key, e.target.value)}
                            style={{
                                appearance: 'none',
                                backgroundColor: activeFilters[filter.key] ? '#fdf2f8' : '#f8fafc',
                                border: `1px solid ${activeFilters[filter.key] ? '#8f0653' : '#e2e8f0'}`,
                                borderRadius: '10px',
                                padding: '9px 36px 9px 14px',
                                fontSize: '13.5px',
                                color: activeFilters[filter.key] ? '#8f0653' : '#64748b',
                                fontWeight: activeFilters[filter.key] ? '600' : '400',
                                cursor: 'pointer',
                                outline: 'none',
                                transition: 'all 0.2s ease',
                                width: '100%',
                                boxSizing: 'border-box'
                            }}
                        >
                            <option value="">{filter.label}</option>
                            {filter.options.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <ChevronDown size={13} color={activeFilters[filter.key] ? '#8f0653' : '#94a3b8'} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    </div>
                ))}

                {/* Limpiar filtros */}
                {hasActiveFilters && (
                    <button
                        onClick={clearAll}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            backgroundColor: 'transparent',
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            padding: '9px 14px',
                            fontSize: '13px',
                            color: '#64748b',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            width: isMobile ? '100%' : 'auto'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
                    >
                        <X size={13} />
                        Limpiar todo
                    </button>
                )}
            </div>
        </div>
    );
};

export default FilterBar;
