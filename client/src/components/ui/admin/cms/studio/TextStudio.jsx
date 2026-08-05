import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Save, Type, ArrowLeft } from 'lucide-react';
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
            <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, minWidth: 0 }}>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.7, padding: 0, flexShrink: 0 }}>
                        <ArrowLeft size={20} /> <span className="hide-on-mobile" style={{ fontSize: '13px', fontWeight: '800', textTransform: 'uppercase' }}>Volver</span>
                    </button>
                    <div className="hide-on-mobile" style={{ height: '30px', width: '1px', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #8f0653, #530432)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Type size={20} color="#fff" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <input 
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '18px', fontWeight: '900', outline: 'none', width: '100%', textOverflow: 'ellipsis' }}
                            />
                            <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Editorial Studio Pro</p>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                    <Button onClick={handleSave} variant="primary" style={{ background: '#8f0653', height: '40px', padding: '0 16px', borderRadius: '12px' }}>
                        <Save size={18} /> <span className="hide-on-mobile">Guardar</span>
                    </Button>
                </div>
            </div>

            {/* CANVAS / EDITOR */}
            <div className="dt-studio-layout">
                <div className="dt-studio-workspace" style={{ padding: '20px', overflow: 'hidden' }}>
                    <div style={{ 
                        width: '100%', 
                        maxWidth: '900px', 
                        background: '#fff', 
                        borderRadius: '24px', 
                        padding: '20px', 
                        boxSizing: 'border-box',
                        boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        minHeight: 0
                    }}>
                        <ReactQuill 
                            theme="snow" 
                            value={content} 
                            onChange={setContent} 
                            modules={modules}
                            placeholder="Escribe algo increíble aquí..."
                            style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
                        />
                    </div>
                </div>
            </div>


            <style>{`
                @keyframes studioFadeIn { from { opacity:0; transform: scale(1.05); } to { opacity:1; transform: scale(1); } }
                .quill { border: none !important; font-family: 'Outfit', sans-serif !important; flex: 1; display: flex; flexDirection: column; min-height: 0; }
                .ql-toolbar { border: none !important; border-bottom: 1px solid #f1f5f9 !important; padding: 10px 0 !important; margin-bottom: 20px !important; display: flex !important; flex-wrap: wrap !important; gap: 8px !important; flex-shrink: 0; }
                .ql-formats { margin-right: 0 !important; display: flex !important; flex-wrap: wrap !important; gap: 4px !important; }
                .ql-container { border: none !important; font-size: 18px !important; color: #1e1b4b !important; flex: 1; display: flex; flex-direction: column; min-height: 0; }
                .ql-editor { padding: 0 !important; padding-right: 10px !important; flex: 1; overflow-y: auto !important; }
                .ql-editor.ql-blank::before { color: #cbd5e1 !important; font-style: normal !important; left: 0 !important; }
                
                /* Estilizar scrollbar interno del editor */
                .ql-editor::-webkit-scrollbar { width: 6px; }
                .ql-editor::-webkit-scrollbar-track { background: transparent; }
                .ql-editor::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }

                /* Utilidades Mobile */
                @media (max-width: 600px) {
                    .hide-on-mobile { display: none !important; }
                }
            `}</style>
        </div>
    );
};

export default TextStudio;
