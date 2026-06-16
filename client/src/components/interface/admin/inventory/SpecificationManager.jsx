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

const API_BASE = (import.meta.env.PROD ? '/api/v1/admin/catalog' : 'http://127.0.0.1:8000/api/v1/admin/catalog');

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
            <div className="spec-form-container">
                <div className="spec-form-header">
                    <div className="spec-form-header-left">
                        <button onClick={() => setShowForm(false)} className="spec-form-btn-back">
                            <ArrowLeft size={20} />
                        </button>
                        <h2 className="spec-form-title">
                            {editingSpec ? 'Editar Especificación' : 'Crear Grupo Maestro'}
                        </h2>
                    </div>
                    <div className="spec-form-header-right">
                        <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                        <Button variant="primary" onClick={handleSave} style={{ padding: '0 24px' }}>
                            <Save size={18} style={{ marginRight: '8px' }} /> Guardar Grupo
                        </Button>
                    </div>
                </div>

                <div className="spec-form-body-wrapper">
                    <div className="spec-form-body-wrapper">
                        <div className="spec-form-card">
                            <label className="spec-form-label-primary">Nombre de la Especificación</label>
                            <input 
                                value={formData.name}
                                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                className="spec-form-input"
                            />

                            <label className="spec-form-label-secondary">Descripción (Opcional)</label>
                            <textarea 
                                value={formData.description}
                                onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                className="spec-form-textarea"
                            />
                        </div>

                        {/* Características Section */}
                        <div className="spec-char-wrapper">
                            {/* Sticky Header */}
                            <div className="spec-char-header">
                                <div className="spec-char-header-inner">
                                    <h4 className="spec-char-header-title">Características del Grupo</h4>
                                    <span className="spec-char-header-badge">{formData.characteristics.length} Elementos</span>
                                </div>
                            </div>

                            {/* Scrollable Area */}
                            <div className="spec-char-scroll">
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
                                                <div className="spec-char-accordion-header">
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
                                                        className="spec-char-btn-picker"
                                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8f0653'; e.currentTarget.style.color = '#8f0653'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#64748b'; }}
                                                    >
                                                        <Layers size={12} />
                                                        Ver biblioteca de opciones
                                                    </button>
                                                </div>
                                                
                                                {hasDomain ? (
                                                    <div className="spec-char-grid">
                                                        {c.domain.map((opt, i) => {
                                                            const val = typeof opt === 'string' ? opt : (opt.value || opt.name);
                                                            const isSelected = config?.allowed_values.includes(val);
                                                            const hex = typeof opt === 'object' ? opt.hex_code : null;

                                                            return (
                                                                <button
                                                                    key={i}
                                                                    onClick={() => toggleValueSuggestion(c.id, val)}
                                                                    className={`spec-char-btn-val ${isSelected ? 'active' : ''}`}
                                                                >
                                                                    {isColor && hex && (
                                                                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: hex, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                                                                    )}
                                                                    <span className="spec-char-btn-val-text">{val}</span>
                                                                    {isSelected && <Check size={14} style={{ flexShrink: 0 }} />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <p className="spec-char-empty-msg" style={{ padding: 0, border: 'none', textAlign: 'left' }}>
                                                        No hay opciones en la biblioteca para {c.name}.
                                                    </p>
                                                )}
                                            </Accordion>
                                        );
                                    })}
                                    {formData.characteristics.length === 0 && (
                                        <div className="spec-char-empty-msg">
                                            No hay características seleccionadas.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sticky Footer Area */}
                            <div className="spec-char-footer">
                                <button 
                                    type="button" 
                                    onClick={() => setShowCharLibrary(true)}
                                    className="spec-char-btn-add"
                                >
                                    <Plus size={18} /> Añadir Características desde la Biblioteca
                                </button>
                            </div>
                        </div>

                        {/* Categorías Section */}
                        <div className="spec-cat-card">
                            <div className="spec-cat-header">
                                <h4 className="spec-cat-title">Sugerir en Categorías</h4>
                                <span className="spec-cat-badge">{formData.category_ids.length}</span>
                            </div>

                            <div className="spec-cat-grid">
                                {selectedCats.map(cat => (
                                    <div key={cat.id} className="spec-cat-tag">
                                        <Folder size={12} />
                                        {cat.name}
                                        <button onClick={() => removeCategory(cat.id)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                                {formData.category_ids.length === 0 && (
                                    <p className="spec-cat-empty-msg">No se ha asociado a ninguna categoría aún.</p>
                                )}
                            </div>

                            <button 
                                type="button" 
                                onClick={() => setShowCatLibrary(true)}
                                className="spec-cat-btn-add"
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
        <div className="spec-list-layout">
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
                        render: (v) => <span className="spec-list-name">{v}</span>
                    },
                    { 
                        key: 'characteristics', 
                        label: 'Elementos', 
                        render: (v) => (
                            <div className="spec-list-chars-wrapper">
                                {v.map((c, i) => (
                                    <span key={i} className="spec-list-char-tag">
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
