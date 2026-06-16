import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Layers, Type, Image as ImageIcon, Trash2, Move, RotateCw, Maximize, ChevronLeft, ChevronRight, Save, Eye, Palette, Package } from 'lucide-react';
import Button from '../../Button';
import MediaGallery from '../../../interface/admin/media/MediaGallery';
import LibraryPicker from '../../../interface/admin/inventory/LibraryPicker';
import '../../../../styles/modules/admin/cms_studio.css';

const CompositionEditor = ({ isOpen, onClose, data, onSave }) => {
    // 1. ESTADOS PRINCIPALES
    const [slides, setSlides] = useState(data.config?.slides || []);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [activeLayerIndex, setActiveLayerIndex] = useState(null);
    const [dragging, setDragging] = useState(null); 
    const [showGallery, setShowGallery] = useState(false);
    const [showLibrary, setShowLibrary] = useState(false);
    const [viewMode, setViewMode] = useState('edit'); 
    const canvasRef = useRef(null);

    // 2. DATOS DERIVADOS
    const currentSlide = slides[activeSlideIndex] || { bg_color: '#ffffff', layers: [] };
    const layers = currentSlide.layers || [];
    const activeLayer = activeLayerIndex !== null ? layers[activeLayerIndex] : null;

    // 3. FUNCIONES DE ACTUALIZACIÓN (HANDLERS)
    const updateCurrentSlide = (updates) => {
        const newSlides = [...slides];
        newSlides[activeSlideIndex] = { ...currentSlide, ...updates };
        setSlides(newSlides);
    };

    const updateLayer = (index, updates) => {
        const newLayers = [...layers];
        newLayers[index] = { ...newLayers[index], ...updates };
        updateCurrentSlide({ layers: newLayers });
    };

    const addLayer = (type, extra = {}) => {
        const newLayer = {
            id: Date.now(),
            type,
            x: 50, y: 50, scale: 1, rotation: 0,
            zIndex: layers.length + 1,
            ...extra
        };
        if (type === 'text') {
            newLayer.content = 'Nuevo Texto';
            newLayer.color = '#1e1b4b';
        }
        const nextLayers = [...layers, newLayer];
        updateCurrentSlide({ layers: nextLayers });
        setActiveLayerIndex(nextLayers.length - 1);
    };

    const handleSave = () => {
        onSave({ ...data, config: { ...data.config, slides } });
        onClose();
    };

    const handleMouseDown = (e, index) => {
        if (viewMode === 'preview') return;
        e.stopPropagation();
        const layer = layers[index];
        setDragging({
            index,
            startX: e.clientX,
            startY: e.clientY,
            initialX: layer.x,
            initialY: layer.y
        });
        setActiveLayerIndex(index);
    };

    // 4. EFECTOS (LÓGICA)
    useEffect(() => {
        if (data.config?.slides) setSlides(data.config.slides);
    }, [data.config]);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!dragging || !canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const deltaX = ((e.clientX - dragging.startX) / rect.width) * 100;
            const deltaY = ((e.clientY - dragging.startY) / rect.height) * 100;
            const newX = Math.round(Math.max(0, Math.min(100, dragging.initialX + deltaX)));
            const newY = Math.round(Math.max(0, Math.min(100, dragging.initialY + deltaY)));
            updateLayer(dragging.index, { x: newX, y: newY });
        };
        const handleMouseUp = () => setDragging(null);
        if (dragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging]);

    // 5. SALIDA TEMPRANA (REGLA DE HOOKS)
    if (!isOpen) return null;

    // 6. RENDERIZADO VISUAL
    return (
        <div className="cms-studio-container">
            {/* Header */}
            <div className="cms-studio-header">
                <div className="cms-studio-header-left">
                    <div className="cms-studio-header-icon">
                        <Layers size={24} />
                    </div>
                    <div>
                        <h2 className="cms-studio-header-title">STUDIO VISTIENDOMÉ</h2>
                        <div className="cms-studio-header-meta">
                            <span className="cms-studio-header-tag">PRO</span>
                            <p className="cms-studio-header-subtitle">Visual Composition Engine</p>
                        </div>
                    </div>
                </div>
                
                <div className="cms-studio-header-actions">
                    <button 
                        onClick={() => setViewMode(viewMode === 'edit' ? 'preview' : 'edit')}
                        className={`cms-studio-btn-outline ${viewMode === 'preview' ? 'preview-mode' : ''}`}
                    >
                        {viewMode === 'preview' ? <Layers size={14} /> : <Eye size={14} />} 
                        {viewMode === 'preview' ? 'VOLVER A EDITAR' : 'VISTA PREVIA'}
                    </button>
                    <button 
                        onClick={handleSave}
                        className="cms-studio-btn-primary"
                    >
                        <Save size={14} /> PUBLICAR CAMBIOS
                    </button>
                    <div className="cms-studio-divider" />
                    <button onClick={onClose} className="cms-studio-btn-close">
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Main Editor Area */}
            <div className="cms-studio-editor-area">
                
                {/* Left Sidebar: Layer Stack */}
                <div className="cms-studio-sidebar-left">
                    <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
                        <div className="cms-studio-layer-header">
                            <h3 className="cms-studio-layer-title">Capas de Diapositiva</h3>
                            <span className="cms-studio-layer-count">{layers.length}</span>
                        </div>

                        <div className="cms-studio-layer-list">
                            {layers.length === 0 && (
                                <div className="cms-studio-layer-empty">
                                    <Layers size={32} style={{ marginBottom: '16px', opacity: 0.1 }} />
                                    <p style={{ fontSize: '11px', margin: 0, fontWeight: '600' }}>Sin elementos en el lienzo</p>
                                </div>
                            )}
                            {[...layers].sort((a,b) => b.zIndex - a.zIndex).map((layer) => {
                                const originalIndex = layers.indexOf(layer);
                                const isSelected = activeLayerIndex === originalIndex;
                                return (
                                    <div 
                                        key={layer.id}
                                        onClick={() => setActiveLayerIndex(originalIndex)}
                                        className={`cms-studio-layer-item ${isSelected ? 'active' : ''}`}
                                    >
                                        <div className="cms-studio-layer-icon">
                                            {layer.type === 'text' ? <Type size={14} color="#000" /> : <img src={`${(window.location.origin.includes('localhost') ? 'http://localhost:8000' : '')}${layer.url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                        </div>
                                        <div className="cms-studio-layer-info">
                                            <div className="cms-studio-layer-name">{layer.type === 'text' ? (layer.content || 'Texto') : 'Imagen'}</div>
                                            <div className="cms-studio-layer-zindex">Z-INDEX: {layer.zIndex}</div>
                                        </div>
                                        {isSelected && (
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const next = layers.filter((_, i) => i !== originalIndex);
                                                    updateCurrentSlide({ layers: next });
                                                    setActiveLayerIndex(null);
                                                }}
                                                className="cms-studio-layer-trash"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="cms-studio-toolbar">
                        <div className="cms-studio-toolbar-grid">
                            <button 
                                onClick={() => addLayer('text')}
                                className="cms-studio-tool-btn"
                            >
                                <Type size={20} />
                                <span className="cms-studio-tool-label">TEXTO</span>
                            </button>
                            <button 
                                onClick={() => setShowLibrary(true)}
                                className="cms-studio-tool-btn"
                            >
                                <Package size={20} />
                                <span className="cms-studio-tool-label">CATÁLOGO</span>
                            </button>
                            <button 
                                onClick={() => setShowGallery(true)}
                                className="cms-studio-tool-btn span-2"
                            >
                                <ImageIcon size={20} />
                                <span className="cms-studio-tool-label">SUBIR MEDIA EXTERNA</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Center: Canvas Area */}
                <div 
                    className="cms-studio-canvas-container"
                    onClick={() => setActiveLayerIndex(null)}
                >
                    {/* Perspective lines */}
                    <div className="cms-studio-perspective-lines" />
                    
                    {/* Slide Tabs Top */}
                    <div className="cms-studio-slide-tabs">
                        {slides.map((_, i) => (
                            <button 
                                key={i}
                                onClick={(e) => { e.stopPropagation(); setActiveSlideIndex(i); setActiveLayerIndex(null); }}
                                className={`cms-studio-tab-btn ${activeSlideIndex === i ? 'active' : ''}`}
                            >
                                SLIDE {i + 1}
                            </button>
                        ))}
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                const next = [...slides, { bg_color: '#ffffff', layers: [] }];
                                setSlides(next);
                                setActiveSlideIndex(next.length - 1);
                            }}
                            className="cms-studio-tab-add"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    {/* THE CANVAS (WYSIWYG) */}
                    <div 
                        ref={canvasRef}
                        className={`cms-studio-canvas ${viewMode === 'edit' ? 'edit-mode' : 'preview-mode'}`}
                        style={{ background: currentSlide.bg_color }}
                    >
                        {/* Interactive Elements */}
                        {layers.sort((a,b) => a.zIndex - b.zIndex).map((layer, idx) => {
                            const originalIndex = layers.indexOf(layer);
                            const isSelected = activeLayerIndex === originalIndex && viewMode === 'edit';

                            return (
                                <div 
                                    key={layer.id}
                                    onMouseDown={(e) => handleMouseDown(e, originalIndex)}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`cms-studio-canvas-layer ${viewMode === 'edit' ? 'edit-mode' : ''} ${dragging?.index === originalIndex ? 'dragging' : ''} ${isSelected ? 'active' : ''}`}
                                    style={{
                                        left: `${layer.x}%`,
                                        top: `${layer.y}%`,
                                        zIndex: layer.zIndex,
                                        transform: `translate(-50%, -50%) rotate(${layer.rotation || 0}deg) scale(${layer.scale || 1})`
                                    }}
                                >
                                    {isSelected && (
                                        <div className="cms-studio-layer-tooltip">
                                            Z-INDEX: {layer.zIndex} • {layer.x}% , {layer.y}%
                                        </div>
                                    )}

                                    {layer.type === 'text' ? (
                                        <div className="cms-studio-text-content" style={{ color: layer.color || '#000', fontSize: 'min(5vw, 64px)' }}>
                                            {layer.content}
                                        </div>
                                    ) : (
                                        <img 
                                            src={layer.url ? `${(window.location.origin.includes('localhost') ? 'http://localhost:8000' : '')}${layer.url}` : '/placeholder.jpg'} 
                                            className={`cms-studio-image-content ${isSelected ? 'active' : ''}`}
                                            alt=""
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Bottom Status */}
                    <div className="cms-studio-status-bar">
                        <span>Lienzo: 21:9 UltraWide</span>
                        <span>Resolución Dinámica: %</span>
                        <span style={{ color: '#8f0653' }}>● Live Rendering Active</span>
                    </div>
                </div>

                {/* Right Sidebar: Properties */}
                <div className="cms-studio-sidebar-right">
                    {activeLayer ? (
                        <div className="cms-studio-prop-panel">
                            <div className="cms-studio-prop-header">
                                <h3 className="cms-studio-prop-title">Propiedades de Capa</h3>
                                <div className="cms-studio-prop-id">
                                    #{activeLayer.id.toString().slice(-4)}
                                </div>
                            </div>

                            {activeLayer.type === 'text' && (
                                <div className="cms-studio-prop-group">
                                    <label className="cms-studio-prop-label">CONTENIDO DEL TEXTO</label>
                                    <input 
                                        type="text" 
                                        value={activeLayer.content}
                                        onChange={(e) => updateLayer(activeLayerIndex, { content: e.target.value })}
                                        className="cms-studio-input"
                                    />
                                </div>
                            )}

                            <div className="cms-studio-prop-grid">
                                <div className="cms-studio-prop-group">
                                    <label className="cms-studio-prop-label">POSICIÓN X (%)</label>
                                    <input type="range" className="cms-studio-range" min="0" max="100" value={activeLayer.x} onChange={(e) => updateLayer(activeLayerIndex, { x: parseInt(e.target.value) })} />
                                    <div className="cms-studio-range-val">{activeLayer.x}%</div>
                                </div>
                                <div className="cms-studio-prop-group">
                                    <label className="cms-studio-prop-label">POSICIÓN Y (%)</label>
                                    <input type="range" className="cms-studio-range" min="0" max="100" value={activeLayer.y} onChange={(e) => updateLayer(activeLayerIndex, { y: parseInt(e.target.value) })} />
                                    <div className="cms-studio-range-val">{activeLayer.y}%</div>
                                </div>
                                <div className="cms-studio-prop-group">
                                    <label className="cms-studio-prop-label">ROTACIÓN</label>
                                    <input type="range" className="cms-studio-range" min="-180" max="180" value={activeLayer.rotation} onChange={(e) => updateLayer(activeLayerIndex, { rotation: parseInt(e.target.value) })} />
                                    <div className="cms-studio-range-val">{activeLayer.rotation}°</div>
                                </div>
                                <div className="cms-studio-prop-group">
                                    <label className="cms-studio-prop-label">ESCALA</label>
                                    <input type="range" className="cms-studio-range" min="0.1" max="3" step="0.1" value={activeLayer.scale} onChange={(e) => updateLayer(activeLayerIndex, { scale: parseFloat(e.target.value) })} />
                                    <div className="cms-studio-range-val">x{activeLayer.scale}</div>
                                </div>
                            </div>

                            <div className="cms-studio-prop-group">
                                <label className="cms-studio-prop-label">ORDEN DE CAPA (Z-INDEX)</label>
                                <div className="cms-studio-zindex-ctrl">
                                    <button 
                                        onClick={() => updateLayer(activeLayerIndex, { zIndex: Math.max(1, activeLayer.zIndex - 1) })}
                                        className="cms-studio-zindex-btn"
                                    >BAJAR</button>
                                    <div className="cms-studio-zindex-display">{activeLayer.zIndex}</div>
                                    <button 
                                        onClick={() => updateLayer(activeLayerIndex, { zIndex: activeLayer.zIndex + 1 })}
                                        className="cms-studio-zindex-btn"
                                    >SUBIR</button>
                                </div>
                            </div>

                            {activeLayer.type === 'text' && (
                                <div className="cms-studio-prop-group">
                                    <label className="cms-studio-prop-label">COLOR DEL TEXTO</label>
                                    <div className="cms-studio-color-picker">
                                        {['#fff', '#000', '#8f0653', '#1e1b4b', '#fdf2f8', '#ffd700'].map(c => (
                                            <button 
                                                key={c}
                                                onClick={() => updateLayer(activeLayerIndex, { color: c })}
                                                className="cms-studio-color-btn"
                                                style={{ background: c, border: activeLayer.color === c ? '2px solid #fff' : 'none' }}
                                            />
                                        ))}
                                        <input type="color" value={activeLayer.color} onChange={(e) => updateLayer(activeLayerIndex, { color: e.target.value })} className="cms-studio-color-input" />
                                    </div>
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="cms-studio-prop-panel">
                            <h3 className="cms-studio-prop-title">Propiedades de Lienzo</h3>
                            
                            <div className="cms-studio-prop-group">
                                <label className="cms-studio-prop-label">COLOR DE FONDO (NIVEL 0)</label>
                                <input 
                                    type="color" 
                                    value={currentSlide.bg_color} 
                                    onChange={(e) => updateCurrentSlide({ bg_color: e.target.value })}
                                    className="cms-studio-bg-input"
                                />
                            </div>

                            <div className="cms-studio-info-box">
                                <p className="cms-studio-info-text">
                                    Selecciona una capa en el lienzo o en la lista de la izquierda para editar sus propiedades de transformación.
                                </p>
                            </div>

                            <button 
                                onClick={() => {
                                    if (window.confirm("¿Estás seguro de eliminar esta diapositiva?")) {
                                        const next = slides.filter((_, i) => i !== activeSlideIndex);
                                        setSlides(next);
                                        setActiveSlideIndex(Math.max(0, activeSlideIndex - 1));
                                    }
                                }}
                                className="cms-studio-btn-danger"
                            >
                                ELIMINAR DIAPOSITIVA
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals Internos */}
            {showGallery && (
                <MediaGallery 
                    isOpen={showGallery}
                    onClose={() => setShowGallery(false)}
                    onSelect={(assets) => {
                        const asset = Array.isArray(assets) ? assets[0] : assets;
                        addLayer('image', { url: asset.url });
                        setShowGallery(false);
                    }}
                />
            )}

            {showLibrary && (
                <LibraryPicker 
                    isOpen={showLibrary}
                    onClose={() => setShowLibrary(false)}
                    type="variants"
                    title="Seleccionar Producto"
                    onItemClick={(v) => {
                        addLayer('image', { 
                            url: v.image || v.image_url,
                            link: `/catalogo/producto/${v.product_id}/${v.sku}`
                        });
                        setShowLibrary(false);
                    }}
                />
            )}


        </div>
    );
};

export default CompositionEditor;
