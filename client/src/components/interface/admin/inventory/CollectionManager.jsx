import React, { useState, useEffect, useCallback } from 'react';
import SectionHeader from '../../../ui/admin/SectionHeader';
import DataTable from '../../../ui/admin/DataTable';
import RowActions from '../../../ui/admin/RowActions';
import Button from '../../../ui/Button';
import Input from '../../../ui/Input';
import { useNotification } from '../../../../context/NotificationContext';
import LibraryPicker from './LibraryPicker';
import MediaGallery from '../media/MediaGallery';
import DetailDrawer from '../../../ui/admin/DetailDrawer';
import Accordion from '../../../ui/Accordion';
import FilterBar from '../../../ui/admin/FilterBar';
import { Save, ArrowLeft, Layers, Plus, Trash2, Search, Settings2, Folder, X, ChevronRight, Hash, Sparkles, Check, Package, Image as ImageIcon, Eye } from 'lucide-react';
import { getImageUrl } from '../../../../services/api';
import QuickPeek from '../../../ui/admin/QuickPeek';

const API_BASE = `${(window.location.origin.includes('localhost') ? 'http://localhost:8000' : '')}/api/v1/admin/catalog`;

const CollectionManager = () => {
    const { toast, confirm } = useNotification();
    const [collections, setCollections] = useState([]);
    const [allSkus, setAllSkus] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [showDetail, setShowDetail] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [showPeek, setShowPeek] = useState(false);
    const [peekData, setPeekData] = useState(null);
    
    // Form State
    const [editingCollection, setEditingCollection] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        image_url: '',
        is_active: true,
        sku_ids: []
    });

    const [showSkuLibrary, setShowSkuLibrary] = useState(false);
    const [showCoverGallery, setShowCoverGallery] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [collRes, skuRes] = await Promise.all([
                fetch(`${API_BASE}/collections`),
                fetch(`${API_BASE}/skus?page_size=1000`)
            ]);
            const colls = await collRes.json();
            const skus = await skuRes.json();
            setCollections(colls || []);
            setAllSkus(skus.items || []);
        } catch (err) {
            console.error(err);
            toast.error('Error al cargar datos de colecciones');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const handleEdit = async (coll) => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/collections/${coll.id}`);
            const fullData = await res.json();
            setEditingCollection(fullData);
            setFormData({
                name: fullData.name,
                description: fullData.description || '',
                image_url: fullData.image_url || '',
                is_active: fullData.is_active,
                sku_ids: (fullData.skus || []).map(s => s.id)
            });
            setShowForm(true);
        } catch (err) {
            toast.error("Error al cargar la colección");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name) return toast.error('Debes ponerle un nombre a la colección');
        if (formData.sku_ids.length === 0) return toast.error('Añade al menos una variante');

        try {
            const isEdit = !!editingCollection;
            const url = isEdit ? `${API_BASE}/collections/${editingCollection.id}` : `${API_BASE}/collections`;
            const method = isEdit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(isEdit ? 'Colección actualizada' : 'Colección creada');
                setShowForm(false);
                fetchAll();
            } else {
                toast.error('Error al guardar la colección');
            }
        } catch (err) {
            toast.error('Error de red');
        }
    };

    const handleDelete = async (id) => {
        if (!await confirm('¿Estás seguro de que quieres eliminar esta colección? No afectará a los productos reales.')) return;
        try {
            const res = await fetch(`${API_BASE}/collections/${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Colección eliminada');
                fetchAll();
            }
        } catch (err) {
            toast.error('Error al eliminar');
        }
    };

    const addSkusFromLibrary = (selected) => {
        setFormData(prev => ({
            ...prev,
            sku_ids: selected.map(s => s.id)
        }));
    };

    const removeSku = (id) => {
        setFormData(prev => ({
            ...prev,
            sku_ids: prev.sku_ids.filter(sid => sid !== id)
        }));
    };

    const filteredCollections = collections.filter(coll => 
        coll.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (coll.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleViewDetail = async (coll) => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/collections/${coll.id}`);
            const data = await res.json();
            setDetailData(data);
            setShowDetail(true);
        } catch (err) {
            toast.error("No se pudo cargar el detalle.");
        } finally {
            setLoading(false);
        }
    };

    const handleQuickPeek = (row) => {
        setPeekData(row);
        setShowPeek(true);
    };

    if (showForm) {
        const selectedSkus = allSkus.filter(s => formData.sku_ids.includes(s.id));

        return (
            <div className="coll-manager-form-container">
                <div className="coll-manager-form-header">
                    <div className="coll-manager-form-header-left">
                        <button onClick={() => setShowForm(false)} className="coll-manager-back-btn">
                            <ArrowLeft size={20} />
                        </button>
                        <h2 className="coll-manager-form-title">
                            {editingCollection ? 'Editar Colección' : 'Nueva Colección'}
                        </h2>
                    </div>
                    <div className="coll-manager-form-header-right">
                        <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
                        <Button variant="primary" onClick={handleSave} style={{ padding: '0 24px' }}>
                            <Save size={18} style={{ marginRight: '8px' }} /> Guardar Colección
                        </Button>
                    </div>
                </div>

                <div className="coll-manager-form-body">
                    <div className="coll-manager-main-card">
                        <div className="coll-manager-card-layout">
                            {/* Portada de Colección */}
                            <div className="coll-manager-cover-col">
                                <label className="coll-manager-label-upper">Portada de Colección</label>
                                <div 
                                    onClick={() => setShowCoverGallery(true)}
                                    className="coll-manager-cover-box"
                                >
                                    {formData.image_url ? (
                                        <img src={`${(window.location.origin.includes('localhost') ? 'http://localhost:8000' : '')}${formData.image_url}`} className="coll-manager-cover-img" />
                                    ) : (
                                        <div className="coll-manager-cover-placeholder">
                                            <ImageIcon size={48} color="#cbd5e1" />
                                            <p className="coll-manager-cover-placeholder-text">ELEGIR DE GALERÍA</p>
                                        </div>
                                    )}
                                </div>
                                
                                {selectedSkus.length > 0 && (
                                    <div className="coll-manager-rec-wrapper">
                                        <label className="coll-manager-rec-label">Recomendadas</label>
                                        <div className="coll-manager-rec-grid">
                                            {(() => {
                                                // Filtrar para mostrar imágenes ÚNICAS (basado en la URL)
                                                const uniqueImages = [];
                                                const seenUrls = new Set();
                                                
                                                for (const sku of selectedSkus) {
                                                    const url = sku.image || sku.image_url;
                                                    if (url && !seenUrls.has(url)) {
                                                        uniqueImages.push(sku);
                                                        seenUrls.add(url);
                                                    }
                                                    if (uniqueImages.length >= 6) break; // Mostramos hasta 6 opciones variadas
                                                }
                                                
                                                return uniqueImages.map((sku, i) => (
                                                    <button 
                                                        key={i}
                                                        onClick={() => setFormData(p => ({ ...p, image_url: sku.image || sku.image_url }))}
                                                        className="coll-manager-rec-btn"
                                                        style={{ border: formData.image_url === (sku.image || sku.image_url) ? '2px solid #8f0653' : '1px solid #e2e8f0', opacity: formData.image_url === (sku.image || sku.image_url) ? 1 : 0.7 }}
                                                    >
                                                        <img src={`${(window.location.origin.includes('localhost') ? 'http://localhost:8000' : '')}${sku.image || sku.image_url}`} className="coll-manager-cover-img" />
                                                    </button>
                                                ));
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="coll-manager-inputs-col">
                                <div className="coll-manager-input-header">
                                    <label className="coll-manager-label-upper" style={{ marginBottom: 0 }}>Nombre de la Colección</label>
                                    <div className="coll-manager-toggle-wrap" onClick={() => setFormData(p => ({ ...p, is_active: !p.is_active }))}>
                                        <span className="coll-manager-toggle-text" style={{ color: formData.is_active ? '#16a34a' : '#ef4444' }}>{formData.is_active ? 'COLECCIÓN ACTIVA' : 'COLECCIÓN INACTIVA'}</span>
                                        <div className="coll-manager-toggle-track" style={{ background: formData.is_active ? '#16a34a' : '#cbd5e1' }}>
                                            <div className="coll-manager-toggle-thumb" style={{ left: formData.is_active ? '18px' : '2px' }} />
                                        </div>
                                    </div>
                                </div>
                                <input 
                                    value={formData.name}
                                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                    placeholder="Ej: Temporada Invierno 2024..."
                                    className="coll-manager-input-name"
                                />

                                <label className="coll-manager-label-upper-gray">Descripción</label>
                                <textarea 
                                    value={formData.description}
                                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                                    placeholder="Cuéntanos de qué trata esta colección..."
                                    className="coll-manager-textarea-desc"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="coll-manager-skus-card">
                        <div className="coll-manager-skus-header">
                            <h4 className="coll-manager-skus-title">Variantes en la Colección</h4>
                            <span className="coll-manager-skus-count">{formData.sku_ids.length} SELECCIONADAS</span>
                        </div>

                        <div className="coll-manager-skus-body">
                            <div className="coll-manager-skus-grid">
                                {selectedSkus.map(sku => (
                                    <div key={sku.id} className="coll-manager-sku-item">
                                        <div className="coll-manager-sku-img-box">
                                            {sku.image_url ? (
                                                <img src={`${(window.location.origin.includes('localhost') ? 'http://localhost:8000' : '')}${sku.image_url}`} className="coll-manager-cover-img" />
                                            ) : <Package size={24} color="#cbd5e1" style={{ margin: '12px' }} />}
                                        </div>
                                        <div className="coll-manager-sku-info">
                                            <div className="coll-manager-sku-code">{sku.sku}</div>
                                            <div className="coll-manager-sku-name">{sku.product_name}</div>
                                        </div>
                                        <button onClick={() => removeSku(sku.id)} className="coll-manager-sku-del-btn">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                {formData.sku_ids.length === 0 && (
                                    <div className="coll-manager-skus-empty">
                                        No hay variantes seleccionadas aún.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="coll-manager-skus-footer">
                            <button 
                                type="button" 
                                onClick={() => setShowSkuLibrary(true)}
                                className="coll-manager-skus-add-btn"
                            >
                                <Plus size={18} /> Gestionar Variantes desde la Biblioteca
                            </button>
                        </div>
                    </div>
                </div>

                <LibraryPicker 
                    isOpen={showSkuLibrary}
                    onClose={() => setShowSkuLibrary(false)}
                    items={allSkus}
                    initialSelectedIds={formData.sku_ids}
                    onSelect={addSkusFromLibrary}
                    title="Seleccionar Variantes"
                    description="Elige los SKUs que formarán parte de esta colección específica."
                    type="variants"
                    labelSingular="variante"
                    labelPlural="variantes"
                    allowMultiple={true}
                />

                <MediaGallery 
                    isOpen={showCoverGallery}
                    onClose={() => setShowCoverGallery(false)}
                    selectionMode={true}
                    allowMultiple={false}
                    onSelect={(data) => {
                        const asset = Array.isArray(data) ? data[0] : data;
                        if (asset) {
                            setFormData(p => ({ ...p, image_url: asset.url }));
                            setShowCoverGallery(false);
                        }
                    }}
                />
            </div>
        );
    }

    return (
        <div className="coll-manager-layout">
            <SectionHeader 
                title="Curaduría de Colecciones"
                description="Crea grupos independientes de productos para campañas, temporadas o secciones especiales."
                action={{ 
                    label: '＋ Nueva Colección', 
                    onClick: () => { setEditingCollection(null); setFormData({ name: '', description: '', image_url: '', is_active: true, sku_ids: [] }); setShowForm(true); } 
                }}
            />

            <FilterBar 
                searchPlaceholder="Buscar colecciones..."
                onSearchChange={setSearchTerm}
                activeFilters={{}}
                onFilterChange={() => {}}
                filters={[]}
            />

            <DataTable 
                columns={[
                    { 
                        key: 'name', 
                        label: 'Colección', 
                        render: (v, row, { onPeek }) => (
                            <div className="coll-manager-dt-img-wrap">
                                <div 
                                    className="coll-manager-dt-img-box"
                                    onClick={(e) => { e.stopPropagation(); onPeek(row); }}
                                >
                                    {row.image_url ? (
                                        <img 
                                            src={getImageUrl(row.image_url)} 
                                            className="coll-manager-dt-img"
                                        />
                                    ) : (
                                        <ImageIcon size={22} style={{ margin: '13px', color: '#94a3b8' }} />
                                    )}
                                </div>
                                <span className="coll-manager-dt-name">{v}</span>
                            </div>
                        )
                    },
                    { 
                        key: 'slug', 
                        label: 'Identificador', 
                        render: (v) => <span className="coll-manager-dt-slug">{v}</span>
                    },
                    {
                        key: 'is_active',
                        label: 'Estado',
                        render: (v) => (
                            <span className={`coll-manager-dt-status ${v ? 'active' : 'inactive'}`}>
                                {v ? 'ACTIVA' : 'INACTIVA'}
                            </span>
                        )
                    }
                ]}
                data={filteredCollections}
                isLoading={loading}
                emptyMessage="No se encontraron colecciones."
                context={{ onPeek: handleQuickPeek }}
                rowActions={(row) => (
                    <RowActions 
                        customButtons={[
                            { icon: <Eye size={16} />, onClick: () => handleQuickPeek(row), title: 'Vistazo Rápido', variant: 'secondary' }
                        ]}
                        onView={() => handleViewDetail(row)}
                        onEdit={() => handleEdit(row)}
                        onDelete={() => handleDelete(row.id)}
                    />
                )}
            />

            <QuickPeek 
                isOpen={showPeek}
                onClose={() => setShowPeek(false)}
                data={peekData}
                type="collection"
            />

            <DetailDrawer 
                isOpen={showDetail}
                onClose={() => setShowDetail(false)}
                data={detailData}
                type="collection"
                title={detailData?.name}
            />
        </div>
    );
};

export default CollectionManager;
