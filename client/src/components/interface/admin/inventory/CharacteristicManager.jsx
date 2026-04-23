import React, { useState, useEffect, useCallback } from 'react';
import SectionHeader from '../../../ui/admin/SectionHeader';
import DataTable from '../../../ui/admin/DataTable';
import RowActions from '../../../ui/admin/RowActions';
import CharacteristicForm from './CharacteristicForm';
import DetailDrawer from '../../../ui/admin/DetailDrawer';
import FilterBar from '../../../ui/admin/FilterBar';
import { useNotification } from '../../../../context/NotificationContext';
import { Hash, Tag, Palette } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api/v1/admin/catalog';

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

    const handleSave = async (formData) => {
        if (!formData.name) return toast.error('El nombre de la característica es obligatorio');
        try {
            const isEdit = !!editingChar;
            const url = isEdit ? `${API_BASE}/attributes/${editingChar.id}` : `${API_BASE}/attributes`;
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
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
        const aIsColor = a.name.toLowerCase() === 'color' || a.name.toLowerCase() === 'colores';
        const bIsColor = b.name.toLowerCase() === 'color' || b.name.toLowerCase() === 'colores';
        if (aIsColor && !bIsColor) return -1;
        if (!aIsColor && bIsColor) return 1;
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
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
                        options: allCategories.map(cat => ({ value: cat.id, label: cat.name }))
                    }
                ]}
            />

            <DataTable 
                columns={[
                    { 
                        key: 'name', 
                        label: 'Nombre de Característica', 
                        render: (v) => {
                            const isColor = v.toLowerCase() === 'color' || v.toLowerCase() === 'colores';
                            return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {isColor ? (
                                        <div style={{ padding: '4px 8px', borderRadius: '8px', background: 'linear-gradient(135deg, #8f0653 0%, #db2777 100%)', color: '#fff', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 4px 10px rgba(143,6,83,0.3)' }}>
                                            <Palette size={12} /> SISTEMA
                                        </div>
                                    ) : (
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8f0653' }}></div>
                                    )}
                                    <span style={{ fontWeight: '900', color: isColor ? '#8f0653' : '#1e1b4b', letterSpacing: '-0.5px' }}>{v.toUpperCase()}</span>
                                </div>
                            );
                        }
                    },
                    { 
                        key: 'value_structure', 
                        label: 'Configuración de Valores', 
                        render: (v) => (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {v.map((c, i) => (
                                    <span key={i} style={{ fontSize: '10px', background: '#f1f5f9', color: '#64748b', padding: '3px 10px', borderRadius: '20px', fontWeight: '700', border: '1px solid #e2e8f0' }}>
                                        {c.label}
                                    </span>
                                ))}
                            </div>
                        )
                    },
                    { 
                        key: 'domain', 
                        label: 'Opciones en Biblioteca', 
                        width: '200px', 
                        align: 'center', 
                        render: (v) => (
                            <span style={{ fontWeight: '800', color: '#059669', background: '#f0fdf4', padding: '4px 12px', borderRadius: '20px', fontSize: '12px' }}>
                                {v?.length || 0} registradas
                            </span>
                        ) 
                    },
                    { 
                        key: 'is_filterable', 
                        label: 'Filtro', 
                        width: '100px', 
                        align: 'center', 
                        render: (v) => (
                            <span style={{ 
                                padding: '4px 8px', 
                                borderRadius: '20px', 
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
                ]}
                data={filteredCharacteristics}
                isLoading={loading}
                emptyMessage={searchTerm || activeFilters.category_id ? "No se encontraron resultados para los filtros aplicados." : "No hay características definidas."}
                rowActions={(row) => (
                    <RowActions 
                        onView={() => handleViewChar(row)}
                        onEdit={() => { setEditingChar(row); setView('edit'); }}
                        onDelete={() => handleDelete(row.id)}
                    />
                )}
            />

            <DetailDrawer 
                isOpen={showDetail}
                onClose={() => setShowDetail(false)}
                data={detailData}
                type="characteristic"
                title={detailData?.name}
            />
        </div>
    );
};

export default CharacteristicManager;
