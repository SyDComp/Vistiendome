import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Search, Upload, X, Check, Image as ImageIcon, Loader2, Sparkles, Filter, 
    Trash2, ChevronLeft, ChevronRight, Maximize2, MousePointer2, Layers
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../ui/Button';

/**
 * MediaGallery Premium v2: Dual Mode (Preview + Selection)
 */
const MediaGallery = ({ 
    isOpen = true, 
    onClose, 
    selectionMode = false, 
    onSelectionModeChange, // Nueva prop para memoria
    onSelect, 
    initialSelected = [], 
    allowMultiple = true,
    contextInfo = null
}) => {
    const navigate = useNavigate();
    const [images, setImages] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
    
    // Estados de Modo Dual
    const [isSelectMode, setIsSelectMode] = useState(selectionMode); // Inicializar desde prop
    const [previewIndex, setPreviewIndex] = useState(null); // Índice de la imagen en el visor
    const [selectedUrls, setSelectedUrls] = useState(new Set(initialSelected));

    // Sincronizar modo selección si cambia la prop (importante para memoria)
    useEffect(() => {
        setIsSelectMode(selectionMode);
    }, [selectionMode]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchImages = async () => {
        try {
            const res = await fetch('http://localhost:8000/api/v1/media/');
            const data = await res.json();
            setImages(data);
        } catch (err) {
            console.error("Error cargando galería:", err);
        }
    };

    useEffect(() => {
        fetchImages();
    }, []);

    useEffect(() => {
        if (previewIndex !== null) {
            const activeThumb = document.getElementById(`thumb-${previewIndex}`);
            const reel = document.getElementById('thumb-reel');
            if (activeThumb && reel) {
                const reelRect = reel.getBoundingClientRect();
                const thumbRect = activeThumb.getBoundingClientRect();
                
                // Centrar la miniatura activa
                const scrollLeft = activeThumb.offsetLeft - (reelRect.width / 2) + (thumbRect.width / 2);
                reel.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }
        }
    }, [previewIndex]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setStatus({ type: 'info', text: 'Subiendo archivo...' });

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('http://localhost:8000/api/v1/media/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                setStatus({ type: 'success', text: 'Imagen añadida a la biblioteca' });
                setTimeout(() => setStatus(null), 3000);
                fetchImages();
            } else {
                const err = await res.json();
                setStatus({ type: 'error', text: err.detail || 'Error en la subida' });
            }
        } catch (err) {
            setStatus({ type: 'error', text: 'Error de conexión' });
        } finally {
            setUploading(false);
        }
    };

    const filteredImages = useMemo(() => {
        return images.filter(img => 
            img.filename.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [images, searchTerm]);

    // Lógica del Visor (Lightbox)
    const openPreview = (index) => setPreviewIndex(index);
    const closePreview = () => setPreviewIndex(null);
    
    const nextPreview = useCallback(() => {
        if (previewIndex === null) return;
        setPreviewIndex((prev) => (prev + 1) % filteredImages.length);
    }, [previewIndex, filteredImages.length]);

    const prevPreview = useCallback(() => {
        if (previewIndex === null) return;
        setPreviewIndex((prev) => (prev - 1 + filteredImages.length) % filteredImages.length);
    }, [previewIndex, filteredImages.length]);

    // Teclas para el visor
    useEffect(() => {
        const handleKeys = (e) => {
            if (previewIndex === null) return;
            if (e.key === 'ArrowRight') nextPreview();
            if (e.key === 'ArrowLeft') prevPreview();
            if (e.key === 'Escape') closePreview();
        };
        window.addEventListener('keydown', handleKeys);
        return () => window.removeEventListener('keydown', handleKeys);
    }, [previewIndex, nextPreview, prevPreview]);

    const toggleImageSelection = (url) => {
        const next = new Set(selectedUrls);
        if (next.has(url)) next.delete(url);
        else next.add(url);
        setSelectedUrls(next);
    };

    const handleConfirmSelection = () => {
        if (onSelect) {
            const selectedArray = Array.from(selectedUrls);
            onSelect(allowMultiple ? selectedArray : selectedArray[0]);
            
            // CLEANUP TRAS ASIGNAR
            setSearchTerm('');
            setSelectedUrls(new Set());
        }
    };

    const handleInternalClose = () => {
        if (onClose) onClose();
        else navigate(-1);
    };
      const handleDelete = async () => {
        const count = selectedUrls.size;
        if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente estas ${count} imágenes? Esta acción las quitará de todos los productos y variantes donde se usen.`)) return;

        try {
            const res = await fetch('http://localhost:8000/api/v1/media/batch', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls: Array.from(selectedUrls) })
            });

            if (res.ok) {
                setStatus({ type: 'success', text: `${count} Imágenes eliminadas y referencias limpiadas.` });
                setSelectedUrls(new Set());
                fetchImages();
                setTimeout(() => setStatus(null), 4000);
            } else {
                const err = await res.json();
                setStatus({ type: 'error', text: err.detail || 'Error al eliminar' });
            }
        } catch (err) {
            setStatus({ type: 'error', text: 'Error de conexión al servidor' });
        }
    };

    const handleRename = async () => {
        const count = selectedUrls.size;
        const baseName = window.prompt(`Introduce el nuevo nombre base para estas ${count} imágenes:`, "producto_nuevo");
        if (!baseName) return;

        const mapping = {};
        const selectedArray = Array.from(selectedUrls);

        selectedArray.forEach((oldUrl, index) => {
            const extension = oldUrl.split('.').pop();
            const newFilename = count > 1 
                ? `${baseName}_${index + 1}.${extension}`
                : `${baseName}.${extension}`;
            mapping[oldUrl] = `/media/${newFilename}`;
        });

        try {
            const res = await fetch('http://localhost:8000/api/v1/media/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mapping })
            });

            if (res.ok) {
                setStatus({ type: 'success', text: `${count} Imágenes renombradas con éxito.` });
                setSelectedUrls(new Set());
                fetchImages();
                setTimeout(() => setStatus(null), 4000);
            } else {
                const err = await res.json();
                setStatus({ type: 'error', text: err.detail || 'Error al renombrar' });
            }
        } catch (err) {
            setStatus({ type: 'error', text: 'Error de conexión al servidor' });
        }
    };

    const handleActionClick = () => {
        if (onSelect) {
            handleConfirmSelection();
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(24px)',
            zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px',
            animation: 'galleryFadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
            <div style={{ 
                width: '100%', maxWidth: '1280px', height: '90vh',
                background: '#f8fafc',
                borderRadius: '32px', 
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.2)',
                position: 'relative'
            }}>
            {/* Cabecera Glassmorphism v2 */}
            <div style={{ 
                padding: '24px 32px',
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                borderBottom: '1px solid #e2e8f0',
                zIndex: 100
            }}>
                <div style={{ 
                    display: 'flex', 
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between', 
                    alignItems: isMobile ? 'stretch' : 'center', 
                    gap: '24px'
                }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '24px', fontWeight: '1000', color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '12px', letterSpacing: '-0.02em' }}>
                            <ImageIcon size={28} style={{ color: '#8f0653' }} /> Galería de Medios
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px' }}>
                            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600', background: '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>
                                {images.length} activos
                            </span>
                            {contextInfo && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fdf2f8', padding: '2px 10px', borderRadius: '6px', border: '1px solid #fbcfe8' }}>
                                    <Sparkles size={14} color="#8f0653" />
                                    <span style={{ fontSize: '12px', color: '#8f0653', fontWeight: '800' }}>{contextInfo.toUpperCase()}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        {/* Selector de Modo */}
                        {(selectionMode || allowMultiple) && (
                            <div 
                                onClick={() => {
                                    const next = !isSelectMode;
                                    setIsSelectMode(next);
                                    if (onSelectionModeChange) onSelectionModeChange(next);
                                }}
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: '10px', 
                                    padding: '12px 20px', background: isSelectMode ? '#8f0653' : '#fff',
                                    color: isSelectMode ? '#fff' : '#1e1b4b',
                                    borderRadius: '16px', border: '2px solid',
                                    borderColor: isSelectMode ? '#8f0653' : '#e2e8f0',
                                    cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                    boxShadow: isSelectMode ? '0 10px 25px -5px rgba(143,6,83,0.3)' : '0 4px 6px rgba(0,0,0,0.05)'
                                }}
                            >
                                {isSelectMode ? <Check size={18} strokeWidth={3} /> : <MousePointer2 size={18} />}
                                <span style={{ fontSize: '14px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {isSelectMode ? 'Selección ON' : 'Activar Selección'}
                                </span>
                            </div>
                        )}

                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input 
                                type="text"
                                placeholder="Buscar archivos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ 
                                    width: isMobile ? '100%' : '240px',
                                    padding: '14px 16px 14px 48px',
                                    borderRadius: '18px',
                                    border: '2px solid #f1f5f9',
                                    background: '#fff',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    outline: 'none',
                                    transition: 'all 0.2s'
                                }}
                            />
                        </div>

                        <div style={{ position: 'relative' }}>
                            <input type="file" id="media-upload" style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*" />
                            <label 
                                htmlFor="media-upload" 
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    background: '#1e1b4b', color: '#fff', padding: '14px 24px', 
                                    borderRadius: '18px', cursor: 'pointer', fontSize: '14px', 
                                    fontWeight: '900', transition: 'all 0.3s'
                                }}
                            >
                                {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                                {isMobile ? '' : 'SUBIR'}
                            </label>
                        </div>

                        {/* BOTÓN DE CIERRE INTEGRADO (EVITA SOLAPAMIENTO) */}
                        <button 
                            onClick={handleInternalClose}
                            style={{ 
                                width: '48px', 
                                height: '48px', 
                                borderRadius: '16px', 
                                border: 'none', 
                                background: '#f1f5f9', 
                                color: '#64748b', 
                                cursor: 'pointer', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                transition: 'all 0.2s',
                                border: '1px solid #e2e8f0',
                                flexShrink: 0
                            }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#fee2e2'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {status && (
                    <div style={{ 
                        marginTop: '16px', padding: '12px 20px', borderRadius: '14px', fontSize: '13px', fontWeight: '700',
                        display: 'flex', alignItems: 'center', gap: '10px',
                        background: status.type === 'error' ? '#fef2f2' : '#f0fdf4',
                        color: status.type === 'error' ? '#991b1b' : '#166534',
                        border: `1px solid ${status.type === 'error' ? '#fee2e2' : '#dcfce7'}`
                    }}>
                        <Sparkles size={16} /> {status.text}
                    </div>
                )}
            </div>

            {/* Rejilla de Medios - BLINDADA v5 */}
            <div style={{ 
                flex: 1, 
                overflowY: 'auto', 
                padding: isMobile ? '20px' : '40px',
                display: 'grid', 
                gridTemplateColumns: isMobile 
                    ? 'repeat(2, 1fr)' 
                    : 'repeat(auto-fill, minmax(240px, 1fr))', 
                gridAutoRows: 'min-content', // Fuerza a las filas a ajustarse al contenido
                gap: '40px', 
                alignContent: 'start', 
                background: '#f8fafc', 
                minHeight: 0
            }}>
                {filteredImages.map((img, idx) => {
                    const isSelected = selectedUrls.has(img.url);
                    return (
                        <div 
                            key={img.filename}
                            onClick={() => {
                                if (isSelectMode) toggleImageSelection(img.url);
                                else openPreview(idx);
                            }}
                            style={{ 
                                position: 'relative', 
                                width: '100%',
                                minHeight: isMobile ? '220px' : '330px', // ALTURA MÍNIMA REAL PARA RESERVAR ESPACIO EN EL GRID
                                borderRadius: '24px', 
                                overflow: 'hidden', 
                                background: '#fff', 
                                cursor: 'pointer',
                                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                border: '3px solid',
                                borderColor: isSelected ? '#8f0653' : 'transparent',
                                transform: isSelected ? 'scale(0.96)' : 'none',
                                boxShadow: isSelected 
                                    ? '0 25px 50px -12px rgba(143, 6, 83, 0.4)' 
                                    : '0 4px 20px rgba(0,0,0,0.06)',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            {/* Área de Imagen con Aspect Ratio Blindado */}
                            <div style={{ 
                                position: 'relative', 
                                width: '100%', 
                                flex: 1, // Ocupa todo el espacio disponible arriba de la etiqueta
                                minHeight: isMobile ? '160px' : '260px', // Garantía visual
                                overflow: 'hidden',
                                background: '#f1f5f9'
                            }}>
                                <img 
                                    src={`http://localhost:8000${img.url}`} 
                                    alt={img.filename} 
                                    style={{ 
                                        width: '100%', 
                                        height: '100%', 
                                        objectFit: 'cover', 
                                        display: 'block'
                                    }}
                                />

                                {/* Badge de Selección */}
                                {isSelectMode && (
                                    <div style={{ 
                                        position: 'absolute', top: '16px', right: '16px', 
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        background: isSelected ? '#8f0653' : 'rgba(255,255,255,0.9)',
                                        color: isSelected ? '#fff' : '#64748b',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        border: isSelected ? 'none' : '2.5px solid #e2e8f0',
                                        zIndex: 5
                                    }}>
                                        {isSelected ? <Check size={20} strokeWidth={4} /> : null}
                                    </div>
                                )}
                            </div>

                            {/* ETIQUETA INFERIOR (INTEGRADA) */}
                            <div style={{ 
                                padding: '14px 20px',
                                background: '#fff',
                                borderTop: '1px solid #f1f5f9',
                                flexShrink: 0 // Evita que se colapse
                            }}>
                                <span style={{ 
                                    color: '#1e293b', 
                                    fontSize: '11px', 
                                    fontWeight: '800', 
                                    width: '100%', 
                                    display: 'block',
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis', 
                                    whiteSpace: 'nowrap',
                                    fontFamily: 'monospace',
                                    letterSpacing: '-0.02em'
                                }}>
                                    {img.filename}
                                </span>
                            </div>
                        </div>
                    );
                })}

                {filteredImages.length === 0 && (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '100px 40px', color: '#94a3b8' }}>
                        <Filter size={48} style={{ marginBottom: '20px', opacity: 0.3 }} />
                        <h4 style={{ margin: 0, color: '#1e1b4b', fontWeight: '900' }}>Sin resultados</h4>
                        <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>No hay imágenes que coincidan con la búsqueda.</p>
                    </div>
                )}
            </div>

            {/* Barra de Acciones Masivas */}
            {selectedUrls.size > 0 && isSelectMode && (
                <div style={{ 
                    padding: '24px 40px', background: '#fff', borderTop: '2px solid #8f0653',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: '0 -10px 40px rgba(0,0,0,0.05)',
                    zIndex: 200
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <div style={{ width: '56px', height: '56px', background: '#fdf2f8', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8f0653' }}>
                            <Layers size={28} />
                        </div>
                        <div>
                            <span style={{ display: 'block', fontSize: '18px', fontWeight: '1000', color: '#1e1b4b' }}>{selectedUrls.size} imágenes seleccionadas</span>
                            <span style={{ display: 'block', fontSize: '12px', color: '#64748b', fontWeight: '600' }}>Listas para procesar en bloque</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                          <Button variant="outline" onClick={() => setSelectedUrls(new Set())} style={{ borderRadius: '16px', padding: '0 24px' }}>Limpiar Selección</Button>
                          
                          {onSelect ? (
                             <Button 
                                variant="primary" 
                                onClick={handleActionClick}
                                style={{ background: '#8f0653', borderRadius: '16px', padding: '0 40px', height: '50px' }}
                             >
                                Asignar y Guardar
                             </Button>
                          ) : (
                            <>
                                <Button 
                                    variant="outline" 
                                    onClick={handleRename}
                                    style={{ borderColor: '#8f0653', color: '#8f0653', borderRadius: '16px', padding: '0 32px', height: '50px' }}
                                >
                                    Renombrar
                                </Button>
                                <Button 
                                    variant="primary" 
                                    onClick={handleDelete}
                                    style={{ background: '#ef4444', border: 'none', borderRadius: '16px', padding: '0 32px', height: '50px' }}
                                >
                                    Eliminar Definitivamente
                                </Button>
                            </>
                          )}
                    </div>
                </div>
            )}

            {/* LIGHTBOX (VISOR PROFESIONAL UX/UI) */}
            {previewIndex !== null && (
                <div style={{ 
                    position: 'fixed', inset: 0, zIndex: 9999, 
                    background: '#0a0a0f',
                    display: 'flex', flexDirection: 'column',
                    animation: 'fadeIn 0.3s ease',
                    overflow: 'hidden'
                }}>
                    {/* 1. HEADER: Identificación y Cierre */}
                    <div style={{ 
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                        padding: '30px 50px', 
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)',
                        zIndex: 10
                    }}>
                         <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                             <div style={{ width: '2px', height: '30px', background: '#8f0653' }} />
                             <div>
                                 <span style={{ fontSize: '11px', fontWeight: '900', color: '#8f0653', textTransform: 'uppercase', letterSpacing: '0.2em', display: 'block' }}>Visualizador de Activos</span>
                                 <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#fff', letterSpacing: '-0.01em' }}>{filteredImages[previewIndex].filename}</h4>
                             </div>
                         </div>
                         <button 
                            onClick={closePreview} 
                            style={{ 
                                width: '50px', height: '50px', borderRadius: '15px', border: 'none', 
                                background: 'rgba(255,255,255,0.05)', color: '#fff', cursor: 'pointer', 
                                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                                backdropFilter: 'blur(10px)'
                            }} onMouseOver={e => e.currentTarget.style.background = '#ef4444'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                             <X size={26} />
                        </button>
                    </div>

                    {/* 2. STAGE: Zona del Producto (Libre de obstáculos) */}
                    <div style={{ 
                        flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        padding: '20px 100px', // Aire para que la prenda respire
                        overflow: 'hidden'
                    }}>
                        {/* Flecha Izquierda Minimalista */}
                        <button onClick={prevPreview} style={{ position: 'absolute', left: '40px', width: '60px', height: '60px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s', zIndex: 10 }} onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }} onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}>
                            <ChevronLeft size={32} />
                        </button>
                        
                        <img 
                            src={`http://localhost:8000${filteredImages[previewIndex].url}`} 
                            style={{ 
                                maxWidth: '100%', maxHeight: '100%', borderRadius: '24px', 
                                boxShadow: '0 50px 100px -20px rgba(0,0,0,0.5)',
                                objectFit: 'contain',
                                animation: 'zoomIn 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
                            }} 
                        />

                        {/* Flecha Derecha Minimalista */}
                        <button onClick={nextPreview} style={{ position: 'absolute', right: '40px', width: '60px', height: '60px', borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s', zIndex: 10 }} onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }} onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}>
                            <ChevronRight size={32} />
                        </button>
                    </div>

                    {/* 3. REEL: Consola de Control de Miniaturas */}
                    <div style={{ 
                        padding: '30px 0 50px 0', 
                        background: 'linear-gradient(to top, rgba(0,0,0,1), transparent)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px'
                    }}>
                        <div 
                            id="thumb-reel"
                            style={{ 
                                display: 'flex', gap: '14px', padding: '10px 30px', 
                                maxWidth: '90vw', overflowX: 'auto',
                                scrollbarWidth: 'none', msOverflowStyle: 'none',
                                scrollBehavior: 'smooth'
                            }} className="hide-scrollbar"
                        >
                            {filteredImages.map((img, i) => (
                                <div 
                                    key={i}
                                    id={`thumb-${i}`}
                                    onClick={(e) => { e.stopPropagation(); setPreviewIndex(i); }}
                                    style={{ 
                                        width: '55px', height: '70px', borderRadius: '10px', 
                                        overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                                        border: previewIndex === i ? '2px solid #8f0653' : '1px solid rgba(255,255,255,0.1)',
                                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                                        transform: previewIndex === i ? 'translateY(-10px) scale(1.15)' : 'none',
                                        boxShadow: previewIndex === i ? '0 15px 30px rgba(143,6,83,0.4)' : 'none',
                                        opacity: previewIndex === i ? 1 : 0.4
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = 1}
                                    onMouseLeave={e => previewIndex !== i && (e.currentTarget.style.opacity = 0.4)}
                                >
                                    <img src={`http://localhost:8000${img.url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            ))}
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: '700', letterSpacing: '1px' }}>
                            <span>FOTO {previewIndex + 1} DE {filteredImages.length}</span>
                            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#8f0653' }} />
                            <span style={{ textTransform: 'uppercase' }}>Consola Navegable</span>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes galleryFadeIn { from { opacity: 0; transform: scale(0.98) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes zoomIn { from { transform: scale(0.98); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .animate-spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
            `}</style>
        </div>
    </div>
    );
};

export default MediaGallery;
