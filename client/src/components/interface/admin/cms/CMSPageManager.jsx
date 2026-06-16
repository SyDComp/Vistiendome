import React, { useState, useEffect, useCallback } from 'react';
import { 
    Plus, 
    GripVertical, 
    Edit2, 
    Trash2, 
    Eye, 
    EyeOff, 
    Sparkles, 
    Layout, 
    Type, 
    Image as ImageIcon, 
    Layers,
    Save,
    RefreshCw,
    Table as TableIcon,
    ShoppingBag,
    ChevronUp,
    ChevronDown,
    ArrowUpDown
} from 'lucide-react';
import DetailDrawer from '../../../ui/admin/DetailDrawer';
import StudioEditor from '../../../ui/admin/cms/studio/StudioEditor';
import DataTableStudio from '../../../ui/admin/cms/studio/DataTableStudio';
import TextStudio from '../../../ui/admin/cms/studio/TextStudio';
import Button from '../../../ui/Button';
import ConfirmModal from '../../../ui/ConfirmModal';
import CMSRenderer from '../../cms/CMSRenderer';
import { Smartphone, Monitor } from 'lucide-react';

const API_BASE = `${(window.location.origin.includes('localhost') ? 'http://127.0.0.1:8000' : '')}/api/v1/homepage/admin`;

