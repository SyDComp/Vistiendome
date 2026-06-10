import React, { useState, useEffect, useCallback } from 'react';
import SectionHeader from '../../../ui/admin/SectionHeader';
import DataTable from '../../../ui/admin/DataTable';
import RowActions from '../../../ui/admin/RowActions';
import Button from '../../../ui/Button';
import { useNotification } from '../../../../context/NotificationContext';
import { Palette, Plus, Save, Hash, Type, Trash2, Edit2, RotateCcw } from 'lucide-react';

const API_BASE = (import.meta.env.PROD ? '/api/v1/admin/catalog/colors' : 'http://127.0.0.1:8000/api/v1/admin/catalog/colors');

const ColorManager = () => {
    const { toast, confirm } = useNotification();
    const [colors, setColors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('list'); // 'list' | 'edit'
    const [editingColor, setEditingColor] = useState(null);
    const [formData, setFormData] = useState({ name: '', hex_code: '#000000' });

    const fetchColors = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(API_BASE);
            if (!res.ok) throw new Error('Error de red');
            const data = await res.json();
            setColors(data || []);
        } catch (err) {
            console.error('Error fetching colors:', err);
            toast.error('No se pudo cargar la biblioteca de colores.');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchColors(); }, [fetchColors]);

    const handleStartCreate = () => {
        setEditingColor(null);
        setFormData({ name: '', hex_code: '#000000' });
        setView('edit');
    };

    const handleStartEdit = (color) => {
        setEditingColor(color);
        setFormData({ name: color.name, hex_code: color.hex_code });
        setView('edit');
    };

    const handleSave = async () => {
        if (!formData.name.trim()) return toast.error('El nombre del color es obligatorio.');
        
        try {
            const isEdit = !!editingColor;
            const url = isEdit ? `${API_BASE}/${editingColor.id}` : API_BASE;
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(isEdit ? 'Color actualizado con éxito.' : 'Nuevo color registrado en la biblioteca.');
                setView('list');
                fetchColors();
            } else {
                const err = await res.json();
                toast.error(err.detail || 'Error al guardar el color.');
            }
        } catch (err) {
            console.error('Save error:', err);
            toast.error('Error de comunicación con el servidor.');
        }
    };

    const handleSync = async () => {
        setLoading(true);
        try {
            const res = await fetch((import.meta.env.PROD ? '/api/v1/admin/catalog/colors/sync' : 'http://127.0.0.1:8000/api/v1/admin/catalog/colors/sync'), { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                toast.success(`Sincronización exitosa: ${data.synced_count} colores actualizados en el catálogo.`);
            } else {
                toast.error('Error al sincronizar con el catálogo.');
            }
        } catch (err) {
            console.error('Sync error:', err);
            toast.error('Error de conexión al sincronizar.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!await confirm('¿Estás seguro de eliminar este color de la biblioteca oficial? Esto podría afectar a los productos que lo usen.')) return;
        
        try {
            const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Color eliminado de la biblioteca.');
                fetchColors();
            }
        } catch (err) {
            console.error('Delete error:', err);
            toast.error('No se pudo eliminar el color.');
        }
    };

    if (view === 'edit') {
        return (
            <div className="color-manager-edit-container">
                <SectionHeader 
                    title={editingColor ? "Editar Color Oficial" : "Nuevo Color de Marca"}
                    description="Define un tono exacto que será reutilizado en todo el catálogo."
                />

                <div className="color-manager-edit-card">
                    <div className="color-manager-edit-body">
                        <div>
                            <label className="color-manager-label">Nombre Identificador</label>
                            <div className="color-manager-input-wrap">
                                <Type size={18} className="color-manager-input-icon" />
                                <input 
                                    type="text" 
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Rosa Vistiendomé, Azul Marino Premium..."
                                    className="color-manager-input-text"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="color-manager-label">Valor Cromático (Hex)</label>
                            <div className="color-manager-hex-row">
                                <div className="color-manager-color-box" style={{ background: formData.hex_code }}>
                                    <input 
                                        type="color" 
                                        value={formData.hex_code}
                                        onChange={e => setFormData({ ...formData, hex_code: e.target.value })}
                                        className="color-manager-color-input"
                                    />
                                </div>
                                <div className="color-manager-input-hex-wrap">
                                    <Hash size={18} className="color-manager-input-icon" />
                                    <input 
                                        type="text" 
                                        value={formData.hex_code}
                                        onChange={e => setFormData({ ...formData, hex_code: e.target.value })}
                                        placeholder="#000000"
                                        className="color-manager-input-hex"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="color-manager-actions">
                            <Button variant="outline" onClick={() => setView('list')} style={{ flex: 1, height: '54px' }}>Cancelar</Button>
                            <Button variant="primary" onClick={handleSave} style={{ flex: 2, height: '54px' }}>
                                <Save size={20} style={{ marginRight: '8px' }} /> {editingColor ? "Guardar Cambios" : "Registrar Color"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="color-manager-layout">
            <div className="color-manager-header">
                <SectionHeader 
                    title="Maestra de Colores Oficiales"
                    description="Gestiona la biblioteca de tonos permitidos para el catálogo. Estos colores son los únicos que podrán asignarse a los productos."
                    style={{ margin: 0, padding: 0 }}
                />
                <div className="color-manager-header-actions">
                    <Button 
                        variant="outline" 
                        onClick={handleSync} 
                        disabled={loading}
                        className="color-manager-sync-btn"
                    >
                        <RotateCcw size={18} style={{ marginRight: '8px' }} className={loading ? 'animate-spin' : ''} /> 
                        Sincronizar Catálogo
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handleStartCreate}
                        className="color-manager-create-btn"
                    >
                        ＋ Registrar Color
                    </Button>
                </div>
            </div>

            <div className="color-manager-list-body">
                <DataTable 
                    columns={[
                        { 
                            key: 'swatch', 
                            label: 'Visual', 
                            width: '80px',
                            render: (_, row) => (
                                <div className="color-manager-dt-swatch" style={{ background: row.hex_code }}></div>
                            )
                        },
                        { 
                            key: 'name', 
                            label: 'Nombre del Color', 
                            render: (v) => <span className="color-manager-dt-name">{v.toUpperCase()}</span>
                        },
                        { 
                            key: 'hex_code', 
                            label: 'Código HEX', 
                            render: (v) => <code className="color-manager-dt-hex">{v.toUpperCase()}</code>
                        },
                        {
                            key: 'slug',
                            label: 'Identificador Interno',
                            render: (v) => <span className="color-manager-dt-slug">{v}</span>
                        }
                    ]}
                    data={colors}
                    isLoading={loading}
                    emptyMessage="No hay colores registrados en la biblioteca oficial."
                    rowActions={(row) => (
                        <RowActions 
                            onEdit={() => handleStartEdit(row)}
                            onDelete={() => handleDelete(row.id)}
                        />
                    )}
                />

                {colors.length > 0 && (
                    <div className="color-manager-preview-card">
                        <h4 className="color-manager-preview-title">Previsualización de Biblioteca</h4>
                        <div className="color-manager-preview-grid">
                            {colors.map(c => (
                                <div key={c.id} className="color-manager-preview-item">
                                    <div className="color-manager-preview-circle" style={{ background: c.hex_code }}></div>
                                    <span className="color-manager-preview-name">{c.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ColorManager;
