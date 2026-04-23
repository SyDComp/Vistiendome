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
import { X, Layers, Plus } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api/v1/admin/catalog';
const PAGE_SIZE = 20;

// Badge de categoría padre
const ParentCategoryBadge = ({ name }) => (
    name ? (
        <span style={{
            padding: '3px 10px',
            background: '#f8fafc',
            color: '#64748b',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            border: '1px solid #e2e8f0'
        }}>
            {name}
        </span>
    ) : (
        <span style={{ color: '#cbd5e1', fontSize: '12px', fontStyle: 'italic' }}>— Raíz —</span>
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
        fetch('http://localhost:8000/api/v1/admin/catalog/specifications')
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

    const inputStyle = {
        width: '100%', padding: '10px 14px', borderRadius: '10px',
        border: '1px solid #e2e8f0', fontSize: '14px', color: '#1e293b',
        outline: 'none', transition: 'border-color 0.2s', backgroundColor: '#fff', boxSizing: 'border-box'
    };
    const labelStyle = { display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' };

    return (
        <div style={{
            backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px',
            padding: '24px', marginBottom: '20px', animation: 'fadeIn 0.2s ease'
        }}>
            <h3 style={{ margin: '0 0 20px', color: '#1e1b4b', fontSize: '16px', fontWeight: '700' }}>
                {editingCategory ? `Editando: ${editingCategory.name}` : 'Nueva Categoría'}
            </h3>
            <form onSubmit={(e) => { e.preventDefault(); onSubmit(formData); }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start', marginBottom: '20px' }}>
                    <div>
                        <label style={labelStyle}>Nombre</label>
                        <input
                            type="text" name="name" value={formData.name}
                            onChange={handleChange} required style={inputStyle}
                            placeholder="Ej: Vestidos de Noche"
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Categoría Padre</label>
                        <select
                            name="parent_id" value={formData.parent_id}
                            onChange={handleChange}
                            style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                        >
                            <option value="">— Sin padre (Raíz) —</option>
                            {categories
                                .filter(c => c.id !== editingCategory?.id && c.slug !== 'sin_categoria')
                                .map(c => <option key={c.id} value={c.id}>{c.parent_name ? `${c.parent_name} › ${c.name}` : c.name}</option>)
                            }
                        </select>
                    </div>
                </div>

                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px', background: '#fff', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <input 
                        type="checkbox" 
                        id="is_filterable"
                        name="is_filterable" 
                        checked={formData.is_filterable}
                        onChange={(e) => setFormData(p => ({ ...p, is_filterable: e.target.checked }))}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="is_filterable" style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', cursor: 'pointer' }}>
                        Mostrar como filtro en el catálogo público
                    </label>
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <label style={labelStyle}>Especificaciones Sugeridas</label>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#8f0653' }}>{formData.suggested_specification_ids.length} ACTIVAS</span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                        {specifications.filter(s => formData.suggested_specification_ids.includes(s.id)).map(spec => (
                            <div key={spec.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', color: '#64748b', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', border: '1px solid #e2e8f0' }}>
                                <Layers size={12} />
                                {spec.name}
                                <button onClick={() => removeSpec(spec.id)} style={{ border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}>
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                        {formData.suggested_specification_ids.length === 0 && (
                            <p style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>No se han asignado especificaciones automáticas.</p>
                        )}
                    </div>

                    <button 
                        type="button" 
                        onClick={() => setShowLibrary(true)}
                        style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '2px dashed #e2e8f0', color: '#64748b', background: '#fff', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = '#8f0653'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
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

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '700', color: isSystem ? '#94a3b8' : '#1e1b4b' }}>
                        {v}
                        {isSystem && <span style={{ marginLeft: '8px', fontSize: '10px', background: '#e2e8f0', color: '#64748b', padding: '2px 6px', borderRadius: '4px', fontWeight: '600' }}>SISTEMA</span>}
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
            
            // Configuración por nivel
            const config = {
                1: { label: 'Niv. 1', bg: '#fdf2f8', border: '#fbcfe8', color: '#8f0653' },
                2: { label: 'Niv. 2', bg: '#eff6ff', border: '#dbeafe', color: '#1e40af' },
                3: { label: 'Niv. 3', bg: '#f0fdf4', border: '#dcfce7', color: '#166534' }
            };
            
            const c = config[v] || { label: `Niv. ${v}`, bg: '#f8fafc', border: '#e2e8f0', color: '#64748b' };
            
            return (
                <div style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 8px', 
                    background: c.bg,
                    color: c.color,
                    borderRadius: '6px', 
                    fontSize: '10px', 
                    fontWeight: '800',
                    border: `1px solid ${c.border}`,
                    whiteSpace: 'nowrap',
                    lineHeight: '1'
                }}>
                    {c.label.toUpperCase()}
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
        render: (v) => <code style={{ fontSize: '12px', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>{v}</code> 
    },
    { 
        key: 'product_count', 
        label: 'Productos', 
        width: '120px', 
        align: 'center',
        render: (v) => <span style={{ fontWeight: '700', color: v > 0 ? '#059669' : '#94a3b8', fontSize: '14px' }}>{v > 0 ? v : '—'}</span>
    },
    {
        key: 'is_filterable',
        label: 'Filtro',
        width: '100px',
        align: 'center',
        render: (v) => (
            <span style={{ 
                padding: '4px 8px', 
                borderRadius: '6px', 
                fontSize: '10px', 
                fontWeight: '800',
                background: v ? '#f0fdf4' : '#fef2f2',
                color: v ? '#166534' : '#991b1b',
                border: `1px solid ${v ? '#dcfce7' : '#fee2e2'}`
            }}>
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
    const [showForm, setShowForm] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    
    // Paginación y búsqueda
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [search, setSearch] = useState('');
    const [activeFilters, setActiveFilters] = useState({});
    const [showDetail, setShowDetail] = useState(false);
    const [detailData, setDetailData] = useState(null);

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
            // Aumentamos a 500 para asegurar que carguen todos
            const res = await fetch(`${API_BASE}/categories?page_size=500`);
            const data = await res.json();
            setAllCategoriesForFilter(data.items || []);
        } catch (err) {
            console.error('Error cargando filtros:', err);
        }
    }, []);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);
    useEffect(() => { fetchAllForFilter(); }, [fetchAllForFilter]);

    const handleSubmit = async (formData) => {
        const url = editingCategory
            ? `${API_BASE}/categories/${editingCategory.id}`
            : `${API_BASE}/categories`;

        const body = { ...formData };
        if (body.parent_id === '') body.parent_id = null;
        else body.parent_id = parseInt(body.parent_id);

        const res = await fetch(url, {
            method: editingCategory ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            toast.success(editingCategory ? 'Categoría actualizada' : 'Categoría creada con éxito');
            setShowForm(false);
            setEditingCategory(null);
            fetchCategories();
            fetchAllForFilter();
        } else {
            const err = await res.json();
            toast.error(err.detail || 'Error al guardar categoría');
        }
    };

    const handleDelete = async (id) => {
        if (!await confirm("¿Eliminar esta categoría? Los productos se moverán a 'Sin Categoría'.")) return;
        const res = await fetch(`${API_BASE}/categories/${id}`, { method: 'DELETE' });
        if (res.ok) {
            toast.success('Categoría eliminada con éxito');
            fetchCategories();
            fetchAllForFilter();
        } else {
            const e = await res.json();
            toast.error(e.detail || 'Error al eliminar categoría');
        }
    };

    const handleViewCategory = async (category) => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/categories/${category.id}`);
            const fullData = await res.json();
            setDetailData(fullData);
            setShowDetail(true);
        } catch (err) {
            console.error("Error cargando detalle:", err);
            toast.error("No se pudo cargar el detalle de la categoría.");
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
                action={!showForm ? { label: '＋ Nueva Categoría', onClick: () => { setEditingCategory(null); setShowForm(true); } } : null}
            />

            {showForm && (
                <CategoryForm
                    editingCategory={editingCategory}
                    categories={allCategoriesForFilter}
                    onSubmit={handleSubmit}
                    onCancel={() => { setShowForm(false); setEditingCategory(null); }}
                />
            )}

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
                rowActions={(row) => {
                    // Joker category: no edit, no delete
                    const isSystem = row.is_joker || row.slug === 'sin_categoria';
                    if (isSystem) return null;

                    return (
                        <RowActions
                            onView={() => handleViewCategory(row)}
                            onEdit={() => { setEditingCategory(row); setShowForm(true); }}
                            onDelete={() => handleDelete(row.id)}
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
                isOpen={showDetail}
                onClose={() => setShowDetail(false)}
                data={detailData}
                type="category"
                title={detailData?.name}
            />
        </div>
    );
};

export default CategoryManager;
