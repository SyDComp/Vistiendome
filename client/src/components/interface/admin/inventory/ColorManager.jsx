import React, { useState, useEffect, useCallback } from 'react';
import SectionHeader from '../../../ui/admin/SectionHeader';
import DataTable from '../../../ui/admin/DataTable';
import RowActions from '../../../ui/admin/RowActions';
import Button from '../../../ui/Button';
import { useNotification } from '../../../../context/NotificationContext';
import { Palette, Plus, Save, Hash, Type, Trash2, Edit2, RotateCcw } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000/api/v1/admin/catalog/colors';

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
            const res = await fetch('http://127.0.0.1:8000/api/v1/admin/catalog/colors/sync', { method: 'POST' });
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
            <div style={{ maxWidth: '600px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
                <SectionHeader 
                    title={editingColor ? "Editar Color Oficial" : "Nuevo Color de Marca"}
                    description="Define un tono exacto que será reutilizado en todo el catálogo."
                />

                <div style={{ background: '#fff', padding: '40px', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#8f0653', textTransform: 'uppercase', marginBottom: '8px' }}>Nombre Identificador</label>
                            <div style={{ position: 'relative' }}>
                                <Type size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                <input 
                                    type="text" 
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Rosa Vistiéndome, Azul Marino Premium..."
                                    style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px', border: '2px solid #f1f5f9', outline: 'none', fontWeight: '700', fontSize: '15px' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#8f0653', textTransform: 'uppercase', marginBottom: '8px' }}>Valor Cromático (Hex)</label>
                            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <div style={{ width: '64px', height: '64px', borderRadius: '16px', border: '3px solid #fff', boxShadow: '0 0 0 1px #e2e8f0', background: formData.hex_code, position: 'relative', overflow: 'hidden' }}>
                                    <input 
                                        type="color" 
                                        value={formData.hex_code}
                                        onChange={e => setFormData({ ...formData, hex_code: e.target.value })}
                                        style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', cursor: 'pointer', border: 'none' }}
                                    />
                                </div>
                                <div style={{ flex: 1, position: 'relative' }}>
                                    <Hash size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input 
                                        type="text" 
                                        value={formData.hex_code}
                                        onChange={e => setFormData({ ...formData, hex_code: e.target.value })}
                                        placeholder="#000000"
                                        style={{ width: '100%', padding: '16px 16px 16px 48px', borderRadius: '16px', border: '2px solid #f1f5f9', outline: 'none', fontWeight: '800', color: '#1e1b4b', fontFamily: 'monospace' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <SectionHeader 
                    title="Maestra de Colores Oficiales"
                    description="Gestiona la biblioteca de tonos permitidos para el catálogo. Estos colores son los únicos que podrán asignarse a los productos."
                    style={{ margin: 0, padding: 0 }}
                />
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Button 
                        variant="outline" 
                        onClick={handleSync} 
                        disabled={loading}
                        style={{ height: '48px', padding: '0 20px', borderRadius: '14px', borderColor: '#e2e8f0' }}
                    >
                        <RotateCcw size={18} style={{ marginRight: '8px' }} className={loading ? 'animate-spin' : ''} /> 
                        Sincronizar Catálogo
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handleStartCreate}
                        style={{ height: '48px', padding: '0 24px', borderRadius: '14px', boxShadow: '0 4px 12px rgba(143, 6, 83, 0.2)' }}
                    >
                        ＋ Registrar Color
                    </Button>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '40px' }}>
                <DataTable 
                    columns={[
                        { 
                            key: 'swatch', 
                            label: 'Visual', 
                            width: '80px',
                            render: (_, row) => (
                                <div style={{ 
                                    width: '32px', height: '32px', borderRadius: '10px', background: row.hex_code, 
                                    border: '2px solid #fff', boxShadow: '0 0 0 1px #e2e8f0' 
                                }}></div>
                            )
                        },
                        { 
                            key: 'name', 
                            label: 'Nombre del Color', 
                            render: (v) => <span style={{ fontWeight: '800', color: '#1e1b4b', letterSpacing: '-0.3px' }}>{v.toUpperCase()}</span>
                        },
                        { 
                            key: 'hex_code', 
                            label: 'Código HEX', 
                            render: (v) => <code style={{ background: '#f8fafc', padding: '4px 10px', borderRadius: '8px', color: '#64748b', fontWeight: '800', fontSize: '13px' }}>{v.toUpperCase()}</code>
                        },
                        {
                            key: 'slug',
                            label: 'Identificador Interno',
                            render: (v) => <span style={{ color: '#94a3b8', fontSize: '12px' }}>{v}</span>
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
                    <div style={{ marginTop: '32px', padding: '32px', background: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 16px', fontSize: '13px', fontWeight: '900', color: '#8f0653', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Previsualización de Biblioteca</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '12px' }}>
                            {colors.map(c => (
                                <div key={c.id} style={{ background: '#fff', padding: '12px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: c.hex_code, border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}></div>
                                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#1e1b4b', textTransform: 'uppercase' }}>{c.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default ColorManager;