const CMSPageManager = ({ 
    page = 'homepage', 
    title = 'Gestor de Contenido', 
    subtitle = 'Configura el orden y contenido de esta sección.' 
}) => {
    // Detectar pantalla pequeña para apilar los paneles
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    const isMobileScreen = windowWidth < 1050;

    const [sections, setSections] = useState([]);
    const [originalSections, setOriginalSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSection, setSelectedSection] = useState(null);
    const [isDrawerOpen,  setIsDrawerOpen]  = useState(false);
    const [isStudioOpen,  setIsStudioOpen]  = useState(false);
    const [isTableOpen,   setIsTableOpen]   = useState(false);
    const [isTextOpen,    setIsTextOpen]    = useState(false);
    const [isSaving,      setIsSaving]      = useState(false);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [editingTitleId, setEditingTitleId] = useState(null);
    const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' o 'mobile'
    const [hoveredSectionId, setHoveredSectionId] = useState(null);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isReordering, setIsReordering] = useState(false);


    const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'danger' });

    const hasChanges = JSON.stringify(sections) !== JSON.stringify(originalSections);

    const fetchSections = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}?page=${page}`);
            const data = await res.json();
            setSections(data);
            setOriginalSections(data);
        } catch (err) {
            console.error("Error al cargar secciones:", err);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchSections();
    }, [fetchSections]);

    const handleToggleActive = (section) => {
        setSections(sections.map(s => 
            s.id === section.id ? { ...s, is_active: !s.is_active } : s
        ));
    };

    const handleDelete = (id) => {
        setConfirmModal({
            isOpen: true,
            title: "¿Quitar sección?",
            message: "Esta sección se eliminará de tu lista de borradores. Si ya estaba guardada, se borrará permanentemente al pulsar 'Guardar Cambios'.",
            variant: "danger",
            confirmText: "Quitar",
            onConfirm: () => {
                setSections(sections.filter(s => s.id !== id));
            }
        });
    };

    const handleCreate = (type) => {
        const titleMap = {
            'recent_products':      'Feed de Productos',
            'product_carousel':     'Carrusel de Productos',
        };

        const newBlock = {
            id: `temp_${Date.now()}`,
            page,
            type,
            title: titleMap[type] || 'Nueva Sección',
            config: type === 'data_table' ? { headers: ['Columna 1'], rows: [{ 'Columna 1': '' }] } : {},
            is_active: true,
            order: sections.length
        };

        setSections([...sections, newBlock]);
    };

    const handleUpdate = (data) => {
        setSections(sections.map(s => s.id === data.id ? data : s));
        setIsDrawerOpen(false);
        setIsStudioOpen(false);
        setIsTableOpen(false);
        setIsTextOpen(false);
    };

    const handleDiscard = () => {
        setConfirmModal({
            isOpen: true,
            title: "¿Descartar cambios?",
            message: "Se perderán todas las modificaciones.",
            variant: "warning",
            confirmText: "Descartar todo",
            onConfirm: () => {
                setSections(originalSections);
            }
        });
    };

    const handleBulkSave = async () => {
        setIsSaving(true);
        try {
            // 1. Identificar eliminaciones
            const currentIds = sections.filter(s => typeof s.id === 'number').map(s => s.id);
            const deletedIds = originalSections.filter(s => !currentIds.includes(s.id)).map(s => s.id);
            
            for (const id of deletedIds) {
                await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
            }

            // 2. Crear nuevos y actualizar existentes
            const finalSections = [];
            for (const section of sections) {
                if (typeof section.id === 'string' && section.id.startsWith('temp_')) {
                    const { id, ...createData } = section;
                    const res = await fetch(`${API_BASE}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(createData)
                    });
                    const created = await res.json();
                    finalSections.push(created);
                } else {
                    await fetch(`${API_BASE}/${section.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(section)
                    });
                    finalSections.push(section);
                }
            }

            // 3. Reordenar
            await fetch(`${API_BASE}/reorder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section_ids: finalSections.map(s => s.id) })
            });

            fetchSections();
        } catch (err) {
            console.error("Error al guardar:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleMove = (index, direction) => {
        const newSections = [...sections];
        const targetIndex = index + direction;
        if (targetIndex < 0 || targetIndex >= newSections.length) return;
        
        const temp = newSections[index];
        newSections[index] = newSections[targetIndex];
        newSections[targetIndex] = temp;
        
        setSections(newSections);
    };

    const getIcon = (type) => {
        switch(type) {
            case 'hero': 
            case 'banner': return <Sparkles size={18} />;
            case 'composition_carousel': return <Layers size={18} />;
            case 'text_post': return <Type size={18} />;
            case 'data_table': return <TableIcon size={18} />;
            case 'recent_products':
            case 'product_carousel': return <ShoppingBag size={18} />;
            default: return <Layout size={18} />;
        }
    };

    return (
        <div style={{ flex: 1, minHeight: 0, height: '100%', display: 'flex', flexDirection: 'column', gap: '24px', overflow: 'hidden', padding: isMobileScreen ? '10px 0' : '0', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <div style={{ display: 'flex', flexDirection: isMobileScreen ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobileScreen ? 'center' : 'center', gap: '16px', padding: isMobileScreen ? '0 16px' : '0', textAlign: isMobileScreen ? 'center' : 'left' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: isMobileScreen ? '22px' : '28px', fontWeight: '900', color: '#1e1b4b', fontFamily: 'Inter, system-ui, sans-serif' }}>{title}</h1>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>{subtitle}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', width: isMobileScreen ? '100%' : 'auto', justifyContent: isMobileScreen ? 'space-between' : 'flex-end' }}>
                    {hasChanges && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Button onClick={handleDiscard} variant="outline" disabled={isSaving}>Descartar</Button>
                            <Button onClick={handleBulkSave} variant="primary" disabled={isSaving} style={{ background: '#059669' }}>
                                {isSaving ? 'Guardando...' : <><Save size={18} /> Guardar</>}
                            </Button>
                        </div>
                    )}
                    <Button 
                        variant={isReordering ? "primary" : "outline"} 
                        onClick={() => setIsReordering(!isReordering)}
                        style={{ height: '48px', padding: '0 20px', borderRadius: '14px', gap: '8px', background: isReordering ? '#fdf2f8' : '#fff', color: isReordering ? '#8f0653' : '#64748b', borderColor: isReordering ? '#8f0653' : '#e2e8f0' }}
                    >
                        <ArrowUpDown size={18} /> {isReordering ? 'Hecho' : 'Mover'}
                    </Button>
                    <div className="dropdown" style={{ position: 'relative', flex: isMobileScreen ? 1 : 'none' }}>
                        <Button variant="primary" style={{ height: 'auto', minHeight: '48px', padding: '12px 16px', borderRadius: '14px', gap: '8px', width: '100%', display: 'flex', flexWrap: 'wrap', justifyContent: 'center' }}>
                            <Plus size={18} /> Añadir Bloque
                        </Button>
                        <div className="dropdown-content">
                            <button onClick={() => handleCreate('hero')}><Sparkles size={14} /> Banner Visual</button>
                            <button onClick={() => handleCreate('composition_carousel')}><Layers size={14} /> Carrusel Visual</button>
                            <button onClick={() => handleCreate('text_post')}><Type size={14} /> Bloque de Texto</button>
                            <button onClick={() => handleCreate('data_table')}><TableIcon size={14} /> Tabla de Datos</button>
                            <button onClick={() => handleCreate('product_carousel')}><ShoppingBag size={14} /> Carrusel de Productos</button>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ 
                flex: 1, 
                display: 'grid', 
                gridTemplateColumns: isMobileScreen ? '1fr' : '420px 1fr', 
                gap: isMobileScreen ? '0' : '32px', 
                overflow: 'hidden',
                minHeight: 0 // Importante para que el scroll interno funcione en flex/grid
            }}>
                {/* Lado Izquierdo: Lista de Bloques */}
                <div style={{ 
                    overflowY: 'auto', 
                    padding: isMobileScreen ? '0 16px 100px 16px' : '0 10px 10px 0', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px',
                    minHeight: 0
                }}>
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Cargando...</div>
                    ) : sections.length === 0 ? (
                        <div style={{ padding: '80px 40px', textAlign: 'center', background: '#fff', borderRadius: '24px', border: '2px dashed #e2e8f0' }}>
                            <Layout size={48} color="#cbd5e1" style={{ marginBottom: '16px' }} />
                            <h3 style={{ margin: 0, color: '#1e1b4b', fontFamily: 'Inter, system-ui, sans-serif' }}>Sin bloques</h3>
                            <p style={{ color: '#64748b', fontSize: '14px' }}>Empieza añadiendo contenido a esta página.</p>
                        </div>
                    ) : (
                        sections.map((section, index) => {
                            const isNew = typeof section.id === 'string' && section.id.startsWith('temp_');
                            const isHovered = hoveredSectionId === section.id;
                            return (
                                <div 
                                    key={section.id}
                                    onPointerEnter={() => setHoveredSectionId(section.id)}
                                    onPointerLeave={() => setHoveredSectionId(null)}
                                    style={{ 
                                        background: isNew ? '#f8fafc' : '#fff', 
                                        border: '2px solid',
                                        borderColor: isHovered ? '#8f0653' : (isNew ? '#f1f5f9' : '#e2e8f0'),
                                        padding: '16px 20px', 
                                        borderRadius: '20px',
                                        display: 'flex',
                                        flexDirection: isMobileScreen ? 'column' : 'row',
                                        alignItems: isMobileScreen ? 'stretch' : 'center',
                                        gap: isMobileScreen ? '12px' : '16px',
                                        opacity: section.is_active ? 1 : 0.6,
                                        transition: 'all 0.2s',
                                        position: 'relative',
                                        boxShadow: isHovered ? '0 10px 25px rgba(143,6,83,0.15)' : 'none',
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                        {isReordering && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: '-10px', padding: '0 8px' }}>
                                                <button 
                                                    disabled={index === 0}
                                                    onClick={() => handleMove(index, -1)}
                                                    style={{ border: 'none', background: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', color: index === 0 ? '#e2e8f0' : '#64748b', padding: 0 }}
                                                >
                                                    <ChevronUp size={20} />
                                                </button>
                                                <button 
                                                    disabled={index === sections.length - 1}
                                                    onClick={() => handleMove(index, 1)}
                                                    style={{ border: 'none', background: 'none', cursor: index === sections.length - 1 ? 'not-allowed' : 'pointer', color: index === sections.length - 1 ? '#e2e8f0' : '#64748b', padding: 0 }}
                                                >
                                                    <ChevronDown size={20} />
                                                </button>
                                            </div>
                                        )}
                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fdf2f8', color: '#8f0653', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                            {getIcon(section.type)}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            {editingTitleId === section.id ? (
                                                <input autoFocus style={{ border: 'none', borderBottom: '2px solid #8f0653', outline: 'none', background: 'transparent', fontWeight: '800', width: '100%', fontSize: '13px' }} value={section.title} onChange={e => setSections(sections.map(s => s.id === section.id ? { ...s, title: e.target.value } : s))} onBlur={() => setEditingTitleId(null)} onKeyDown={e => e.key === 'Enter' && setEditingTitleId(null)} />
                                            ) : (
                                                <h4 onClick={() => setEditingTitleId(section.id)} style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#1e1b4b', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'Inter, system-ui, sans-serif' }}>{section.title}</h4>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', justifyContent: isMobileScreen ? 'flex-end' : 'flex-start' }}>
                                        <button onClick={(e) => { e.stopPropagation(); handleToggleActive(section); }} title="Activar/Desactivar" style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: section.is_active ? '#ecfdf5' : '#f8fafc', color: section.is_active ? '#059669' : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{section.is_active ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                                        <button onClick={(e) => { 
                                            e.stopPropagation();
                                            setSelectedSection(section); 
                                            if (['hero', 'banner', 'composition_carousel'].includes(section.type)) {
                                                setIsStudioOpen(true);
                                            } else if (section.type === 'data_table') {
                                                setIsTableOpen(true);
                                            } else if (section.type === 'text_post') {
                                                setIsTextOpen(true);
                                            } else {
                                                setIsDrawerOpen(true);
                                            }
                                        }} title="Editar Contenido" style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#fdf2f8', color: '#8f0653', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Edit2 size={14} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(section.id); }} title="Eliminar" style={{ width: '32px', height: '32px', borderRadius: '8px', border: 'none', background: '#fff1f2', color: '#e11d48', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Lado Derecho: Espejo del Sitio (Solo visible en Desktop) */}
                {!isMobileScreen && (
                    <div style={{ 
                        background: '#f1f5f9', 
                        borderRadius: '32px', 
                        padding: '24px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '16px', 
                        position: 'relative', 
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        height: '100%',
                        minHeight: 0
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '13px', fontWeight: '800', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: 'Inter, system-ui, sans-serif' }}>
                                <Monitor size={15} /> ESPEJO DEL SITIO (LIVE)
                            </h3>
                            <div style={{ display: 'flex', background: '#fff', padding: '4px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <button 
                                    onClick={() => setPreviewDevice('desktop')}
                                    style={{ padding: '6px 12px', border: 'none', background: previewDevice === 'desktop' ? '#1e1b4b' : 'transparent', color: previewDevice === 'desktop' ? '#fff' : '#64748b', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    <Monitor size={14} />
                                </button>
                                <button 
                                    onClick={() => setPreviewDevice('mobile')}
                                    style={{ padding: '6px 12px', border: 'none', background: previewDevice === 'mobile' ? '#1e1b4b' : 'transparent', color: previewDevice === 'mobile' ? '#fff' : '#64748b', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    <Smartphone size={14} />
                                </button>
                            </div>
                        </div>
                        
                        <div style={{ 
                            flex: 1, 
                            background: '#fff', 
                            borderRadius: previewDevice === 'mobile' ? '0px' : '24px', 
                            overflowY: 'auto', 
                            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.05)',
                            margin: previewDevice === 'mobile' ? '0 auto' : '0',
                            width: previewDevice === 'mobile' ? 'min(375px, 100%)' : '100%',
                            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                            padding: '10px'
                        }}>
                            <CMSRenderer 
                                data={sections} 
                                previewMode={true} 
                                forceMobile={previewDevice === 'mobile'}
                            />
                        </div>

                        <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '11px', fontWeight: '600' }}>
                            Los cambios aquí son instantáneos. Pulsa "Guardar" para publicarlos.
                        </div>
                    </div>
                )}
            </div>

            {/* Botón Flotante para Móvil */}
            {isMobileScreen && (
                <button 
                    onClick={() => {
                        setPreviewDevice('mobile');
                        setIsPreviewModalOpen(true);
                    }}
                    style={{
                        position: 'fixed',
                        bottom: '24px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: '#1e1b4b',
                        color: '#fff',
                        padding: '14px 28px',
                        borderRadius: '100px',
                        border: 'none',
                        fontWeight: '900',
                        fontSize: '14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxShadow: '0 10px 30px rgba(30,27,75,0.4)',
                        zIndex: 1000,
                        cursor: 'pointer'
                    }}
                >
                    <Eye size={18} /> Ver Espejo (Live)
                </button>
            )}

            {/* Modal de Previsualización Móvil */}
            {isPreviewModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 10000,
                    background: '#f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    animation: 'previewFadeIn 0.3s ease'
                }}>
                    <div style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px' }}>
                                <button 
                                    onClick={() => setPreviewDevice('desktop')}
                                    style={{ padding: '6px 12px', border: 'none', background: previewDevice === 'desktop' ? '#1e1b4b' : 'transparent', color: previewDevice === 'desktop' ? '#fff' : '#64748b', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}
                                >
                                    <Monitor size={16} />
                                </button>
                                <button 
                                    onClick={() => setPreviewDevice('mobile')}
                                    style={{ padding: '6px 12px', border: 'none', background: previewDevice === 'mobile' ? '#1e1b4b' : 'transparent', color: previewDevice === 'mobile' ? '#fff' : '#64748b', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}
                                >
                                    <Smartphone size={16} />
                                </button>
                            </div>
                            <span style={{ fontWeight: '900', fontSize: '13px', color: '#1e1b4b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Previa: {previewDevice === 'mobile' ? 'Móvil' : 'Escritorio'}
                            </span>
                        </div>
                        <button 
                            onClick={() => setIsPreviewModalOpen(false)}
                            style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '8px 16px', fontWeight: '800', fontSize: '12px', cursor: 'pointer', color: '#1e1b4b' }}
                        >
                            Cerrar
                        </button>
                    </div>
                    <div style={{ flex: 1, overflow: 'auto', padding: '20px 10px', background: '#f8fafc' }}>
                        <div style={{ 
                            margin: '0 auto', 
                            width: previewDevice === 'mobile' ? 'min(375px, 100%)' : '1200px', 
                            background: '#fff', 
                            borderRadius: previewDevice === 'mobile' ? '0px' : '24px', 
                            boxShadow: '0 20px 50px rgba(0,0,0,0.1)', 
                            overflow: 'hidden',
                            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                            transformOrigin: 'top center'
                        }}>
                            <CMSRenderer 
                                data={sections} 
                                previewMode={true} 
                                forceMobile={previewDevice === 'mobile'}
                            />
                        </div>
                    </div>
                    <style>{`
                        @keyframes previewFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                    `}</style>
                </div>
            )}

            <DetailDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} data={selectedSection} type="cms_block" title={`Configurar: ${selectedSection?.title}`} onUpdate={handleUpdate} />
            {selectedSection && <StudioEditor isOpen={isStudioOpen} onClose={() => setIsStudioOpen(false)} data={selectedSection} onSave={handleUpdate} mode={selectedSection?.type === 'composition_carousel' ? 'multi' : 'single'} />}
            {selectedSection && <DataTableStudio isOpen={isTableOpen} onClose={() => setIsTableOpen(false)} data={selectedSection} onSave={handleUpdate} />}
            {selectedSection && <TextStudio isOpen={isTextOpen} onClose={() => setIsTextOpen(false)} data={selectedSection} onSave={handleUpdate} />}
            <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} variant={confirmModal.variant} confirmText={confirmModal.confirmText} />

            <style>{`
                .dropdown-content { display: none; position: absolute; right: 0; background: #fff; min-width: 200px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-radius: 16px; padding: 8px; z-index: 100; border: 1px solid #f1f5f9; }
                .dropdown:hover .dropdown-content { display: block; }
                .dropdown-content button { width: 100%; padding: 10px 16px; border: none; background: none; text-align: left; font-size: 13px; font-weight: 700; color: #1e1b4b; cursor: pointer; display: flex; alignItems: center; gap: 10px; border-radius: 10px; }
                .dropdown-content button:hover { background: #fdf2f8; color: #8f0653; }
            `}</style>
        </div>
    );
};

export default CMSPageManager;
