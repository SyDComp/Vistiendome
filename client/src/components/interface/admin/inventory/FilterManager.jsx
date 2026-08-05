import React, { useState, useEffect, useCallback } from 'react';
import { Filter, Layers, ListTree, RefreshCcw, Search, Eye, EyeOff } from 'lucide-react';
import { useNotification } from '../../../../context/NotificationContext';

const API_BASE = window.location.origin.includes('localhost') ? '/api/v1/admin/catalog' : '/api/v1/admin/catalog';

const FilterManager = () => {
    const { toast } = useNotification();
    const [categories, setCategories] = useState([]);
    const [attributes, setAttributes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [catRes, attrRes] = await Promise.all([
                fetch(`${API_BASE}/categories?page_size=500`),
                fetch(`${API_BASE}/attributes`)
            ]);
            
            const catData = await catRes.json();
            const attrData = await attrRes.json();
            
            setCategories(catData.items || catData || []);
            setAttributes(attrData || []);
        } catch (error) {
            console.error('Error fetching filter data:', error);
            toast.error('Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleToggleCategory = async (catId, currentValue) => {
        const newValue = !currentValue;
        // Optimistic update
        setCategories(prev => prev.map(c => c.id === catId ? { ...c, is_filterable: newValue } : c));
        
        try {
            const res = await fetch(`${API_BASE}/categories/${catId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_filterable: newValue })
            });
            if (!res.ok) throw new Error('Error al actualizar');
            toast.success('Filtro actualizado exitosamente');
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar el filtro');
            // Revert optimistic update
            setCategories(prev => prev.map(c => c.id === catId ? { ...c, is_filterable: currentValue } : c));
        }
    };

    const handleToggleAttribute = async (attrId, currentValue) => {
        const newValue = !currentValue;
        // Optimistic update
        setAttributes(prev => prev.map(a => a.id === attrId ? { ...a, is_filterable: newValue } : a));
        
        try {
            const res = await fetch(`${API_BASE}/attributes/${attrId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_filterable: newValue })
            });
            if (!res.ok) throw new Error('Error al actualizar');
            toast.success('Filtro actualizado exitosamente');
        } catch (error) {
            console.error(error);
            toast.error('Error al actualizar el filtro');
            // Revert optimistic update
            setAttributes(prev => prev.map(a => a.id === attrId ? { ...a, is_filterable: currentValue } : a));
        }
    };

    const [activeTab, setActiveTab] = useState('categories');

    const filteredCategories = categories.filter(c => 
        c.slug !== 'sin_categoria' && c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredAttributes = attributes.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="inventory-module-container" style={{ padding: '16px', maxWidth: '1000px', margin: '0 auto', boxSizing: 'border-box', width: '100%' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div style={{ flex: '1 1 auto' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <Filter size={24} style={{ color: '#8f0653', flexShrink: 0 }} />
                        Gestor de Filtros
                    </h2>
                    <p style={{ color: '#64748b', marginTop: '8px', maxWidth: '600px', fontSize: '0.875rem', lineHeight: '1.4' }}>
                        Controla qué Categorías y Características están disponibles para que los clientes filtren en la tienda pública.
                    </p>
                </div>
                <button 
                    onClick={fetchData} 
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', fontWeight: '600', cursor: 'pointer', flexShrink: 0 }}
                >
                    <RefreshCcw size={16} /> Recargar
                </button>
            </div>

            <div style={{ marginBottom: '24px', position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                    type="text" 
                    placeholder="Buscar atributo o categoría..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }}
                />
            </div>

            {/* Select de Navegación en lugar de Tabs */}
            <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>SELECCIONA QUÉ GESTIONAR</label>
                <select 
                    value={activeTab}
                    onChange={(e) => setActiveTab(e.target.value)}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '16px', color: '#1e293b', backgroundColor: '#fff', outline: 'none', cursor: 'pointer', appearance: 'auto', boxSizing: 'border-box', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                >
                    <option value="categories">Categorías ({filteredCategories.length})</option>
                    <option value="attributes">Características y Atributos ({filteredAttributes.length})</option>
                    <option value="price">Rango de Precio</option>
                </select>
            </div>

            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando datos...</div>
            ) : (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden', minHeight: '400px', boxSizing: 'border-box' }}>
                    
                    {/* Sección Categorías */}
                    {activeTab === 'categories' && (
                        <div style={{ padding: '0', maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
                            {filteredCategories.length === 0 ? (
                                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No se encontraron categorías.</div>
                            ) : (
                                <div>
                                    {filteredCategories.map(cat => (
                                        <div key={cat.id} style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', boxSizing: 'border-box' }}>
                                            <div style={{ fontWeight: '600', color: '#334155', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Ruta: {cat.slug}</div>
                                            
                                            <div style={{ marginTop: '12px' }}>
                                                <button 
                                                    onClick={() => handleToggleCategory(cat.id, cat.is_filterable)}
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                        padding: '8px 16px', borderRadius: '20px', border: 'none',
                                                        background: cat.is_filterable ? '#dcfce7' : '#f1f5f9',
                                                        color: cat.is_filterable ? '#166534' : '#64748b',
                                                        fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {cat.is_filterable ? <Eye size={16} /> : <EyeOff size={16} />}
                                                    <span>{cat.is_filterable ? 'Filtro Visible' : 'Filtro Oculto'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Sección Características */}
                    {activeTab === 'attributes' && (
                        <div style={{ padding: '0', maxHeight: 'calc(100vh - 350px)', overflowY: 'auto' }}>
                            {filteredAttributes.length === 0 ? (
                                <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8' }}>No se encontraron características.</div>
                            ) : (
                                <div>
                                    {filteredAttributes.map(attr => (
                                        <div key={attr.id} style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', boxSizing: 'border-box' }}>
                                            <div style={{ fontWeight: '600', color: '#334155', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{attr.name}</div>
                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {attr.domain?.length || 0} opciones configuradas
                                            </div>

                                            <div style={{ marginTop: '12px' }}>
                                                <button 
                                                    onClick={() => handleToggleAttribute(attr.id, attr.is_filterable)}
                                                    style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                        padding: '8px 16px', borderRadius: '20px', border: 'none',
                                                        background: attr.is_filterable ? '#dcfce7' : '#f1f5f9',
                                                        color: attr.is_filterable ? '#166534' : '#64748b',
                                                        fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {attr.is_filterable ? <Eye size={16} /> : <EyeOff size={16} />}
                                                    <span>{attr.is_filterable ? 'Filtro Visible' : 'Filtro Oculto'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Sección Precio Fixa */}
                    {activeTab === 'price' && (
                        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: '600', color: '#334155', fontSize: '15px' }}>Filtro de Precio</div>
                                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>El filtro de precio en el catálogo público está activado y siempre visible por defecto.</div>
                            </div>
                            <div style={{ padding: '6px 12px', borderRadius: '20px', background: '#dcfce7', color: '#166534', fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Eye size={16} /> Visible
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default FilterManager;
