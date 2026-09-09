import React, { useState, useEffect, useCallback } from 'react';
import './CMSPageManager.css';
import './cms-admin.css';
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
    ArrowUpDown, Video } from 'lucide-react';
import DetailDrawer from '../../../ui/admin/DetailDrawer';
import StudioEditor from '../../../ui/admin/cms/studio/StudioEditor';
import DataTableStudio from '../../../ui/admin/cms/studio/DataTableStudio';
import TextStudio from '../../../ui/admin/cms/studio/TextStudio';
import Button from '../../../ui/Button';
import ConfirmModal from '../../../ui/ConfirmModal';
import CMSRenderer from '../../cms/CMSRenderer';
import { Smartphone, Monitor } from 'lucide-react';
import { useHasta } from '../../../../hooks/useCorte';

const API_BASE = '/api/v1/homepage/admin';

const CMSPageManager = ({ 
    page = 'homepage', 
    title = 'Gestor de Contenido', 
    subtitle = 'Configura el orden y contenido de esta sección.' 
}) => {
    // Con poco ancho los dos paneles -la lista de bloques y el espejo del sitio-
    // se apilan en vez de ponerse lado a lado.
    const isMobileScreen = useHasta('xl');

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
            case 'video': return <Video size={18} />;
            case 'recent_products':
            case 'product_carousel': return <ShoppingBag size={18} />;
            default: return <Layout size={18} />;
        }
    };

    return (
        <div className="cms-pg">
            <div className="cms-pg-cabecera">
                <div>
                    <h1 className="adm-titulo-grande">{title}</h1>
                    <p className="cms-adm-bajada">{subtitle}</p>
                </div>
                <div className="cms-pg-acciones">
                    {hasChanges && (
                        <div className="cms-pg-fila">
                            <Button onClick={handleDiscard} variant="outline" disabled={isSaving}>Descartar</Button>
                            <Button onClick={handleBulkSave} variant="primary" disabled={isSaving} className="cms-pg-verde">
                                {isSaving ? 'Guardando...' : <><Save size={18} /> Guardar</>}
                            </Button>
                        </div>
                    )}
                    <Button 
                        variant={isReordering ? "primary" : "outline"} 
                        onClick={() => setIsReordering(!isReordering)}
                        className={`cms-pg-reordenar${isReordering ? ' cms-pg-reordenar--activo' : ''}`}
                    >
                        <ArrowUpDown size={18} /> {isReordering ? 'Hecho' : 'Mover'}
                    </Button>
                    <div className="dropdown cms-pg-buscador">
                        <Button variant="primary" className="cms-pg-anadir">
                            <Plus size={18} /> Añadir Bloque
                        </Button>
                        <div className="dropdown-content">
                            <button onClick={() => handleCreate('hero')}><Sparkles size={14} /> Banner Visual</button>
                            <button onClick={() => handleCreate('composition_carousel')}><Layers size={14} /> Carrusel Visual</button>
                            <button onClick={() => handleCreate('text_post')}><Type size={14} /> Bloque de Texto</button>
                            <button onClick={() => handleCreate('data_table')}><TableIcon size={14} /> Tabla de Datos</button>
                            <button onClick={() => handleCreate('product_carousel')}><ShoppingBag size={14} /> Carrusel de Productos</button>
                            <button onClick={() => handleCreate('video')}><Video size={14} /> Video de YouTube</button>
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
                        <div className="cms-adm-cargando">Cargando...</div>
                    ) : sections.length === 0 ? (
                        <div className="cms-adm-vacio-grande">
                            <Layout size={48} color="#cbd5e1" className="adm-separacion" />
                            <h3 className="adm-titulo-simple">Sin bloques</h3>
                            <p className="cms-pg-bajada">Empieza añadiendo contenido a esta página.</p>
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
                                    <div className="cms-pg-fila-media">
                                        {isReordering && (
                                            <div className="cms-pg-arrastre">
                                                <button 
                                                    disabled={index === 0}
                                                    onClick={() => handleMove(index, -1)}
                                                    className="adm-mover" disabled={index === 0}
                                                >
                                                    <ChevronUp size={20} />
                                                </button>
                                                <button 
                                                    disabled={index === sections.length - 1}
                                                    onClick={() => handleMove(index, 1)}
                                                    className="adm-mover" disabled={index === sections.length - 1}
                                                >
                                                    <ChevronDown size={20} />
                                                </button>
                                            </div>
                                        )}
                                        <div className="cms-adm-emblema cms-adm-emblema--marca">
                                            {getIcon(section.type)}
                                        </div>
                                        <div className="cms-pg-encogible">
                                            {editingTitleId === section.id ? (
                                                <input autoFocus className="cms-pg-editable" value={section.title} onChange={e => setSections(sections.map(s => s.id === section.id ? { ...s, title: e.target.value } : s))} onBlur={() => setEditingTitleId(null)} onKeyDown={e => e.key === 'Enter' && setEditingTitleId(null)} />
                                            ) : (
                                                <h4 onClick={() => setEditingTitleId(section.id)} className="adm-titulo-fila">{section.title}</h4>
                                            )}
                                        </div>
                                    </div>

                                    <div className="cms-pg-acciones-fila">
                                        <button onClick={(e) => { e.stopPropagation(); handleToggleActive(section); }} title="Activar/Desactivar" className={`cms-adm-accion${section.is_active ? ' cms-adm-accion--activa' : ''}`}>{section.is_active ? <Eye size={14} /> : <EyeOff size={14} />}</button>
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
                                        }} title="Editar Contenido" className="cms-adm-accion cms-adm-accion--marca"><Edit2 size={14} /></button>
                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(section.id); }} title="Eliminar" className="cms-adm-accion cms-adm-accion--borrar"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Lado Derecho: Espejo del Sitio (Solo visible en Desktop) */}
                {!isMobileScreen && (
                    <div className="cms-pg-bloque cms-pg-bloque--espejo">
                        <div className="cms-pg-fila--repartida">
                            <h3 className="adm-titulo-seccion">
                                <Monitor size={15} /> ESPEJO DEL SITIO (LIVE)
                            </h3>
                            <div className="cms-pg-grupo cms-pg-grupo--claro">
                                <button 
                                    onClick={() => setPreviewDevice('desktop')}
                                    className={`cms-adm-dispositivo${previewDevice === 'desktop' ? ' cms-adm-dispositivo--activo' : ''}`}
                                >
                                    <Monitor size={14} />
                                </button>
                                <button 
                                    onClick={() => setPreviewDevice('mobile')}
                                    className={`cms-adm-dispositivo${previewDevice === 'mobile' ? ' cms-adm-dispositivo--activo' : ''}`}
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

                        <div className="cms-adm-pie">
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
                    className="cms-pg-aviso"
                >
                    <Eye size={18} /> Ver Espejo (Live)
                </button>
            )}

            {/* Modal de Previsualización Móvil */}
            {isPreviewModalOpen && (
                <div className="cms-pg-previa">
                    <div className="cms-adm-barra">
                        <div className="cms-pg-fila-ancha">
                            <div className="cms-pg-grupo">
                                <button 
                                    onClick={() => setPreviewDevice('desktop')}
                                    className={`cms-adm-dispositivo${previewDevice === 'desktop' ? ' cms-adm-dispositivo--activo' : ''}`}
                                >
                                    <Monitor size={16} />
                                </button>
                                <button 
                                    onClick={() => setPreviewDevice('mobile')}
                                    className={`cms-adm-dispositivo${previewDevice === 'mobile' ? ' cms-adm-dispositivo--activo' : ''}`}
                                >
                                    <Smartphone size={16} />
                                </button>
                            </div>
                            <span className="cms-pg-nombre">
                                Previa: {previewDevice === 'mobile' ? 'Móvil' : 'Escritorio'}
                            </span>
                        </div>
                        <button 
                            onClick={() => setIsPreviewModalOpen(false)}
                            className="cms-pg-boton-claro"
                        >
                            Cerrar
                        </button>
                    </div>
                    <div className="cms-pg-lienzo">
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
                </div>
            )}

            <DetailDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} data={selectedSection} type="cms_block" title={`Configurar: ${selectedSection?.title}`} onUpdate={handleUpdate} />
            {selectedSection && <StudioEditor isOpen={isStudioOpen} onClose={() => setIsStudioOpen(false)} data={selectedSection} onSave={handleUpdate} mode={selectedSection?.type === 'composition_carousel' ? 'multi' : 'single'} />}
            {selectedSection && <DataTableStudio isOpen={isTableOpen} onClose={() => setIsTableOpen(false)} data={selectedSection} onSave={handleUpdate} />}
            {selectedSection && <TextStudio isOpen={isTextOpen} onClose={() => setIsTextOpen(false)} data={selectedSection} onSave={handleUpdate} />}
            <ConfirmModal isOpen={confirmModal.isOpen} onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })} onConfirm={confirmModal.onConfirm} title={confirmModal.title} message={confirmModal.message} variant={confirmModal.variant} confirmText={confirmModal.confirmText} />

        </div>
    );
};

export default CMSPageManager;
