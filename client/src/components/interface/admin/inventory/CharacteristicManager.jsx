import React, { useState, useEffect, useCallback } from 'react';
import SectionHeader from '../../../ui/admin/SectionHeader';
import DataTable from '../../../ui/admin/DataTable';
import RowActions from '../../../ui/admin/RowActions';
import CharacteristicForm from './CharacteristicForm';
import DetailDrawer from '../../../ui/admin/DetailDrawer';
import Badge from '../../../ui/Badge';
import FilterBar from '../../../ui/admin/FilterBar';
import { useNotification } from '../../../../context/NotificationContext';
import { Hash, Tag, Palette } from 'lucide-react';

const API_BASE = '/api/v1/admin/catalog';

const CharacteristicManager = () => {
    const { toast, confirm } = useNotification();
    const [characteristics, setCharacteristics] = useState([]);
    const [allCategories, setAllCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list' | 'edit'
    const [editingChar, setEditingChar] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [detailData, setDetailData] = useState(null);

    // Filter States (Standardized with FilterBar)
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilters, setActiveFilters] = useState({});

    const fetchCharacteristics = useCallback(async () => {
        setLoading(true);
        try {
            const [charRes, catRes] = await Promise.all([
                fetch(`${API_BASE}/attributes`),
                fetch(`${API_BASE}/categories?page_size=500`)
            ]);
            
            if (!charRes.ok || !catRes.ok) throw new Error('Error de red');
            
            const charData = await charRes.json();
            const catData = await catRes.json();
            
            setCharacteristics(charData || []);
            setAllCategories(catData.items || []);
        } catch (err) {
            console.error('Error:', err);
            toast.error('No se pudo conectar con el servidor.');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchCharacteristics(); }, [fetchCharacteristics]);

    const normalizeChar = (text) => text.trim().toUpperCase();
    const normalizeOpt = (text) => {
        if (!text) return "";
        return text.trim().toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const handleSave = async (formData) => {
        if (!formData.name) return toast.error('El nombre de la característica es obligatorio');
        
        // Aplicar Regla de Negocio: CARACTERÍSTICA y Opción
        const normalizedData = {
            ...formData,
            name: normalizeChar(formData.name),
            domain: (formData.domain || []).map(item => ({
                ...item,
                value: item.value ? normalizeOpt(item.value) : item.value
            }))
        };

        try {
            const isEdit = !!editingChar;
            const url = isEdit ? `${API_BASE}/attributes/${editingChar.id}` : `${API_BASE}/attributes`;
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(normalizedData)
            });

            if (res.ok) {
                toast.success(isEdit ? 'Característica actualizada' : 'Nueva característica creada');
                setView('list');
                fetchCharacteristics();
            } else {
                const err = await res.json();
                toast.error(err.detail || 'Error al guardar');
            }
        } catch (err) { 
            console.error(err); 
            toast.error('Error de red al intentar guardar.');
        }
    };

    const handleDelete = async (id) => {
        if (!await confirm('¿Estás seguro de que quieres eliminar esta característica permanentemente?')) return;
        try {
            const res = await fetch(`${API_BASE}/attributes/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Característica eliminada correctamente');
                fetchCharacteristics();
            }
        } catch (err) { 
            console.error(err); 
            toast.error('Error al intentar eliminar');
        }
    };

    const handleReorderOptions = async (charId, newDomain) => {
        try {
            const res = await fetch(`${API_BASE}/attributes/${charId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ domain: newDomain })
            });

            if (res.ok) {
                toast.success('Orden actualizado');
                const updated = await res.json();
                setDetailData(updated);
                fetchCharacteristics();
            }
        } catch (err) {
            console.error(err);
            toast.error('Error al guardar el nuevo orden');
        }
    };

    const handleUpdateDetail = async (updatedItem, originalItem) => {
        if (!detailData) return;

        // Normalizar el valor antes de guardar (Regla de Negocio)
        const finalValue = updatedItem.value ? normalizeOpt(updatedItem.value) : updatedItem.value;
        const normalizedItem = { ...updatedItem, value: finalValue };

        // Si estamos actualizando una opción (ej: color) dentro de una característica
        if (detailData.domain) {
            const newDomain = detailData.domain.map(opt => {
                // Si tenemos ID, usamos ID
                if (opt.id && originalItem?.id && opt.id === originalItem.id) {
                    return { ...opt, ...normalizedItem };
                }
                
                // Si no hay ID, comparamos con el valor ORIGINAL (el que tenía antes de editar)
                const origVal = originalItem?.value || originalItem?.name;
                const optVal = opt.value || opt.name;
                
                if (origVal && optVal === origVal) {
                    return { ...opt, ...normalizedItem };
                }
                return opt;
            });

            const updatedChar = { ...detailData, domain: newDomain };
            
            try {
                const res = await fetch(`${API_BASE}/attributes/${detailData.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updatedChar)
                });

                if (res.ok) {
                    toast.success('Opción actualizada correctamente');
                    setDetailData(updatedChar);
                    fetchCharacteristics();
                } else {
                    const err = await res.json();
                    toast.error(err.detail || 'Error al actualizar');
                }
            } catch (err) {
                console.error(err);
                toast.error('Error de red al actualizar');
            }
        }
    };

    const handleDeleteDetail = async (itemToDelete) => {
        if (!detailData || !detailData.domain) return false;

        const newDomain = detailData.domain.filter(opt => {
            const idMatch = (opt.id && opt.id === itemToDelete.id);
            const valueMatch = (opt.value === itemToDelete.value || opt.name === itemToDelete.name);
            return !(idMatch || valueMatch);
        });

        const updatedChar = { ...detailData, domain: newDomain };

        try {
            const res = await fetch(`${API_BASE}/attributes/${detailData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedChar)
            });

            if (res.ok) {
                toast.success('Opción eliminada correctamente');
                setDetailData(updatedChar);
                fetchCharacteristics();
                return true;
            } else {
                toast.error('Error al eliminar la opción');
                return false;
            }
        } catch (err) {
            console.error(err);
            toast.error('Error de red al eliminar');
            return false;
        }
    };

    const handleViewChar = async (char) => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/attributes/${char.id}`);
            const fullData = await res.json();
            setDetailData(fullData);
            setShowDetail(true);
        } catch (err) {
            console.error("Error cargando detalle:", err);
            toast.error("No se pudo cargar el detalle de la característica.");
        } finally {
            setLoading(false);
        }
    };

    // Lógica de Filtrado (Compatible con FilterBar)
    const filteredCharacteristics = characteristics.filter(char => {
        const matchesSearch = char.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (char.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesCategory = !activeFilters.category_id || 
                               (char.category_ids || []).includes(parseInt(activeFilters.category_id));
        
        return matchesSearch && matchesCategory;
    }).sort((a, b) => {
        if (a.is_system && !b.is_system) return -1;
        if (!a.is_system && b.is_system) return 1;
        return a.name.localeCompare(b.name);
    });

    if (view === 'edit') {
        return (
            <CharacteristicForm 
                initialData={editingChar} 
                onSave={handleSave} 
                onCancel={() => { setView('list'); setEditingChar(null); }} 
            />
        );
    }

    return (
        <div className="char-manager-layout">
            <SectionHeader 
                title="Gestión de Características"
                description="Define las opciones base (Talla, Color, Tela) que usarás en tus productos o especificaciones."
                action={{ 
                    label: '＋ Nueva Característica', 
                    onClick: () => { setEditingChar(null); setView('edit'); } 
                }}
            />

            <FilterBar 
                searchPlaceholder="Buscar características..."
                onSearchChange={setSearchTerm}
                activeFilters={activeFilters}
                onFilterChange={setActiveFilters}
                filters={[
                    {
                        key: 'category_id',
                        label: 'Todas las Categorías',
                        options: allCategories.map(cat => {
                            const isSubcategory = cat.level > 1;
                            const indent = '\u00A0\u00A0\u00A0\u00A0'.repeat(Math.max(0, (cat.level || 1) - 1));
                            const prefix = isSubcategory ? '— ' : '';
                            return { value: cat.id, label: indent + prefix + cat.name };
                        })
                    }
                ]}
            />

            <DataTable 
                columns={[
                    { 
                        key: 'name', 
                        label: 'Nombre de Característica', 
                        render: (v, char) => {
                            const isSystem = char.is_system;
                            return (
                                <div className="char-manager-name-wrap">
                                    {isSystem ? (
                                        <div 
                                            title="Esta característica es del núcleo del sistema y está protegida."
                                            className="char-manager-shield"
                                        >
                                            <Palette size={14} />
                                        </div>
                                    ) : (
                                        <div className="char-manager-dot"></div>
                                    )}
                                    <span className={`char-manager-name-text ${isSystem ? 'system' : 'normal'}`}>{v.toUpperCase()}</span>
                                    {isSystem && (
                                        <Badge variant="error" size="sm" className="char-manager-badge-system">SISTEMA</Badge>
                                    )}
                                </div>
                            );
                        }
                    },
                    { 
                        key: 'domain', 
                        label: 'Opciones en Biblioteca', 
                        width: '200px', 
                        align: 'center', 
                        render: (v) => (
                            <Badge variant="success" size="md">
                                {v?.length || 0} registradas
                            </Badge>
                        ) 
                    },
                    {
                        key: 'is_filterable',
                        label: 'Filtro',
                        width: '100px',
                        align: 'center',
                        render: (v) => (
                            <Badge variant={v ? 'success' : 'error'} size="sm">
                                {v ? 'SÍ' : 'NO'}
                            </Badge>
                        )
                    },
                    {
                        // Decide qué separa una tarjeta de otra en el Explorador.
                        // Antes sólo se veía abriendo el formulario, así que era
                        // imposible saber de un vistazo cuáles estaban marcadas.
                        key: 'afecta_apariencia',
                        label: 'Visual',
                        width: '110px',
                        align: 'center',
                        render: (v, row) => (
                            <Badge variant={v ? 'success' : 'default'} size="sm">
                                {v ? (['sys_color', 'sys_pattern'].includes(row.system_id) ? 'SÍ · FIJO' : 'SÍ') : 'NO'}
                            </Badge>
                        )
                    }
                ]}
                data={filteredCharacteristics}
                isLoading={loading}
                emptyMessage={searchTerm || activeFilters.category_id ? "No se encontraron resultados para los filtros aplicados." : "No hay características definidas."}
                rowActions={(row) => (
                    <RowActions 
                        onView={() => handleViewChar(row)}
                        onEdit={() => { setEditingChar(row); setView('edit'); }}
                        onDelete={row.is_system ? null : () => handleDelete(row.id)}
                    />
                )}
            />

            <DetailDrawer 
                isOpen={showDetail}
                onClose={() => setShowDetail(false)}
                data={detailData}
                type="characteristic"
                title={detailData?.name}
                onUpdate={handleUpdateDetail}
                onDelete={handleDeleteDetail}
                onReorder={(newDomain) => handleReorderOptions(detailData.id, newDomain)}
            />
        </div>
    );
};

export default CharacteristicManager;
