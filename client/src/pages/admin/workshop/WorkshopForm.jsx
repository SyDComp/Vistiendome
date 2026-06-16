import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../../components/atoms/Button';
import Input from '../../../components/atoms/Input';
import api from '../../../services/api';
import { useNotification } from '../../../context/NotificationContext';

import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import ImageTool from '@editorjs/image';
import List from '@editorjs/list';
import Paragraph from '@editorjs/paragraph';
import GallerySelectorModal from '../gallery/GallerySelectorModal';

import './WorkshopAdmin.css';

export default function WorkshopForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;
    const { showNotification } = useNotification();

    const editorInstance = useRef(null);
    const editorContainerRef = useRef(null);

    const [formData, setFormData] = useState({
        title: '',
        content: null,
        is_published: true
    });
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEdit);
    const [showGallery, setShowGallery] = useState(false);

    useEffect(() => {
        if (isEdit) {
            api.get(`/workshop/${id}`)
                .then(res => {
                    const data = res.data;
                    setFormData({
                        title: data.title,
                        content: data.content,
                        is_published: data.is_published
                    });
                })
                .catch(err => {
                    console.error(err);
                    showNotification('error', 'Error al cargar la publicación');
                })
                .finally(() => setInitialLoading(false));
        }
    }, [id, isEdit]);

    // Inicializar EditorJS
    useEffect(() => {
        if (initialLoading || !editorContainerRef.current) return;

        if (!editorInstance.current) {
            const editor = new EditorJS({
                holder: editorContainerRef.current,
                placeholder: 'Escribe tu publicación o pulsa Tab para elegir una herramienta...',
                data: formData.content || { blocks: [] },
                onChange: async () => {
                    // No guardamos el JSON en cada tipeo para no penalizar rendimiento.
                    // Lo haremos al hacer "Guardar".
                },
                tools: {
                    header: {
                        class: Header,
                        inlineToolbar: true,
                        config: {
                            levels: [2, 3, 4],
                            defaultLevel: 2
                        }
                    },
                    paragraph: {
                        class: Paragraph,
                        inlineToolbar: true,
                    },
                    list: {
                        class: List,
                        inlineToolbar: true,
                    },
                    image: {
                        class: ImageTool,
                        config: {
                            uploader: {
                                async uploadByFile(file) {
                                    const uploadData = new FormData();
                                    uploadData.append('file', file);
                                    try {
                                        const res = await api.post('/workshop/media/upload', uploadData, {
                                            headers: { 'Content-Type': 'multipart/form-data' }
                                        });
                                        const publicUrl = `${(import.meta.env.VITE_API_URL || '/api/v1').replace('/api/v1', '')}/static/${res.data.url}`;
                                        return {
                                            success: 1,
                                            file: {
                                                url: publicUrl,
                                                type: res.data.type // Puede que EditorJS no use el type custom, pero lo dejamos.
                                            }
                                        };
                                    } catch (error) {
                                        console.error('Error uploading image', error);
                                        return { success: 0 };
                                    }
                                },
                            }
                        }
                    }
                },
                i18n: {
                    messages: {
                        ui: {
                            "blockTunes": {
                                "toggler": {
                                    "Click to tune": "Haz clic para ajustar",
                                    "or drag to move": "o arrastra para mover"
                                }
                            },
                            "inlineToolbar": {
                                "converter": {
                                    "Convert to": "Convertir a"
                                }
                            },
                            "toolbar": {
                                "toolbox": {
                                    "Add": "Añadir elemento"
                                }
                            }
                        },
                        toolNames: {
                            "Text": "Texto",
                            "Heading": "Encabezado",
                            "List": "Lista",
                            "Unordered List": "Lista Desordenada",
                            "Ordered List": "Lista Ordenada",
                            "Checklist": "Checklist",
                            "Image": "Imagen / Video"
                        },
                        tools: {
                            "header": {
                                "Heading 2": "Encabezado 2",
                                "Heading 3": "Encabezado 3",
                                "Heading 4": "Encabezado 4"
                            },
                            "list": {
                                "Ordered": "Ordenada",
                                "Unordered": "Desordenada"
                            },
                            "image": {
                                "With border": "Con borde",
                                "Stretch image": "Estirar imagen",
                                "With background": "Con fondo",
                                "Caption": "Leyenda"
                            }
                        },
                        blockTunes: {
                            "delete": {
                                "Delete": "Eliminar"
                            },
                            "moveUp": {
                                "Move up": "Mover arriba"
                            },
                            "moveDown": {
                                "Move down": "Mover abajo"
                            }
                        }
                    }
                }
            });

            editorInstance.current = editor;
        }

        return () => {
            if (editorInstance.current && editorInstance.current.destroy) {
                editorInstance.current.destroy();
                editorInstance.current = null;
            }
        };
    }, [initialLoading]); // Se ejecuta una vez después de la carga inicial


    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData(prev => ({ ...prev, [e.target.name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Obtener JSON del editor
            const savedData = await editorInstance.current.save();
            const payload = { ...formData, content: savedData };

            if (isEdit) {
                await api.put(`/workshop/${id}`, payload);
            } else {
                await api.post('/workshop', payload);
            }
            showNotification('success', isEdit ? 'Publicación actualizada' : 'Publicación creada');
            navigate('/admin/taller');
        } catch (error) {
            console.error(error);
            showNotification('error', 'Error al guardar la publicación');
        } finally {
            setLoading(false);
        }
    };

    const handleGallerySelect = (url, item) => {
        if (editorInstance.current) {
            // Insertamos el bloque de imagen con la URL seleccionada
            editorInstance.current.blocks.insert('image', {
                file: {
                    url: url,
                    type: item.type
                }
            });
        }
        setShowGallery(false);
    };

    if (initialLoading) return <div>Cargando...</div>;

    return (
        <div className="admin-page workshop-form-page">
            <div className="workshop-editor-container">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2>{isEdit ? 'Editar Publicación' : 'Nueva Publicación en El Taller'}</h2>
                    {/* <Button variant="secondary" onClick={() => navigate('/admin/taller')}>Volver</Button> */}
                </div>

                <form onSubmit={handleSubmit} className="workshop-form">
                    <Input
                        label="Título"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                    />

                    <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label className="editor-label" style={{ marginBottom: 0 }}>Contenido</label>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowGallery(true)}
                                style={{ padding: '4px 12px', fontSize: '0.9rem' }}
                            >
                                🖼️ Seleccionar de Galería
                            </Button>
                        </div>
                        <div className="editor-paper" style={{ padding: '20px', background: 'white', borderRadius: '8px', minHeight: '400px', border: '1px solid #ddd' }}>
                            <div ref={editorContainerRef} id="editorjs-container"></div>
                        </div>
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                name="is_published"
                                checked={formData.is_published}
                                onChange={handleChange}
                            />
                            Hacer visible al público inmediatamente
                        </label>
                    </div>

                    <div className="form-actions">
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Guardando...' : (isEdit ? 'Guardar Cambios' : 'Crear Publicación')}
                        </Button>
                        <Button variant="secondary" onClick={() => navigate('/admin/taller')}>Volver</Button>
                    </div>
                </form>
            </div>

            <GallerySelectorModal
                isOpen={showGallery}
                onClose={() => setShowGallery(false)}
                onSelect={handleGallerySelect}
                type={null} // Permitir tanto imágenes como videos
            />
        </div>
    );
}
