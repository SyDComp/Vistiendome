import React, { useState, useEffect, useMemo } from 'react';
import './TableFilter.css';

/**
 * Reusable table filter component for admin tables
 * 
 * @param {Object} props
 * @param {string} props.searchPlaceholder - Placeholder for search input
 * @param {string[]} props.searchFields - Fields to search in (e.g., ['name', 'email'])
 * @param {Array} props.filters - Array of filter configurations
 * @param {Array} props.quickFilters - Quick filter buttons
 * @param {Array} props.data - Original data array to filter
 * @param {Function} props.onFilterChange - Callback with filtered data
 */
export default function TableFilter({
    searchPlaceholder = "Buscar...",
    searchFields = [],
    filters = [],
    quickFilters = [],
    data = [],
    onFilterChange,
    defaultQuickFilter = 'all'
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilters, setActiveFilters] = useState({});
    const [activeQuickFilter, setActiveQuickFilter] = useState(defaultQuickFilter);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            applyFilters();
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, activeFilters, activeQuickFilter, data]);

    // Apply all filters
    const applyFilters = () => {
        let filtered = [...data];

        // 1. Apply search
        if (searchTerm && searchFields.length > 0) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(item => {
                return searchFields.some(field => {
                    const value = getNestedValue(item, field);
                    return value && value.toString().toLowerCase().includes(term);
                });
            });
        }

        // 2. Apply dropdown filters
        Object.keys(activeFilters).forEach(key => {
            const value = activeFilters[key];
            if (value !== '' && value !== null && value !== undefined) {
                filtered = filtered.filter(item => {
                    const itemValue = getNestedValue(item, key);
                    return itemValue == value; // Use == for loose comparison
                });
            }
        });

        // 3. Apply quick filter
        if (activeQuickFilter !== 'all') {
            const quickFilter = quickFilters.find(qf => qf.key === activeQuickFilter);
            if (quickFilter && quickFilter.filter) {
                filtered = filtered.filter(quickFilter.filter);
            } else if (quickFilter && quickFilter.filterKey) {
                // Support for simple key-value quick filters
                filtered = filtered.filter(item =>
                    getNestedValue(item, quickFilter.filterKey) === quickFilter.filterValue
                );
            }
        }

        onFilterChange(filtered);
    };

    // Get nested object value (e.g., 'category.name')
    const getNestedValue = (obj, path) => {
        return path.split('.').reduce((curr, key) => curr?.[key], obj);
    };

    // Handle filter change
    const handleFilterChange = (key, value) => {
        setActiveFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };

    // Reset all filters
    const resetFilters = () => {
        setSearchTerm('');
        setActiveFilters({});
        setActiveQuickFilter(defaultQuickFilter);
    };

    // Check if any filters are active
    const hasActiveFilters = useMemo(() => {
        return searchTerm !== '' ||
            Object.values(activeFilters).some(v => v !== '' && v !== null) ||
            activeQuickFilter !== 'all';
    }, [searchTerm, activeFilters, activeQuickFilter]);

    return (
        <div className="table-filter">
            {/* Search Bar */}
            {searchFields.length > 0 && (
                <div className="filter-search">
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                    {searchTerm && (
                        <button
                            className="clear-search"
                            onClick={() => setSearchTerm('')}
                            title="Limpiar búsqueda"
                        >
                            ✕
                        </button>
                    )}
                </div>
            )}

            {/* Filter Row */}
            <div className="filter-row">
                {/* Quick Filters */}
                {quickFilters.length > 0 && (
                    <div className="quick-filters">
                        {quickFilters.map(qf => (
                            <button
                                key={qf.key}
                                className={`quick-filter-btn ${activeQuickFilter === qf.key ? 'active' : ''}`}
                                onClick={() => setActiveQuickFilter(qf.key)}
                            >
                                {qf.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Dropdown Filters */}
                {filters.length > 0 && (
                    <div className="dropdown-filters">
                        {filters.map(filter => (
                            <div key={filter.key} className="filter-group">
                                <label>{filter.label}</label>
                                <select
                                    value={activeFilters[filter.key] || ''}
                                    onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    {filter.options?.map((opt, index) => {
                                        const optValue = opt.value !== undefined ? opt.value : (opt.id !== undefined ? opt.id : index);
                                        return (
                                            <option key={String(optValue)} value={optValue}>
                                                {opt.label || opt.name}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                        ))}
                    </div>
                )}

                {/* Reset Button */}
                {hasActiveFilters && (
                    <button className="reset-filters-btn" onClick={resetFilters}>
                        Limpiar filtros
                    </button>
                )}
            </div>
        </div>
    );
}
