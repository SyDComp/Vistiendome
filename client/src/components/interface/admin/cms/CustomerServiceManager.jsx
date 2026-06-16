import React, { useState, useEffect, useCallback } from 'react';
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

const API_BASE = `${(window.location.origin.includes('localhost') ? 'http://127.0.0.1:8000' : '')}/api/v1/homepage/admin/help/sections`;

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
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
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
                <div style={{ flex: 1 }}>
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
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '900', color: '#1e1b4b', fontFamily: 'Inter, system-ui, sans-serif' }}>Atención al Cliente</h1>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Gestiona las secciones del footer y su contenido dinámico.</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Button 
                        variant={isReordering ? "primary" : "outline"} 
                        onClick={() => setIsReordering(!isReordering)}
                        style={{ height: '48px', padding: '0 20px', borderRadius: '14px', gap: '8px', background: isReordering ? '#fdf2f8' : '#fff', color: isReordering ? '#8f0653' : '#64748b', borderColor: isReordering ? '#8f0653' : '#e2e8f0' }}
                    >
                        <ArrowUpDown size={18} /> {isReordering ? 'Hecho' : 'Mover'}
                    </Button>
                    {hasChanges && (
                        <Button onClick={handleBulkSave} variant="primary" disabled={isSaving} style={{ background: '#059669', height: '48px' }}>
                            {isSaving ? 'Guardando...' : <><Save size={18} /> Guardar Cambios</>}
                        </Button>
                    )}
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>Cargando secciones...</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '800px' }}>
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
                                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#f8fafc', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {section.icon}
                                </div>
                                <div style={{ flex: '1 1 150px' }}>
                                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#1e1b4b', fontFamily: 'Inter, system-ui, sans-serif' }}>{section.title}</h4>
                                    <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                                        {section.is_active ? 'Visible en el footer' : 'Oculto actualmente'}
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button onClick={() => handleToggleActive(section.id)} style={{ width: '36px', height: '36px', borderRadius: '10px', border: 'none', background: section.is_active ? '#ecfdf5' : '#f8fafc', color: section.is_active ? '#059669' : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {section.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                                    </button>
                                    <button 
                                        onClick={() => { setSelectedSlug(section.slug); setSelectedTitle(section.title); }} 
                                        style={{ 
                                            padding: '0 16px', height: '36px', borderRadius: '10px', 
                                            border: 'none', background: '#fdf2f8', color: '#8f0653', 
                                            fontWeight: '800', fontSize: '12px', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '6px'
                                        }}
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
