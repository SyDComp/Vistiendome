import React, { useState, useEffect, useCallback } from 'react';
import SectionHeader from '../../../ui/admin/SectionHeader';
import FilterBar from '../../../ui/admin/FilterBar';
import DataTable from '../../../ui/admin/DataTable';
import Pagination from '../../../ui/admin/Pagination';
import RowActions from '../../../ui/admin/RowActions';
import Button from '../../../ui/Button';
import { useNotification } from '../../../../context/NotificationContext';
import LibraryPicker from './LibraryPicker';
import DetailDrawer from '../../../ui/admin/DetailDrawer';
import { X, Layers, Plus, Shield } from 'lucide-react';

const API_BASE = `/api/v1/admin/catalog`;
const PAGE_SIZE = 20;

// Badge de categoría padre
const ParentCategoryBadge = ({ name }) => (
    name ? (
        <span className="category-parent-badge">
            {name}
        </span>
    ) : (
        <span className="category-root-text">— Raíz —</span>
    )
);

// Formulario inline para nueva/editar categoría
const CategoryForm = ({ editingCategory, categories, onSubmit, onCancel }) => {
    const [specifications, setSpecifications] = useState([]);
    const [formData, setFormData] = useState({
        name: editingCategory?.name || '',
        parent_id: editingCategory?.parent_id || '',
        is_filterable: editingCategory?.is_filterable !== undefined ? editingCategory.is_filterable : true,
        suggested_specification_ids: editingCategory?.suggested_specification_ids || []
    });
    const [showLibrary, setShowLibrary] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [detailData, setDetailData] = useState(null);

    useEffect(() => {
        fetch(`/api/v1/admin/catalog/specifications`)
            .then(r => r.json())
            .then(data => setSpecifications(data || []))
            .catch(console.error);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const addFromLibrary = (selected) => {
        setFormData(prev => ({
            ...prev,
            suggested_specification_ids: selected.map(s => s.id)
        }));
    };

    const removeSpec = (id) => {
        setFormData(prev => ({
            ...prev,
            suggested_specification_ids: prev.suggested_specification_ids.filter(i => i !== id)
        }));
    };

    // Ya no necesitamos inputStyle ni labelStyle pues usaremos las clases

    return (
        <div className="category-form-wrapper">
            <h3 className="category-form-title">
                {editingCategory ? `Editando: ${editingCategory.name}` : 'Nueva Categoría'}
            </h3>
            <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
                <div className="category-form-grid">
                    <div>
                        <label className="category-form-label">Nombre</label>
                        <input
                            type="text" name="name" value={formData.name}
                            onChange={handleChange} required className="category-form-input"
                            placeholder="Ej: Vestidos de Noche"
                        />
                    </div>
                    <div>
                        <label className="category-form-label">Categoría Padre</label>
                        <select
                            name="parent_id" value={formData.parent_id}
                            onChange={handleChange}
                            className="category-form-input"
                        >
                            <option value="">— Sin padre (Raíz) —</option>
                            {categories
                                .filter(c => c.id !== editingCategory?.id && c.slug !== 'sin_categoria')
                                .map(c => {
                                    const isSubcategory = c.level > 1;
                                    const indent = '\u00A0\u00A0\u00A0\u00A0'.repeat(Math.max(0, (c.level || 1) - 1));
                                    const prefix = isSubcategory ? '— ' : '';
                                    return (
                                        <option 
                                            key={c.id} 
                                            value={c.id} 
                                            style={!isSubcategory ? { fontWeight: '600', color: '#1e293b' } : {}}
                                        >
                                            {indent}{prefix}{c.name}
                                        </option>
                                    );
                                })
                            }
                        </select>
                    </div>
                </div>

                <div className="category-form-checkbox-wrapper">
                    <input 
                        type="checkbox" 
                        id="is_filterable"
                        name="is_filterable" 
                        checked={formData.is_filterable}
                        onChange={(e) => setFormData(p => ({ ...p, is_filterable: e.target.checked }))}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="is_filterable" className="category-form-checkbox-label">
                        Mostrar como filtro en el catálogo público
                    </label>
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <div className="category-spec-header">
                        <label className="category-form-label" style={{ marginBottom: 0 }}>Especificaciones Sugeridas</label>
                        <span className="category-spec-count">{formData.suggested_specification_ids.length} ACTIVAS</span>
                    </div>
                    
                    <div className="category-spec-list">
                        {specifications.filter(s => formData.suggested_specification_ids.includes(s.id)).map(spec => (
                            <div key={spec.id} className="category-spec-tag">
                                <Layers size={12} />
                                {spec.name}
                                <button type="button" onClick={() => removeSpec(spec.id)} className="category-spec-remove-btn">
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        {formData.suggested_specification_ids.length === 0 && (
                            <p className="category-spec-empty">No se han asignado especificaciones automáticas.</p>
                        )}
                    </div>

                    <button 
                        type="button" 
                        onClick={() => setShowLibrary(true)}
                        className="category-lib-btn"
                    >
                        <Plus size={16} /> Abrir Biblioteca de Especificaciones
                    </button>

                    <LibraryPicker 
                        isOpen={showLibrary}
                        onClose={() => setShowLibrary(false)}
                        items={specifications}
                        initialSelectedIds={formData.suggested_specification_ids}
                        onSelect={addFromLibrary}
                        title="Biblioteca de Especificaciones"
                        description="Elige los grupos de características que se sugerirán al crear productos en esta categoría."
                        type="specifications"
                        labelSingular="especificación"
                        labelPlural="especificaciones"
                    />
                </div>

                <div className="category-form-actions">
                    <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                    <Button type="submit" variant="primary">
                        {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

const CATEGORY_COLUMNS = [
    { 
        key: 'name', 
        label: 'Categoría', 
        render: (v, row) => {
            const isSystem = row.is_joker || row.slug === 'sin_categoria';
            return (
                <div className="cat-table-name-wrapper">
                    {isSystem ? (
                        <div 
                            title="Esta categoría es del núcleo del sistema y está protegida."
                            className="cat-table-shield"
                        >
                            <Shield size={14} />
                        </div>
                    ) : (
                        <div className="cat-table-dot"></div>
                    )}
                    <span className={`cat-table-name ${isSystem ? 'system' : 'normal'}`}>
                        {v}
                    </span>
                </div>
            );
        }
    },
    { 
        key: 'level', 
        label: 'Nivel', 
        width: '90px',
        align: 'center',
        render: (v, row) => {
            const isSystem = row.is_joker || row.slug === 'sin_categoria';
            if (isSystem) return <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '700' }}>—</span>;
            
            const levelClass = v === 1 ? 'l1' : v === 2 ? 'l2' : v === 3 ? 'l3' : 'other';
            const label = `Niv. ${v}`.toUpperCase();
            
            return (
                <div className={`cat-table-level-badge ${levelClass}`}>
                    {label}
                </div>
            );
        }
    },
    { 
        key: 'parent_name', 
        label: 'Categoría Padre', 
        render: (v, row) => {
            const isSystem = row.is_joker || row.slug === 'sin_categoria';
            if (isSystem) return <span style={{ color: '#cbd5e1', fontSize: '12px' }}>Protegido</span>;
            return <ParentCategoryBadge name={v} />;
        }
    },
    { 
        key: 'slug', 
        label: 'Slug / URL', 
        render: (v) => <code className="cat-table-slug">{v}</code> 
    },
    { 
        key: 'product_count', 
        label: 'Productos', 
        width: '120px', 
        align: 'center',
        render: (v) => <span className={`cat-table-count ${v > 0 ? 'positive' : 'zero'}`}>{v > 0 ? v : '—'}</span>
    },
    {
        key: 'is_filterable',
        label: 'Filtro',
        width: '100px',
        align: 'center',
        render: (v) => (
            <span className={`cat-table-filter-badge ${v ? 'active' : 'inactive'}`}>
                {v ? 'SÍ' : 'NO'}
            </span>
        )
    }
];

const CategoryManager = () => {
    const { toast, confirm } = useNotification();
    const [categories, setCategories] = useState([]);
    const [allCategoriesForFilter, setAllCategoriesForFilter] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    
    // Paginación y búsqueda
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [search, setSearch] = useState('');
    const [activeFilters, setActiveFilters] = useState({});

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page, page_size: PAGE_SIZE });
            if (search) params.append('search', search);
            if (activeFilters.parent_id) params.append('parent_id', activeFilters.parent_id);
            
            const res = await fetch(`${API_BASE}/categories?${params}`);
            const data = await res.json();
            setCategories(data.items || []);
            setTotalPages(data.total_pages || 1);
            setTotalItems(data.total || 0);
        } catch (err) {
            console.error('Error cargando categorías:', err);
        } finally {
            setLoading(false);
        }
    }, [page, search, activeFilters]);

    const fetchAllForFilter = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/categories?page_size=500`);
            const data = await res.json();
            setAllCategoriesForFilter(data.items || []);
        } catch (err) {
            console.error('Error cargando filtros:', err);
        }
    }, []);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);
    useEffect(() => { fetchAllForFilter(); }, [fetchAllForFilter]);

    const handleUpdate = async (formData) => {
        const isEditing = formData.id;
        const url = isEditing
            ? `${API_BASE}/categories/${formData.id}`
            : `${API_BASE}/categories`;

        const body = { ...formData };
        
        // Normalizar parent_id para el backend
        if (!body.parent_id || body.parent_id === '') {
            body.parent_id = null;
        } else {
            body.parent_id = parseInt(body.parent_id);
        }

        try {
            const res = await fetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                toast.success(isEditing ? 'Categoría actualizada' : 'Categoría creada con éxito');
                setIsDrawerOpen(false);
                fetchCategories();
                fetchAllForFilter();
            } else {
                const err = await res.json();
                toast.error(err.detail || 'Error al guardar categoría');
            }
        } catch (err) {
            console.error("Error al guardar:", err);
            toast.error("Ocurrió un error inesperado.");
        }
    };

    const handleDelete = async (category) => {
        if (!await confirm(`¿Eliminar la categoría "${category.name}"? Los productos se moverán a 'Sin Categoría'.`)) return;
        const res = await fetch(`${API_BASE}/categories/${category.id}`, { method: 'DELETE' });
        if (res.ok) {
            toast.success('Categoría eliminada con éxito');
            setIsDrawerOpen(false);
            fetchCategories();
            fetchAllForFilter();
        } else {
            const e = await res.json();
            toast.error(e.detail || 'Error al eliminar categoría');
        }
    };

    const handleOpenCategory = async (category = null, isEditing = true) => {
        if (!category) {
            setSelectedCategory({
                name: '',
                parent_id: null,
                is_filterable: true,
                suggested_specification_ids: [],
                suggested_specifications: [],
                is_editing: true // Creación siempre es edición
            });
            setIsDrawerOpen(true);
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/categories/${category.id}`);
            const fullData = await res.json();
            
            // Marcar como sistema si corresponde para que DetailDrawer proteja los botones
            const isSystem = fullData.is_joker || fullData.slug === 'sin_categoria';
            setSelectedCategory({ ...fullData, is_system: isSystem, is_editing: isEditing });
            
            setIsDrawerOpen(true);
        } catch (err) {
            console.error("Error cargando detalle:", err);
            toast.error("No se pudo cargar la categoría.");
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (val) => { setSearch(val); setPage(1); };
    const handleFilterChange = (filters) => { setActiveFilters(filters); setPage(1); };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <SectionHeader
                title="Gestión de Categorías"
                description={`${totalItems} categorías definidas`}
                action={{ label: '＋ Nueva Categoría', onClick: () => handleOpenCategory() }}
            />

            <FilterBar
                searchPlaceholder="Buscar categoría por nombre..."
                onSearchChange={handleSearchChange}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                filters={[
                    {
                        key: 'parent_id',
                        label: 'Filtrar por Padre',
                        options: allCategoriesForFilter
                            .filter(c => c.slug !== 'sin_categoria')
                            .map(c => ({ value: c.id, label: c.parent_name ? `${c.parent_name} › ${c.name}` : c.name }))
                    }
                ]}
            />

            <DataTable
                columns={CATEGORY_COLUMNS}
                data={categories}
                isLoading={loading}
                emptyMessage="No se encontraron categorías."
                onRowClick={handleOpenCategory}
                rowActions={(row) => {
                    const isSystem = row.is_joker || row.slug === 'sin_categoria';
                    if (isSystem) return null;

                    return (
                        <RowActions
                            onView={() => handleOpenCategory(row, false)}
                            onEdit={() => handleOpenCategory(row, true)}
                            onDelete={() => handleDelete(row)}
                        />
                    );
                }}
            />

            <Pagination
                currentPage={page}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
            />

            <DetailDrawer 
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                data={selectedCategory}
                type="category"
                title={selectedCategory?.id ? selectedCategory.name : 'Nueva Categoría'}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
            />
        </div>
    );
};

export default CategoryManager;
