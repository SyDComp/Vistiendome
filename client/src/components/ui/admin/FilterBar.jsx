import React, { useState, useCallback, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import './FilterBar.css';

/**
 * La barra de busqueda y filtros de las listas del panel.
 *
 * Este componente ya no sabe cuan ancha es la pantalla ni de que color es
 * nada: antes preguntaba el ancho a JavaScript cinco veces para decidir si
 * apilar las cosas, y escribia en `element.style` desde los eventos de foco y
 * de raton para pintar bordes. Las dos cosas las hace ahora la hoja.
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

    useEffect(() => {
        setSearchValue(initialSearchValue);
    }, [initialSearchValue]);

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
        <div className="adm-filtros">
            <div className="adm-filtros-buscador">
                <Search size={15} className="adm-filtros-icono" />
                <input
                    value={searchValue}
                    onChange={handleSearch}
                    placeholder={searchPlaceholder}
                    className="adm-buscador-campo"
                />
                {searchValue && (
                    <button
                        onClick={() => { setSearchValue(''); onSearchChange?.(''); }}
                        className="adm-icono-plano"
                        aria-label="Borrar la búsqueda"
                    >
                        <X size={14} className="adm-filtros-icono" />
                    </button>
                )}
            </div>

            <div className="adm-filtros-grupo">
                {filters.map(filter => {
                    const activo = Boolean(activeFilters[filter.key]);
                    return (
                        <div key={filter.key} className="adm-filtro-caja">
                            <select
                                value={activeFilters[filter.key] || ''}
                                onChange={e => handleFilterSelect(filter.key, e.target.value)}
                                className={`adm-filtro${activo ? ' adm-filtro--activo' : ''}`}
                            >
                                <option value="">{filter.label}</option>
                                {filter.options.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={13} className="adm-icono-derecha adm-filtro-flecha" />
                        </div>
                    );
                })}

                {hasActiveFilters && (
                    <button onClick={clearAll} className="adm-filtros-limpiar">
                        <X size={13} />
                        Limpiar todo
                    </button>
                )}
            </div>
        </div>
    );
};

export default FilterBar;
