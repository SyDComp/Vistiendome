import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Save, Type, ArrowLeft } from 'lucide-react';
import Button from '../../../Button';
import './TextStudio.css';
import './estudio.css';

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
        <div className="est-ventana">
            {/* HEADER */}
            <div className="est-barra">
                <div className="est-fila--ancha">
                    <button onClick={onClose} className="est-boton-tenue">
                        <ArrowLeft size={20} /> <span className="hide-on-mobile est-nombre">Volver</span>
                    </button>
                    <div className="hide-on-mobile est-divisor" />
                    <div className="est-fila--media">
                        <div className="est-emblema est-emblema--degradado">
                            <Type size={20} color="#fff" />
                        </div>
                        <div className="est-encogible">
                            <input 
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="est-titulo-editable"
                            />
                            <p className="est-ruta">Editorial Studio Pro</p>
                        </div>
                    </div>
                </div>
                <div className="est-fila--fija">
                    <Button onClick={handleSave} variant="primary" className="est-boton-marca">
                        <Save size={18} /> <span className="hide-on-mobile">Guardar</span>
                    </Button>
                </div>
            </div>

            {/* CANVAS / EDITOR */}
            <div className="dt-studio-layout">
                <div className="dt-studio-workspace">
                    <div className="est-ventana-caja">
                        <ReactQuill 
                            theme="snow" 
                            value={content} 
                            onChange={setContent} 
                            modules={modules}
                            placeholder="Escribe algo increíble aquí..."
                            className="est-pila"
                        />
                    </div>
                </div>
            </div>


        </div>
    );
};

export default TextStudio;
