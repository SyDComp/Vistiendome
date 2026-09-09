import React, { useState, useEffect, useCallback } from 'react';
import { Filter, Layers, ListTree, RefreshCcw, Search, Eye, EyeOff } from 'lucide-react';
import { useNotification } from '../../../../context/NotificationContext';
import './FilterManager.css';

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
        <div className="fm">
            <div className="fm-cabecera">
                <div className="fm-cabecera-texto">
                    <h2 className="fm-titulo">
                        <Filter size={24} className="fm-titulo-icono" />
                        Gestor de Filtros
                    </h2>
                    <p className="fm-explicacion">
                        Controla qué Categorías y Características están disponibles para que los clientes filtren en la tienda pública.
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="fm-recargar"
                >
                    <RefreshCcw size={16} /> Recargar
                </button>
            </div>

            <div className="fm-buscador">
                <Search size={18} className="fm-buscador-icono" />
                <input
                    type="text"
                    placeholder="Buscar atributo o categoría..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}

                />
            </div>

            {/* Select de Navegación en lugar de Tabs */}
            <div className="fm-eleccion">
                <label>SELECCIONA QUÉ GESTIONAR</label>
                <select
                    value={activeTab}
                    onChange={(e) => setActiveTab(e.target.value)}

                >
                    <option value="categories">Categorías ({filteredCategories.length})</option>
                    <option value="attributes">Características y Atributos ({filteredAttributes.length})</option>
                    <option value="price">Rango de Precio</option>
                </select>
            </div>

            {loading ? (
                <div className="fm-cargando">Cargando datos...</div>
            ) : (
                <div className="fm-lista">

                    {/* Sección Categorías */}
                    {activeTab === 'categories' && (
                        <div className="fm-lista-scroll">
                            {filteredCategories.length === 0 ? (
                                <div className="fm-vacio">No se encontraron categorías.</div>
                            ) : (
                                <div>
                                    {filteredCategories.map(cat => (
                                        <div key={cat.id} className="fm-fila">
                                            <div className="fm-fila-nombre">{cat.name}</div>
                                            <div className="fm-fila-detalle">Ruta: {cat.slug}</div>

                                            <div className="fm-fila-accion">
                                                <button
                                                    onClick={() => handleToggleCategory(cat.id, cat.is_filterable)}
                                                    className={`adm-interruptor${cat.is_filterable ? ' adm-interruptor--si' : ''}`}
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
                        <div className="fm-lista-scroll">
                            {filteredAttributes.length === 0 ? (
                                <div className="fm-vacio">No se encontraron características.</div>
                            ) : (
                                <div>
                                    {filteredAttributes.map(attr => (
                                        <div key={attr.id} className="fm-fila">
                                            <div className="fm-fila-nombre">{attr.name}</div>
                                            <div className="fm-fila-detalle">
                                                {attr.domain?.length || 0} opciones configuradas
                                            </div>

                                            <div className="fm-fila-accion">
                                                <button
                                                    onClick={() => handleToggleAttribute(attr.id, attr.is_filterable)}
                                                    className={`adm-interruptor${attr.is_filterable ? ' adm-interruptor--si' : ''}`}
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
                        <div className="fm-precio">
                            <div>
                                <div className="fm-precio-nombre">Filtro de Precio</div>
                                <div className="fm-precio-detalle">El filtro de precio en el catálogo público está activado y siempre visible por defecto.</div>
                            </div>
                            <div className="fm-precio-estado">
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
