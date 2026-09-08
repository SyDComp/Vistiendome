import React, { useState, useEffect, useCallback } from 'react';
import './cms-admin.css';
import { 
    GripVertical, 
    ChevronRight, 
    ArrowLeft, 
    Eye, 
    EyeOff,
    Save,
    Settings,
    HelpCircle,
    ChevronUp,
    ChevronDown,
    ArrowUpDown
} from 'lucide-react';
import Button from '../../../ui/Button';
import CMSPageManager from './CMSPageManager';

const API_BASE = '/api/v1/homepage/admin/help/sections';

const CustomerServiceManager = () => {
    const [sections, setSections] = useState([]);
    const [originalSections, setOriginalSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedSlug, setSelectedSlug] = useState(null);
    const [selectedTitle, setSelectedTitle] = useState('');
    const [isReordering, setIsReordering] = useState(false);

    const hasChanges = JSON.stringify(sections) !== JSON.stringify(originalSections);

    const fetchSections = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(API_BASE);
            const data = await res.json();
            setSections(data);
            setOriginalSections(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSections();
    }, [fetchSections]);

    const handleToggleActive = (id) => {
        setSections(sections.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s));
    };

    const handleBulkSave = async () => {
        setIsSaving(true);
        try {
            // 1. Guardar estados individuales (visibilidad)
            for (const section of sections) {
                await fetch(`${API_BASE}/${section.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ is_active: section.is_active })
                });
            }
            // 2. Guardar orden
            await fetch(`${API_BASE}/reorder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ section_ids: sections.map(s => s.id) })
            });
            fetchSections();
        } catch (err) {
            console.error(err);
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

    if (selectedSlug) {
        return (
            <div className="cms-adm--pegado">
                <button 
                    onClick={() => setSelectedSlug(null)}
                    style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', 
                        background: 'none', border: 'none', color: '#64748b', 
                        fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                        marginBottom: '20px', width: 'fit-content', padding: '8px 0'
                    }}
                >
                    <ArrowLeft size={16} /> Volver a Secciones
                </button>
                <div className="cms-adm-flexible">
                    <CMSPageManager
                        page={selectedSlug} 
                        title={`Contenido: ${selectedTitle}`}
                        subtitle={`Gestiona los bloques que aparecen en la sección de ${selectedTitle}.`}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="cms-adm">
            <div className="cms-adm-cabecera">
                <div>
                    <h1 className="cms-adm-titulo">Atención al Cliente</h1>
                    <p className="cms-adm-bajada">Gestiona las secciones del footer y su contenido dinámico.</p>
                </div>
                <div className="adm-fila-holgada">
                    <Button 
                        variant={isReordering ? "primary" : "outline"} 
                        onClick={() => setIsReordering(!isReordering)}
                        className={`cms-pg-reordenar${isReordering ? ' cms-pg-reordenar--activo' : ''}`}
                    >
                        <ArrowUpDown size={18} /> {isReordering ? 'Hecho' : 'Mover'}
                    </Button>
                    {hasChanges && (
                        <Button onClick={handleBulkSave} variant="primary" disabled={isSaving} className="adm-boton-verde">
                            {isSaving ? 'Guardando...' : <><Save size={18} /> Guardar Cambios</>}
                        </Button>
                    )}
                </div>
            </div>

            <div className="cms-adm-lista">
                {loading ? (
                    <div className="cms-adm-vacio">Cargando secciones...</div>
                ) : (
                    <div className="adm-pila-limitada">
                        {sections.map((section, index) => (
                            <div 
                                key={section.id}
                                style={{ 
                                    background: '#fff', border: '1px solid',
                                    borderColor: '#e2e8f0',
                                    padding: '16px 20px', borderRadius: '20px',
                                    display: 'flex', alignItems: 'center', gap: '12px',
                                    flexWrap: 'wrap',
                                    opacity: section.is_active ? 1 : 0.6,
                                    transition: 'all 0.2s', position: 'relative'
                                }}
                            >
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
                                <div className="cms-adm-emblema">
                                    {section.icon}
                                </div>
                                <div className="cms-adm-columna">
                                    <h4 className="cms-adm-seccion-titulo">{section.title}</h4>
                                    <p className="cms-adm-seccion-nota">
                                        {section.is_active ? 'Visible en el footer' : 'Oculto actualmente'}
                                    </p>
                                </div>
                                <div className="adm-fila-etiquetas">
                                    <button onClick={() => handleToggleActive(section.id)} className={`cms-adm-accion${section.is_active ? ' cms-adm-accion--activa' : ''}`}>
                                        {section.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                                    </button>
                                    <button 
                                        onClick={() => { setSelectedSlug(section.slug); setSelectedTitle(section.title); }} 
                                        className="adm-boton-suave"
                                    >
                                        Gestionar Contenido <ChevronRight size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerServiceManager;
