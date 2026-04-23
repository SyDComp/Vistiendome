import React, { useState, useEffect, useCallback } from 'react';
import SectionHeader from '../../../ui/admin/SectionHeader';
import DataTable from '../../../ui/admin/DataTable';
import RowActions from '../../../ui/admin/RowActions';
import Button from '../../../ui/Button';
import Input from '../../../ui/Input';
import { useNotification } from '../../../../context/NotificationContext';
import LibraryPicker from './LibraryPicker';
import DetailDrawer from '../../../ui/admin/DetailDrawer';
import Accordion from '../../../ui/Accordion';
import FilterBar from '../../../ui/admin/FilterBar';
import { Save, ArrowLeft, Layers, Plus, Trash2, Search, Settings2, Folder, X, ChevronRight, Hash, Sparkles, Check } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api/v1/admin/catalog';

const SpecificationManager = () => {
    const { toast, confirm } = useNotification();
    const [specifications, setSpecifications] = useState([]);
    const [characteristics, setCharacteristics] = useState([]);
    const [allCategories, setAllCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [detailType, setDetailType] = useState('specification'); // 'specification' | 'characteristic'
    const [detailMetadata, setDetailMetadata] = useState(null);
    
    // Picker para opciones del dominio
    const [showOptionsPicker, setShowOptionsPicker] = useState(false);
    const [activeCharForPicker, setActiveCharForPicker] = useState(null);
    
    // Form State
    const [editingSpec, setEditingSpec] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        characteristics: [], // [{ id, allowed_values }]
        category_ids: []
    });

    const [showCharLibrary, setShowCharLibrary] = useState(false);
    const [showCatLibrary, setShowCatLibrary] = useState(false);
    const [openCharAccordions, setOpenCharAccordions] = useState([]); // Array IDs

    // Filter States (Standardized)
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilters, setActiveFilters] = useState({});

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [specRes, charRes, catRes] = await Promise.all([
                fetch(`${API_BASE}/specifications`),
                fetch(`${API_BASE}/attributes`),
                fetch(`${API_BASE}/categories?page_size=500`)
            ]);
            const specs = await specRes.json();
            const chars = await charRes.json();
            const cats = await catRes.json();
            setSpecifications(specs || []);
            setCharacteristics(chars || []);
            setAllCategories(cats.items || []);
        } catch (err) {
            console.error(err);
            toast.error('Error al cargar datos del servidor');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleEdit = (spec) => {
        setEditingSpec(spec);
        // El backend ahora devuelve 'characteristics' como una lista rica [{id, name, allowed_values...}]
        setFormData({
            name: spec.name,
            description: spec.description || '',
            characteristics: spec.characteristics.map(c => ({
                id: c.id,
                allowed_values: c.allowed_values || []
            })),
            category_ids: spec.category_ids || []
        });
        setShowForm(true);
    };

    const handleView = async (spec) => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/specifications/${spec.id}`);
            const data = await res.json();
            setDetailData(data);
            setShowDetail(true);
        } catch (err) {
            console.error("Error cargando detalle:", err);
            toast.error("No se pudo cargar el detalle de la especificación.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name) return toast.error('Debes ponerle un nombre a la especificación');
        if (formData.characteristics.length === 0) return toast.error('Añade al menos una característica');

        try {
            const isEdit = !!editingSpec;
            const url = isEdit ? `${API_BASE}/specifications/${editingSpec.id}` : `${API_BASE}/specifications`;
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(isEdit ? 'Especificación actualizada' : 'Especificación creada');
                setShowForm(false);
                fetchAll();
            } else {
                toast.error('Error al guardar la especificación');
            }
        } catch (err) {
            toast.error('Error de red');
        }
    };

    const handleDelete = async (id) => {
        if (!await confirm('¿Estás seguro de que quieres eliminar esta especificación? No afectará a las características individuales.')) return;
        try {
            const res = await fetch(`${API_BASE}/specifications/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Especificación eliminada');
                fetchAll();
            }
        } catch (err) {
            toast.error('Error al eliminar');
        }
    };

    const addCharsFromLibrary = (selected) => {
        setFormData(prev => {
            const nextChars = [...prev.characteristics];
            selected.forEach(s => {
                const exists = nextChars.find(c => c.id === s.id);
                if (!exists) {
                    nextChars.push({ id: s.id, allowed_values: [] });
                }
            });
            // Remover las que ya no estén en selected
            const finalChars = nextChars.filter(nc => selected.some(s => s.id === nc.id));
            
            // Auto-abrir nuevas
            const newIds = selected.map(s => s.id);
            setOpenCharAccordions(prevOpen => {
                const updated = [...prevOpen];
                newIds.forEach(id => {
                    if (!updated.includes(id)) updated.push(id);
                });
                return updated.filter(id => newIds.includes(id));
            });

            return { ...prev, characteristics: finalChars };
        });
    };

    const addCatsFromLibrary = (selected) => {
        setFormData(prev => ({
            ...prev,
            category_ids: selected.map(s => s.id)
        }));
    };

    const toggleValueSuggestion = (charId, value) => {
        setFormData(prev => ({
            ...prev,
            characteristics: prev.characteristics.map(c => {
                if (c.id !== charId) return c;
                const nextAllowed = c.allowed_values.includes(value)
                    ? c.allowed_values.filter(v => v !== value)
                    : [...c.allowed_values, value];
                return { ...c, allowed_values: nextAllowed };
            })
        }));
    };

    const removeChar = (id) => {
        setFormData(prev => ({
            ...prev,
            characteristics: prev.characteristics.filter(c => c.id !== id)
        }));
    };

    const removeCategory = (id) => {
        setFormData(prev => ({
            ...prev,
            category_ids: prev.category_ids.filter(catId => catId !== id)
        }));
    };

    // Lógica de Filtrado (Standardized)
    const filteredSpecifications = specifications.filter(spec => {
        const matchesSearch = spec.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (spec.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCategory = !activeFilters.category_id || 
                               (spec.category_ids || []).includes(parseInt(activeFilters.category_id));

        return matchesSearch && matchesCategory;
    });

    const handleViewCharDetail = (char, suggestedValues = []) => {
        setDetailData(char);
        setDetailType('characteristic');
        setDetailMetadata({ suggestedValues });
        setShowDetail(true);
    };

    const handleViewSpecDetail = (spec) => {
        setDetailData(spec);
        setDetailType('specification');
        setDetailMetadata(null);
        setShowDetail(true);
    };

    const handleUpdateOptions = (charId, newOptions) => {
        setFormData(prev => ({
            ...prev,
            characteristics: prev.characteristics.map(c => 
                c.id === charId ? { ...c, allowed_values: newOptions } : c
            )
        }));
    };

    if (showForm) {
        const charIds = formData.characteristics.map(c => c.id);
        const selectedChars = characteristics.filter(c => charIds.includes(c.id));
        const selectedCats = allCategories.filter(c => formData.category_ids.includes(c.id));

        return (
            <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%', animation: 'fadeIn 0.3s ease' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button onClick={() => setShowForm(false)} style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '10px', borderRadius: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', color: '#64748b' }}>
                            <ArrowLeft size={20} />
                        </button>
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#1e1b4b' }}>
                            {editingSpec ? 'Editar Especificación' : 'Crear Grupo Maestro'}
                        </h2>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                        <Button variant="primary" onClick={handleSave} style={{ padding: '0 24px' }}>
                            <Save size={18} style={{ marginRight: '8px' }} /> Guardar Grupo
                        </Button>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ background: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#8f0653', textTransform: 'uppercase', marginBottom: '8px' }}>Nombre de la Especificación</label>
                            <input 
                                value={formData.name}
                                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                placeholder="Ej: Camisas Hombre, Vestidos de Gala..."
                                style={{ width: '100%', fontSize: '20px', fontWeight: '700', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', color: '#1e1b4b', marginBottom: '24px', outline: 'none' }}
                            />

                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Descripción (Opcional)</label>
                            <textarea 
                                value={formData.description}
                                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                placeholder="Describe el propósito de este grupo..."
                                style={{ width: '100%', minHeight: '80px', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '14px', outline: 'none', resize: 'none' }}
                            />
                        </div>

                        {/* Características Section */}
                        <div style={{ 
                            background: '#fff', 
                            borderRadius: '24px', 
                            border: '1px solid #e2e8f0',
                            display: 'flex',
                            flexDirection: 'column',
                            maxHeight: 'min(700px, 60vh)',
                            minHeight: '350px',
                            overflow: 'hidden',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                        }}>
                            {/* Sticky Header */}
                            <div style={{ padding: '32px 32px 20px 32px', borderBottom: '1px solid #f1f5f9', background: '#fff', zIndex: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '900', color: '#1e1b4b', textTransform: 'uppercase' }}>Características del Grupo</h4>
                                    <span style={{ fontSize: '11px', background: '#8f0653', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>{formData.characteristics.length} Elementos</span>
                                </div>
                            </div>

                            {/* Scrollable Area */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {selectedChars.map(c => {
                                        const config = formData.characteristics.find(fc => fc.id === c.id);
                                        const hasDomain = c.domain && c.domain.length > 0;
                                        const isColor = c.name.toLowerCase().includes('color');
                                        const isOpen = openCharAccordions.includes(c.id);

                                        return (
                                            <Accordion
                                                key={c.id}
                                                title={c.name}
                                                icon={<Hash size={16} />}
                                                initialOpen={isOpen}
                                                onToggle={(open) => {
                                                    setOpenCharAccordions(prev => 
                                                        open ? [...prev, c.id] : prev.filter(id => id !== c.id)
                                                    );
                                                }}
                                                extraHeader={
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); removeChar(c.id); }}
                                                        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex' }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                }
                                            >
                                                <div style={{ 
                                                    display: 'flex', 
                                                    justifyContent: 'space-between', 
                                                    alignItems: 'center', 
                                                    marginBottom: '16px',
                                                    gap: '12px'
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Sparkles size={14} color="#8f0653" />
                                                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Selecciona Opciones Disponibles</span>
                                                    </div>
                                                    
                                                    <button
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            setActiveCharForPicker(c);
                                                            setShowOptionsPicker(true);
                                                        }}
                                                        style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '6px',
                                                            border: '1px solid #e2e8f0',
                                                            background: '#fff',
                                                            color: '#64748b',
                                                            fontSize: '10px',
                                                            fontWeight: '800',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px',
                                                            transition: 'all 0.2s ease',
                                                            textTransform: 'uppercase'
                                                        }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8f0653'; e.currentTarget.style.color = '#8f0653'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
                                                    >
                                                        <Layers size={12} />
                                                        Ver biblioteca de opciones
                                                    </button>
                                                </div>
                                                
                                                {hasDomain ? (
                                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                                                        {c.domain.map((opt, i) => {
                                                            const val = typeof opt === 'string' ? opt : (opt.value || opt.name);
                                                            const isSelected = config?.allowed_values.includes(val);
                                                            const hex = typeof opt === 'object' ? opt.hex_code : null;

                                                            return (
                                                                <button
                                                                    key={i}
                                                                    onClick={() => toggleValueSuggestion(c.id, val)}
                                                                    style={{
                                                                        padding: '10px 12px',
                                                                        borderRadius: '12px',
                                                                        border: '2px solid',
                                                                        borderColor: isSelected ? '#8f0653' : '#f1f5f9',
                                                                        background: isSelected ? '#fdf2f8' : '#fff',
                                                                        color: isSelected ? '#8f0653' : '#1e1b4b',
                                                                        fontSize: '12px',
                                                                        fontWeight: '700',
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '10px',
                                                                        transition: 'all 0.2s',
                                                                        textAlign: 'left'
                                                                    }}
                                                                >
                                                                    {isColor && hex && (
                                                                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: hex, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                                                                    )}
                                                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{val}</span>
                                                                    {isSelected && <Check size={14} style={{ flexShrink: 0 }} />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>
                                                        No hay opciones en la biblioteca para {c.name}.
                                                    </p>
                                                )}
                                            </Accordion>
                                        );
                                    })}
                                    {formData.characteristics.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8', fontSize: '13px', border: '2px dashed #e2e8f0', borderRadius: '16px' }}>
                                            No hay características seleccionadas.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sticky Footer Area */}
                            <div style={{ padding: '20px 32px 32px 32px', borderTop: '1px solid #f1f5f9', background: '#fff' }}>
                                <button 
                                    type="button" 
                                    onClick={() => setShowCharLibrary(true)}
                                    style={{ width: '100%', padding: '16px', borderRadius: '16px', border: '1px solid #8f0653', color: '#fff', background: '#8f0653', fontWeight: '800', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 10px 15px -3px rgba(143, 6, 83, 0.2)' }}
                                >
                                    <Plus size={18} /> Añadir Características desde la Biblioteca
                                </button>
                            </div>
                        </div>

                        {/* Categorías Section */}
                        <div style={{ background: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '900', color: '#1e1b4b', textTransform: 'uppercase' }}>Sugerir en Categorías</h4>
                                <span style={{ fontSize: '11px', background: '#fdf2f8', color: '#8f0653', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>{formData.category_ids.length}</span>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                                {selectedCats.map(cat => (
                                    <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', color: '#475569', padding: '6px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '700', border: '1px solid #e2e8f0' }}>
                                        <Folder size={12} />
                                        {cat.name}
                                        <button onClick={() => removeCategory(cat.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                                {formData.category_ids.length === 0 && (
                                    <p style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>No se ha asociado a ninguna categoría aún.</p>
                                )}
                            </div>

                            <button 
                                type="button" 
                                onClick={() => setShowCatLibrary(true)}
                                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '2px dashed #e2e8f0', color: '#64748b', background: '#fff', fontWeight: '800', fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = '#8f0653'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                            >
                                <Plus size={16} /> Vincular Categorías Sugeridas
                            </button>
                        </div>
                    </div>
                </div>

                <LibraryPicker 
                    isOpen={showCharLibrary}
                    onClose={() => setShowCharLibrary(false)}
                    items={characteristics}
                    initialSelectedIds={formData.characteristics.map(c => c.id)}
                    onSelect={addCharsFromLibrary}
                    title="Biblioteca de Características"
                    description="Elige los elementos que formarán parte de esta especificación."
                    type="characteristics"
                    labelSingular="característica"
                    labelPlural="características"
                />

                <LibraryPicker 
                    isOpen={showCatLibrary}
                    onClose={() => setShowCatLibrary(false)}
                    items={allCategories}
                    initialSelectedIds={formData.category_ids}
                    onSelect={addCatsFromLibrary}
                    title="Biblioteca de Categorías"
                    description="Asocia masivamente este grupo a las ramas correspondientes."
                    type="categories"
                    labelSingular="categoría"
                    labelPlural="categorías"
                />
                <LibraryPicker 
                    isOpen={showOptionsPicker}
                    onClose={() => setShowOptionsPicker(false)}
                    title={`Biblioteca de Opciones: ${activeCharForPicker?.name || ''}`}
                    description="Selecciona los valores permitidos para este atributo."
                    type="options"
                    labelSingular="opción"
                    labelPlural="opciones"
                    items={activeCharForPicker?.domain || []}
                    initialSelectedIds={formData.characteristics.find(c => c.id === activeCharForPicker?.id)?.allowed_values || []}
                    onSelect={(selected) => {
                        const vals = selected.map(item => typeof item === 'string' ? item : (item.value || item.name));
                        handleUpdateOptions(activeCharForPicker.id, vals);
                    }}
                />

                <DetailDrawer 
                    isOpen={showDetail}
                    onClose={() => setShowDetail(false)}
                    data={detailData}
                    type={detailType}
                    title={detailData?.name}
                    metadata={detailMetadata}
                />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <SectionHeader 
                title="Gestión de Especificaciones"
                description="Agrupa características para cargarlas con un solo clic en tus productos."
                action={{ 
                    label: '＋ Crear Especificación', 
                    onClick: () => { setEditingSpec(null); setFormData({ name: '', description: '', characteristics: [], category_ids: [] }); setShowForm(true); } 
                }}
            />

            <FilterBar 
                searchPlaceholder="Buscar especificaciones..."
                onSearchChange={setSearchTerm}
                activeFilters={activeFilters}
                onFilterChange={setActiveFilters}
                filters={[
                    {
                        key: 'category_id',
                        label: 'Todas las Categorías',
                        options: allCategories.map(cat => ({ value: cat.id, label: cat.name }))
                    }
                ]}
            />

            <DataTable 
                columns={[
                    { 
                        key: 'name', 
                        label: 'Nombre', 
                        render: (v) => <span style={{ fontWeight: '800', color: '#1e1b4b' }}>{v}</span>
                    },
                    { 
                        key: 'characteristics', 
                        label: 'Elementos', 
                        render: (v) => (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {v.map((c, i) => (
                                    <span key={i} style={{ fontSize: '11px', background: '#f8fafc', color: '#64748b', padding: '3px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        {typeof c === 'string' ? c : c.name}
                                    </span>
                                ))}
                            </div>
                        )
                    }
                ]}
                data={filteredSpecifications}
                isLoading={loading}
                emptyMessage={searchTerm || activeFilters.category_id ? "No se encontraron especificaciones para los filtros aplicados." : "No hay especificaciones creadas."}
                rowActions={(row) => (
                    <RowActions 
                onView={() => handleViewSpecDetail(row)}
                onEdit={() => handleEdit(row)}
                onDelete={() => handleDelete(row.id)}
            />
        )}
    />
    <DetailDrawer 
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        data={detailData}
        type={detailType}
        title={detailData?.name}
        metadata={detailMetadata}
    />
</div>
    );
};

export default SpecificationManager;
