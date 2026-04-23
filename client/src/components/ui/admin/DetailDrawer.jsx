import React, { useEffect, useState, useCallback } from 'react';
import { X, ArrowLeft, Info, Layers, List, Package, Folder, Hash, Tag, ChevronRight, Image as ImageIcon, Plus, Star, Trash2, Upload, Sparkles, FolderOpen, Palette, LayoutList } from 'lucide-react';
import Button from '../Button';
import MediaGallery from '../../interface/admin/media/MediaGallery';
import LibraryPicker from '../../interface/admin/inventory/LibraryPicker';

const API_BASE = 'http://127.0.0.1:8000/api/v1/admin/catalog';

/**
 * Skeleton Loader para secciones de DetailDrawer
 */
const SectionSkeleton = () => (
    <div style={{ marginBottom: '40px', opacity: 0.6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div className="skeleton" style={{ width: '20px', height: '20px', borderRadius: '4px' }}></div>
            <div className="skeleton" style={{ width: '120px', height: '14px', borderRadius: '4px' }}></div>
        </div>
        <div style={{ background: '#f8fafc', padding: '24px', borderRadius: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {[1, 2, 3, 4].map(i => (
                <div key={i}>
                    <div className="skeleton" style={{ width: '60px', height: '10px', marginBottom: '8px' }}></div>
                    <div className="skeleton" style={{ width: '100px', height: '14px' }}></div>
                </div>
            ))}
        </div>
    </div>
);

/**
 * DetailDrawer: Vista de detalles potente con navegación histórica (Stack-based).
 */
const DetailDrawer = ({ 
    isOpen, 
    onClose, 
    data: initialData, 
    type: initialType = 'generic',
    title: initialTitle = "Detalles del Registro",
    metadata: initialMetadata = null,
    galleryPool = [], // Pool de imágenes del producto para elegir
    onUpdate, // Callback para cuando se editan datos (ej: variantes)
    onDelete // Nuevo: Callback opcional para eliminar el registro
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showGlobalGallery, setShowGlobalGallery] = useState(false);
    const [showLibraryVarieties, setShowLibraryVarieties] = useState(false);
    
    // Estado local para edición
    const [editData, setEditData] = useState({});
    
    // Estado local para permitir navegación profunda
    const [currData, setCurrData] = useState(null);
    const [currType, setCurrType] = useState('generic');
    const [currTitle, setCurrTitle] = useState('');
    const [currMetadata, setCurrMetadata] = useState(null);
    
    // Pila de historial: [{ data, type, title, meta }]
    const [history, setHistory] = useState([]);

    // Resetear/Inicializar cuando se abre con nuevos datos desde fuera
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setCurrData(initialData);
            setEditData({
                ...initialData,
                image_urls: initialData?.image_urls || [] // Aseguramos que exista la lista
            });
            setCurrType(initialType);
            setCurrTitle(initialTitle);
            setCurrMetadata(initialMetadata);
            setHistory([]);
            setShowGlobalGallery(false);
            setTimeout(() => setIsVisible(true), 10);
        } else {
            document.body.style.overflow = 'auto';
            setIsVisible(false);
        }
    }, [isOpen, initialData, initialType, initialTitle, initialMetadata]);

    const navigateTo = async (id, targetType, targetTitle, meta = null) => {
        setLoading(true);
        // Apilar el actual
        setHistory(prev => [...prev, { data: currData, type: currType, title: currTitle, meta: currMetadata }]);
        
        try {
            // Normalizar endpoint (ej: characteristic -> attributes)
            const endpoint = targetType === 'characteristic' ? 'attributes' : 
                            targetType === 'category' ? 'categories' :
                            targetType === 'specification' ? 'specifications' : 
                            targetType === 'variant' ? 'skus' : 'products';
            
            const res = await fetch(`${API_BASE}/${endpoint}/${id}`);
            if (!res.ok) throw new Error('Error al cargar detalle');
            const data = await res.json();
            
            setCurrData(data);
            setCurrType(targetType);
            setCurrTitle(targetTitle || data.name);
            setCurrMetadata(meta);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const goBack = () => {
        if (history.length === 0) return;
        const newHistory = [...history];
        const last = newHistory.pop();
        
        setCurrData(last.data);
        setCurrType(last.type);
        setCurrTitle(last.title);
        setCurrMetadata(last.meta);
        setHistory(newHistory);
    };

    if (!isOpen) return null;

    const sections = [];

    // Lógica para estructurar secciones según el tipo actual (Deep rendering)
    if (!loading && currData) {
        if (currType === 'product') {
            sections.push({
                title: 'Información General',
                icon: <Package size={18} />,
                items: [
                    { label: 'Nombre', value: currData.name },
                    { label: 'Slug', value: currData.slug },
                    { 
                        label: 'Categoría', 
                        value: currData.category_name || currData.category?.name || '---',
                        link: currData.category_id ? { id: currData.category_id, type: 'category' } : null
                    }
                ]
            });
            if (currData.description) {
                sections.push({ title: 'Descripción', icon: <Info size={18} />, content: currData.description });
            }
            if (currData.skus && currData.skus.length > 0) {
                sections.push({
                    title: 'Variantes y Stock',
                    icon: <List size={18} />,
                    type: 'table',
                    headers: ['SKU', 'Configuración', 'Precio', 'Stock'],
                    rows: currData.skus.map(s => [
                        s.sku, 
                        Object.entries(s.config || {}).map(([k, v]) => `${k}: ${v}`).join(', ') || 'Base',
                        `$${s.price.toLocaleString()}`,
                        `${s.stock} und.`
                    ])
                });
            }
        } else if (currType === 'category') {
            sections.push({
                title: 'Configuración de Categoría',
                icon: <Folder size={18} />,
                items: [
                    { label: 'Nombre', value: currData.name },
                    { label: 'Slug', value: currData.slug },
                    { 
                        label: 'Padre', 
                        value: currData.parent_name || 'Ninguno (Raíz)',
                        link: currData.parent_id ? { id: currData.parent_id, type: 'category' } : null
                    },
                    { label: 'Productos', value: `${currData.product_count || 0} productos asociados` }
                ]
            });
            if (currData.subcategories && currData.subcategories.length > 0) {
                sections.push({
                    title: 'Subcategorías Hijas',
                    icon: <Layers size={18} />,
                    type: 'interactive-list',
                    linkedItems: currData.subcategories.map(s => ({ id: s.id, name: s.name, type: 'category' }))
                });
            }
            if (currData.suggested_specifications && currData.suggested_specifications.length > 0) {
                sections.push({
                    title: 'Especificaciones Sugeridas',
                    icon: <Layers size={18} />,
                    type: 'interactive-list',
                    linkedItems: currData.suggested_specifications.map(s => ({ id: s.id, name: s.name, type: 'specification' }))
                });
            }
        } else if (currType === 'specification') {
            sections.push({
                title: 'Maestro de Especificación',
                icon: <Layers size={18} />,
                items: [
                    { label: 'Nombre', value: currData.name }
                ]
            });
            if (currData.characteristics && currData.characteristics.length > 0) {
                sections.push({
                    title: 'Características Incluidas',
                    icon: <Hash size={18} />,
                    type: 'interactive-list',
                    linkedItems: currData.characteristics.map(c => ({ 
                        id: c.id, 
                        name: c.name, 
                        type: 'characteristic',
                        meta: { suggestedValues: c.allowed_values || [] }
                    }))
                });
            }
            if (currData.categories && currData.categories.length > 0) {
                sections.push({
                    title: 'Categorías Vinculadas',
                    icon: <Folder size={18} />,
                    type: 'interactive-list',
                    linkedItems: currData.categories.map(c => ({ id: c.id, name: c.name, type: 'category' }))
                });
            }
        } else if (currType === 'characteristic') {
            const isColor = currData.name.toLowerCase() === 'color' || currData.name.toLowerCase() === 'colores';
            sections.push({
                title: 'Detalle de Atributo',
                icon: isColor ? <Palette size={18} /> : <Hash size={18} />,
                items: [
                    { label: 'Nombre', value: currData.name.toUpperCase() },
                    { label: 'Tipo de Dato', value: isColor ? 'BIBLIOTECA DE COLORES' : 'TEXTO / VALOR' },
                    { label: 'Filtrable', value: currData.is_filterable ? 'SÍ' : 'NO' }
                ]
            });

            const suggested = currMetadata?.suggestedValues || [];
            const hasSuggestions = suggested.length > 0;
            const finalOptions = hasSuggestions 
                ? currData.domain.filter(opt => {
                    const val = typeof opt === 'string' ? opt : (opt.value || opt.name);
                    return suggested.includes(val);
                  })
                : currData.domain;

            if (finalOptions.length > 0) {
                sections.push({
                    title: hasSuggestions ? `Valores Sugeridos (${finalOptions.length})` : `Opciones en Biblioteca (${finalOptions.length})`,
                    icon: hasSuggestions ? <Sparkles size={18} /> : <LayoutList size={18} />,
                    type: 'library-grid',
                    isColor: isColor,
                    options: finalOptions
                });
            }
        } else if (currType === 'variant') {
            sections.push({
                title: 'Configuración de Versión',
                icon: <Tag size={18} />,
                items: [
                    { label: 'Código (SKU)', value: currData.sku },
                    { label: 'Combinación', value: Object.values(currData.config || {}).join(' / ') || 'Producto Base' }
                ]
            });
            
            sections.push({
                title: 'Gestión Comercial',
                icon: <Package size={18} />,
                editable: true,
                type: 'form',
                inputs: [
                    { 
                        label: 'Precio de Venta ($)', 
                        type: 'number', 
                        name: 'price', 
                        value: editData.price,
                        onChange: (e) => setEditData({...editData, price: parseFloat(e.target.value)})
                    },
                    { 
                        label: 'Stock Disponible (Unidades)', 
                        type: 'number', 
                        name: 'stock', 
                        value: editData.stock,
                        onChange: (e) => setEditData({...editData, stock: parseInt(e.target.value)})
                    }
                ]
            });

            // GESTIÓN DE IMÁGENES (Editable)
            sections.push({
                title: 'Galería de la Versión',
                icon: <ImageIcon size={18} />,
                type: 'image-manager',
                currentImages: editData.image_urls || []
            });
        }
    }

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('http://localhost:8000/api/v1/media/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                const newUrls = [...(editData.image_urls || []), data.url];
                setEditData({ ...editData, image_urls: newUrls });
            }
        } catch (err) {
            console.error("Error al subir imagen:", err);
        } finally {
            setUploading(false);
        }
    };

    const addFromGallery = (url) => {
        const current = editData.image_urls || [];
        if (!current.includes(url)) {
            setEditData({ ...editData, image_urls: [...current, url] });
        }
        setShowGlobalGallery(false);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 4000, 
            display: 'flex', justifyContent: 'flex-end',
            transition: 'all 0.4s ease'
        }}>
            <style>{`
                .skeleton {
                    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
                    background-size: 200% 100%;
                    animation: skeleton-blink 1.5s infinite linear;
                }
                @keyframes skeleton-blink {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>

            {/* Overlay */}
            <div 
                onClick={onClose}
                style={{
                    position: 'absolute', inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(8px)',
                    opacity: isVisible ? 1 : 0,
                    transition: 'opacity 0.4s ease'
                }} 
            />

            {/* Panel */}
            <div style={{
                width: '100%', maxWidth: '600px',
                height: '100%', background: '#fff',
                position: 'relative', zIndex: 4001,
                boxShadow: '-10px 0 50px rgba(0,0,0,0.15)',
                display: 'flex', flexDirection: 'column',
                transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }}>
                {/* Header */}
                <div style={{ padding: '32px 40px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {history.length > 0 && (
                            <button 
                                type="button"
                                onClick={goBack}
                                style={{ width: '36px', height: '36px', borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', color: '#1e1b4b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                            >
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <div>
                            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {loading ? 'Cargando...' : currTitle}
                            </h2>
                            <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px', fontWeight: '500' }}>
                                {history.length > 0 ? `Regresar a ${history[history.length-1].title}` : 'Ficha técnica detallada'}
                            </p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: '#f8fafc', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
                    {loading ? (
                        <>
                            <SectionSkeleton />
                            <SectionSkeleton />
                            <SectionSkeleton />
                        </>
                    ) : (
                        sections.map((section, idx) => (
                            <div key={idx} style={{ marginBottom: '40px', animation: `slideUp 0.4s ease forwards ${idx * 0.1}s`, opacity: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#8f0653' }}>
                                        {section.icon}
                                        <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{section.title}</h4>
                                    </div>

                                    {/* BOTÓN MÁGICO PARA BIBLIOTECA VISUAL (SOLO EN PRODUCTO) */}
                                    {currType === 'product' && section.title === 'Variantes y Stock' && (
                                        <button 
                                            type="button"
                                            onClick={() => setShowLibraryVarieties(true)}
                                            style={{ 
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                padding: '6px 14px', borderRadius: '12px', border: '1px solid #fee2e2',
                                                background: '#fff', color: '#8f0653', fontSize: '11px', fontWeight: '800',
                                                cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 8px rgba(143,6,83,0.05)'
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = '#8f0653'; e.currentTarget.style.color = '#fff'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#8f0653'; }}
                                        >
                                            <FolderOpen size={14} /> EXPLORADOR VISUAL
                                        </button>
                                    )}
                                </div>

                                {section.items && (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', background: '#f8fafc', padding: '24px', borderRadius: '20px' }}>
                                        {section.items.map((item, i) => (
                                            <div key={i}>
                                                <span style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</span>
                                                {item.link ? (
                                                    <button 
                                                        type="button"
                                                        onClick={() => navigateTo(item.link.id, item.link.type, item.value)}
                                                        style={{ background: 'none', border: 'none', padding: 0, fontSize: '14px', fontWeight: '700', color: '#8f0653', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                    >
                                                        {item.value} <ChevronRight size={14} />
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#1e1b4b' }}>{item.value}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {section.type === 'interactive-list' && section.linkedItems && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                        {section.linkedItems.map((item, i) => (
                                            <button 
                                                key={i} 
                                                type="button"
                                                onClick={() => navigateTo(item.id, item.type, item.name, item.meta)}
                                                style={{ background: '#fff', border: '1px solid #e2e8f0', color: '#1e1b4b', padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#8f0653'; e.currentTarget.style.color = '#8f0653'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#1e1b4b'; }}
                                            >
                                                {item.name} <ChevronRight size={12} opacity={0.5} />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {section.content && (
                                    <p style={{ fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: 0, background: '#fff', border: '1px solid #f1f5f9', padding: '20px', borderRadius: '20px' }}>
                                       {section.content}
                                    </p>
                                )}

                                {section.type === 'list' && section.pills && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {section.pills.map((pill, i) => (
                                            <span key={i} style={{ background: '#f1f5f9', color: '#475569', padding: '6px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: '700' }}>{pill}</span>
                                        ))}
                                    </div>
                                )}

                                {section.type === 'library-grid' && section.options && (
                                    <div style={{ 
                                        display: 'grid', 
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                                        gap: '12px' 
                                    }}>
                                        {section.options.map((opt, i) => {
                                            const val = typeof opt === 'string' ? opt : (opt.value || opt.name || '---');
                                            const hex = typeof opt === 'string' ? null : opt.hex_code;
                                            
                                            return (
                                                <div key={i} style={{ 
                                                    background: '#fff', 
                                                    border: '1px solid #e2e8f0', 
                                                    padding: '16px', 
                                                    borderRadius: '20px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    textAlign: 'center',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                                    transition: 'all 0.2s'
                                                }}>
                                                    {section.isColor ? (
                                                        <>
                                                            <div style={{ 
                                                                width: '44px', height: '44px', borderRadius: '50%', 
                                                                background: hex || '#cbd5e1', 
                                                                border: '3px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#64748b'
                                                            }}>
                                                                {!hex && <Palette size={14} opacity={0.5} />}
                                                            </div>
                                                            <div>
                                                                <span style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#1e1b4b', textTransform: 'uppercase' }}>{val}</span>
                                                                {hex && <code style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '0.05em' }}>{hex.toUpperCase()}</code>}
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div style={{ width: '100%' }}>
                                                            <span style={{ 
                                                                display: 'block', 
                                                                fontSize: '18px', 
                                                                fontWeight: '900', 
                                                                color: '#8f0653',
                                                                lineHeight: '1.2'
                                                            }}>
                                                                {val}
                                                            </span>
                                                            {typeof opt === 'object' && Object.entries(opt).map(([k, v]) => (
                                                                k !== 'value' && k !== 'hex_code' && k !== 'name' && v && (
                                                                    <span key={k} style={{ display: 'block', fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginTop: '4px' }}>
                                                                        {v}
                                                                    </span>
                                                                )
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {section.type === 'form' && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', background: '#fffbeb', border: '1px solid #fef3c7', padding: '24px', borderRadius: '20px' }}>
                                        {section.inputs.map((input, i) => (
                                            <div key={i}>
                                                <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#92400e', textTransform: 'uppercase', marginBottom: '8px' }}>{input.label}</label>
                                                <input 
                                                    type={input.type} 
                                                    name={input.name}
                                                    value={input.value}
                                                    onChange={input.onChange}
                                                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #fde68a', fontSize: '14px', fontWeight: '800', color: '#1e1b4b', outline: 'none', background: '#fff' }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {section.type === 'image-manager' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', background: '#f8fafc', padding: '24px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                                            {section.currentImages.map((url, i) => {
                                                const isMain = i === 0;
                                                return (
                                                    <div key={i} style={{ 
                                                        position: 'relative', 
                                                        aspectRatio: '1/1', 
                                                        borderRadius: '14px', 
                                                        overflow: 'hidden', 
                                                        border: isMain ? '2.5px solid #8f0653' : '1px solid #e2e8f0',
                                                        boxShadow: isMain ? '0 4px 12px rgba(143,6,83,0.15)' : 'none'
                                                    }}>
                                                        <img src={`http://localhost:8000${url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        
                                                        {/* Botón Eliminar */}
                                                        <button 
                                                            type="button"
                                                            onClick={() => setEditData({ ...editData, image_urls: section.currentImages.filter(u => u !== url) })}
                                                            style={{ position: 'absolute', top: '5px', right: '5px', width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
                                                        >
                                                            <Trash2 size={10} />
                                                        </button>

                                                        {/* Botón Marcar Principal (Solo si no es la principal ya) */}
                                                        {!isMain ? (
                                                            <button 
                                                                type="button"
                                                                onClick={() => {
                                                                    const others = section.currentImages.filter(u => u !== url);
                                                                    setEditData({ ...editData, image_urls: [url, ...others] });
                                                                }}
                                                                style={{ position: 'absolute', bottom: '5px', right: '5px', width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.9)', color: '#64748b', border: '1px solid #e2e8f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}
                                                                title="Hacer Principal"
                                                            >
                                                                <Star size={10} />
                                                            </button>
                                                        ) : (
                                                            <div style={{ position: 'absolute', bottom: '0', left: '0', right: '0', background: '#8f0653', color: '#fff', padding: '2px 0', textAlign: 'center', fontSize: '8px', fontWeight: '900', textTransform: 'uppercase' }}>
                                                                Principal
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* Botón para abrir Mediateca Global */}
                                            <button 
                                                type="button"
                                                onClick={() => setShowGlobalGallery(true)}
                                                style={{ aspectRatio: '1/1', borderRadius: '14px', border: '2px dashed #8f0653', background: '#fff', color: '#8f0653', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', transition: 'all 0.2s' }}
                                            >
                                                <FolderOpen size={20} />
                                                <span style={{ fontSize: '9px', fontWeight: '900' }}>GALERÍA</span>
                                            </button>

                                            {/* Botón para Carga Directa */}
                                            <label style={{ aspectRatio: '1/1', borderRadius: '14px', border: '2px dashed #cbd5e1', background: '#fff', color: '#94a3b8', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                                <input type="file" onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />
                                                {uploading ? <Sparkles size={20} className="animate-spin" /> : <Upload size={20} />}
                                                <span style={{ fontSize: '9px', fontWeight: '900' }}>SUBIR</span>
                                            </label>
                                        </div>

                                    </div>
                                )}

                                {section.type === 'table' && (
                                    <div style={{ overflowX: 'auto', background: '#fff', border: '1px solid #f1f5f9', borderRadius: '20px' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    {section.headers.map((h, i) => <th key={i} style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', fontSize: '10px' }}>{h}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {section.rows.map((row, i) => (
                                                    <tr key={i} style={{ borderBottom: i === section.rows.length - 1 ? 'none' : '1px solid #f8fafc' }}>
                                                        {row.map((cell, j) => <td key={j} style={{ padding: '12px 16px', color: '#1e1b4b', fontWeight: '600' }}>{cell}</td>)}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div style={{ padding: '24px 40px', borderTop: '1px solid #f1f5f9', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '16px', alignItems: 'center' }}>
                    {currType === 'variant' && onDelete && (
                        <Button 
                            variant="outline" 
                            type="button"
                            onClick={() => {
                                if (window.confirm("¿Estás seguro de que deseas eliminar esta versión permanentemente?")) {
                                    onDelete(currData);
                                    onClose();
                                }
                            }}
                            style={{ height: '48px', padding: '0 24px', borderRadius: '16px', color: '#ef4444', borderColor: '#fee2e2' }}
                        >
                            Eliminar Versión
                        </Button>
                    )}
                    <div style={{ flex: 1 }} />
                    <Button variant="outline" type="button" onClick={onClose} style={{ height: '48px', padding: '0 24px', borderRadius: '16px' }}>Cerrar</Button>
                    {currType === 'variant' && onUpdate && (
                        <Button 
                            onClick={() => {
                                onUpdate(editData);
                                onClose();
                            }} 
                            type="button"
                            variant="primary" 
                            style={{ height: '48px', padding: '0 32px', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(143, 6, 83, 0.2)' }}
                        >
                            Guardar Cambios
                        </Button>
                    )}
                </div>
            </div>

            {/* MODAL DE MEDIATECA GLOBAL - FUERA DEL CONTENEDOR TRANSFORMARLE */}
            {showGlobalGallery && (
                <div style={{ 
                    position: 'fixed', inset: 0, 
                    background: 'rgba(15, 23, 42, 0.7)', 
                    backdropFilter: 'blur(12px) saturate(180%)', 
                    zIndex: 9999, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    padding: '24px',
                    animation: 'fadeIn_drawer 0.3s ease-out'
                }}>
                    <div style={{ 
                        width: '95%', maxWidth: '1200px', 
                        height: '90vh', 
                        background: 'rgba(255, 255, 255, 0.98)',
                        borderRadius: '32px', 
                        padding: '40px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        boxShadow: '0 40px 100px -20px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        animation: 'modalOpen_drawer 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <FolderOpen size={28} color="#8f0653" /> Mediateca Global
                                </h3>
                                <p style={{ margin: '6px 0 0 0', fontSize: '14px', color: '#64748b', fontWeight: '500' }}>Elige la foto perfecta para esta versión. Puedes seleccionar de cualquier carpeta.</p>
                            </div>
                            <button 
                                type="button" 
                                onClick={() => setShowGlobalGallery(false)}
                                style={{ width: '48px', height: '48px', borderRadius: '50%', border: 'none', background: '#f1f5f9', color: '#1e1b4b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                                onMouseOver={(e) => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#1e1b4b'; }}
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div style={{ flex: 1, minHeight: 0, marginTop: '8px' }}>
                            <MediaGallery 
                                selectionMode 
                                allowMultiple={true}
                                initialSelected={editData.image_urls || []}
                                onSelect={(data) => {
                                    const urls = Array.isArray(data) ? data : [data];
                                    const current = editData.image_urls || [];
                                    // Mecla sin duplicados
                                    const next = [...new Set([...current, ...urls])];
                                    setEditData({ ...editData, image_urls: next });
                                    setShowGlobalGallery(false);
                                }} 
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE EXPLORADOR VISUAL DE VARIANTES */}
            {showLibraryVarieties && currType === 'product' && (
                <LibraryPicker 
                    isOpen={showLibraryVarieties}
                    onClose={() => setShowLibraryVarieties(false)}
                    items={(currData.skus || []).map(s => ({
                        ...s,
                        name: s.sku,
                        image: s.image_urls?.[0] || null
                    }))}
                    type="variants"
                    title={`Explorar Línea: ${currData.name}`}
                    description="Visualización inmersiva de combinaciones disponibles, precios y stock en tiempo real."
                    onItemClick={(v) => {
                        setShowLibraryVarieties(false);
                        navigateTo(v.id, 'variant', v.sku);
                    }}
                />
            )}

            <style>{`
                @keyframes fadeIn_drawer { from { opacity: 0; } to { opacity: 1; } }
                @keyframes modalOpen_drawer { 
                    from { transform: scale(0.95) translateY(20px); opacity: 0; } 
                    to { transform: scale(1) translateY(0); opacity: 1; } 
                }
            `}</style>
        </div>
    );
};

export default DetailDrawer;
