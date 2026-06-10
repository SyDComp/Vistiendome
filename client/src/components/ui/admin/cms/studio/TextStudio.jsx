import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { X, Save, Type, Sparkles, Layout, ArrowLeft } from 'lucide-react';
import Button from '../../../Button';

const TextStudio = ({ isOpen, onClose, data, onSave }) => {
    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');

    useEffect(() => {
        if (data) {
            setContent(data.config?.content || '');
            setTitle(data.title || 'Bloque de Texto');
        }
    }, [data, isOpen]);

    if (!isOpen) return null;

    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'align': [] }],
            ['clean']
        ],
    };

    const handleSave = () => {
        onSave({ 
            ...data, 
            title,
            config: { 
                ...data.config, 
                content 
            } 
        });
        onClose();
    };

    return (
        <div style={{ 
            position: 'fixed', inset: 0, zIndex: 6000, 
            background: 'rgba(10,8,28,0.98)', 
            backdropFilter: 'blur(20px)', 
            display: 'flex', flexDirection: 'column', 
            animation: 'studioFadeIn 0.3s ease',
            fontFamily: 'Outfit, sans-serif'
        }}>
            {/* HEADER */}
            <div style={{ padding: '20px 40px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7 }}>
                        <ArrowLeft size={20} /> <span style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase' }}>Volver</span>
                    </button>
                    <div style={{ height: '30px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #8f0653, #530432)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Type size={20} color="#fff" />
                        </div>
                        <div>
                            <input 
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', fontWeight: '900', outline: 'none', width: '300px' }}
                            />
                            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Editorial Studio Pro</p>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        onClick={onClose} 
                        style={{ 
                            background: 'rgba(255,255,255,0.05)', 
                            border: '1px solid rgba(255,255,255,0.1)', 
                            color: 'rgba(255,255,255,0.6)', 
                            padding: '0 24px', 
                            borderRadius: '14px', 
                            fontSize: '13px', 
                            fontWeight: '800', 
                            textTransform: 'uppercase', 
                            letterSpacing: '1px', 
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        Cancelar
                    </button>
                    <Button onClick={handleSave} variant="primary" style={{ background: '#8f0653' }}>
                        <Save size={18} /> Guardar Cambios
                    </Button>
                </div>
            </div>

            {/* CANVAS / EDITOR */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <div style={{ flex: 1, padding: '40px', overflow: 'auto', display: 'flex', justifyContent: 'center' }}>
                    <div style={{ 
                        width: '100%', 
                        maxWidth: '900px', 
                        background: '#fff', 
                        borderRadius: '32px', 
                        padding: '60px', 
                        boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
                        minHeight: '80vh'
                    }}>
                        <ReactQuill 
                            theme="snow" 
                            value={content} 
                            onChange={setContent} 
                            modules={modules}
                            placeholder="Escribe algo increíble aquí..."
                            style={{ height: 'auto' }}
                        />
                    </div>
                </div>

                {/* SIDEBAR TIPS */}
                <div style={{ width: '320px', background: 'rgba(255,255,255,0.02)', borderLeft: '1px solid rgba(255,255,255,0.05)', padding: '40px' }}>
                    <section style={{ marginBottom: '40px' }}>
                        <h4 style={{ color: '#fff', fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '24px', opacity: 0.6 }}>Consejos de Edición</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Sparkles size={16} color="#8f0653" style={{ marginBottom: '12px' }} />
                                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                                    Utiliza los <strong>Encabezados (H1, H2)</strong> para organizar tu contenido y mejorar el SEO.
                                </p>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <Layout size={16} color="#8f0653" style={{ marginBottom: '12px' }} />
                                <p style={{ margin: 0, fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                                    Selecciona una parte del texto para aplicar <strong>colores específicos</strong> y resaltar información clave.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <style>{`
                @keyframes studioFadeIn { from { opacity:0; transform: scale(1.05); } to { opacity:1; transform: scale(1); } }
                .quill { border: none !important; font-family: 'Outfit', sans-serif !important; }
                .ql-toolbar { border: none !important; border-bottom: 1px solid #f1f5f9 !important; padding: 20px 0 !important; margin-bottom: 30px !important; }
                .ql-container { border: none !important; font-size: 18px !important; color: #1e1b4b !important; }
                .ql-editor { padding: 0 !important; min-height: 400px !important; }
                .ql-editor.ql-blank::before { color: #cbd5e1 !important; font-style: normal !important; left: 0 !important; }
            `}</style>
        </div>
    );
};

export default TextStudio;
