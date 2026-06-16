import React, { useRef, useState, useEffect, useCallback } from 'react';
import SmartImage from '../../../../components/atoms/SmartImage';

const RangeControl = ({ label, value, onChange, min = 0, max = 100, step = 1, unit = '' }) => {
    return (
        <div className="editor-range-container" onMouseDown={(e) => e.stopPropagation()}>
            <div className="range-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: '500', color: '#4a5568' }}>{label}</label>
                <span className="range-value" style={{ fontSize: '0.85rem', fontWeight: '600', color: '#3182ce', background: '#ebf8ff', padding: '2px 8px', borderRadius: '4px' }}>
                    {value}{unit}
                </span>
            </div>
            <div className="range-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(parseFloat(e.target.value))}
                    className="editor-slider"
                    style={{ flex: 1, cursor: 'pointer', height: '6px', appearance: 'none', background: '#e2e8f0', borderRadius: '3px' }}
                />
            </div>
        </div>
    );
};

const ImageSettingsEditor = ({ settings, onChange, src, label = "Ajustes de Imagen (NDE)", showShape = true }) => {
    // Standardize to new NDE structure
    const currentSettings = {
        x: settings?.x ?? 0,
        y: settings?.y ?? 0,
        zoom: settings?.zoom ?? 1,
        canvas: {
            shape: settings?.canvas?.shape || settings?.shape || 'original',
            radius: settings?.canvas?.radius || settings?.radius || 'none',
            aspectRatio: settings?.canvas?.aspectRatio || 'auto',
            bgColor: settings?.canvas?.bgColor || '#ff0000'
        }
    };

    const [isDragging, setIsDragging] = useState(false);
    const [isFormaExpanded, setIsFormaExpanded] = useState(false);
    
    // Refs for interaction state
    const containerRef = useRef(null);
    const activePointerId = useRef(null); // STABLE: Track only one pointer
    const lastPos = useRef({ x: 0, y: 0 });
    const settingsRef = useRef(currentSettings);
    
    useEffect(() => {
        settingsRef.current = currentSettings;
    }, [currentSettings]);

    // BLOCK SCROLL/PINCH ZOOM (Passive: false is required to preventDefault)
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e) => {
            // Only block when intended or always if the user says it's annoying
            // The USER wants to leave zoom exclusively to the sidebar
            e.preventDefault();
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, []);

    const handleSettingChange = (field, value) => {
        onChange({
            ...currentSettings,
            [field]: value
        });
    };

    const handleCanvasChange = (field, value) => {
        onChange({
            ...currentSettings,
            canvas: {
                ...currentSettings.canvas,
                [field]: value
            }
        });
    };

    const handleCanvasUpdate = (updates) => {
        onChange({
            ...currentSettings,
            canvas: {
                ...currentSettings.canvas,
                ...updates
            }
        });
    };

    // --- Universal Pointer Events ---

    const handlePointerDown = (e) => {
        if (!src) return;
        // Ignore if already dragging with another finger/mouse
        if (activePointerId.current !== null) return;

        activePointerId.current = e.pointerId;
        setIsDragging(true);
        lastPos.current = { x: e.clientX, y: e.clientY };
        
        // Capture pointer to handle movement even outside the container
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        // ONLY react to the active pointer to prevent "strange" two-finger jumps
        if (!isDragging || e.pointerId !== activePointerId.current || !containerRef.current) return;

        const deltaX_px = e.clientX - lastPos.current.x;
        const deltaY_px = e.clientY - lastPos.current.y;
        
        const rect = containerRef.current.getBoundingClientRect();
        
        // --- NDE Math: Convert px relative delta to % of container ---
        const deltaX_pct = (deltaX_px / rect.width) * 100;
        const deltaY_pct = (deltaY_px / rect.height) * 100;

        const newX = currentSettings.x + deltaX_pct;
        const newY = currentSettings.y + deltaY_pct;

        lastPos.current = { x: e.clientX, y: e.clientY };

        onChange({
            ...currentSettings,
            x: parseFloat(newX.toFixed(2)),
            y: parseFloat(newY.toFixed(2))
        });
    };

    const handlePointerUp = (e) => {
        if (e.pointerId === activePointerId.current) {
            setIsDragging(false);
            activePointerId.current = null;
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
            }
        }
    };

    const shapes = [
        { id: 'square', label: 'Cuadrado', icon: '■', ratio: '1/1' },
        { id: 'wide', label: 'Rectángulo', icon: '▬', ratio: '16/9' },
        { id: 'original', label: 'Original', icon: '🖼️', ratio: 'auto' } // 'auto' will be recalculated on click
    ];

    return (
        <div className="image-settings-editor" style={{ marginTop: '1rem', userSelect: 'none' }}>
            {label && <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#2d3748', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>{label}</h5>}

            {src && (
                <div
                    className="interactive-preview-container"
                    style={{
                        textAlign: 'center',
                        marginBottom: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column', // MODIFIED to vertical stack
                        gap: '1.25rem',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <div
                        ref={containerRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        style={{
                            width: '100%', // Maximize width
                            maxWidth: '100%',
                            position: 'relative',
                            cursor: isDragging ? 'grabbing' : 'grab',
                            touchAction: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '12px',
                            background: '#f1f5f9'
                        }}
                    >
                        <SmartImage 
                            src={src} 
                            settings={currentSettings} 
                            isDragging={isDragging}
                            style={{
                                border: '2px solid #3b82f6',
                                boxShadow: '0 8px 30px rgba(59, 130, 246, 0.15)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                        />

                        {/* Floating Reset Button */}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange({
                                    ...currentSettings,
                                    x: 0,
                                    y: 0,
                                    zoom: 1
                                });
                            }}
                            title="Reiniciar encuadre"
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                background: 'rgba(255, 255, 255, 0.95)',
                                border: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                zIndex: 15,
                                fontSize: '1rem',
                                color: '#64748b'
                            }}
                        >
                            🔄
                        </button>

                        <div style={{
                            position: 'absolute',
                            bottom: '10px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: 'rgba(30, 41, 59, 0.7)',
                            color: 'white',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '0.65rem',
                            fontWeight: '500',
                            pointerEvents: 'none',
                            backdropFilter: 'blur(4px)',
                            zIndex: 10
                        }}>
                            {isDragging ? '🚀 Arrastrando...' : '✋ Arrastra para encuadrar'}
                        </div>
                    </div>

                    {/* Horizontal Zoom Control */}
                    <div className="zoom-controls-wrapper" style={{
                        width: '100%',
                        maxWidth: '400px',
                        padding: '0.75rem 1.25rem',
                        background: '#f8fafc',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem'
                    }}>
                        <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>➖</span>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                            <input
                                type="range"
                                min={0.2}
                                max={5}
                                step={0.05}
                                value={currentSettings.zoom}
                                onChange={(e) => handleSettingChange('zoom', parseFloat(e.target.value))}
                                style={{
                                    width: '100%',
                                    height: '6px',
                                    appearance: 'none',
                                    background: '#e2e8f0',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    accentColor: '#3b82f6'
                                }}
                            />
                        </div>
                        <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>➕</span>
                        <div style={{ 
                            minWidth: '45px',
                            fontSize: '0.85rem', 
                            fontWeight: '700', 
                            color: '#3b82f6',
                            textAlign: 'right'
                        }}>
                            {currentSettings.zoom.toFixed(2)}x
                        </div>
                    </div>
                </div>
            )}

            <div>
                {/* Accordion: Forma y Bordes */}
                {showShape && (
                    <div style={{ marginBottom: '1.25rem', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                        <div
                            onClick={() => setIsFormaExpanded(!isFormaExpanded)}
                            style={{
                                background: '#edf2f7',
                                padding: '0.75rem 1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontWeight: '500',
                                color: '#4a5568'
                            }}
                        >
                            <span>Lienzo y Marco</span>
                            <span style={{ fontSize: '1.2rem', transition: 'transform 0.2s', transform: isFormaExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                        </div>

                        {isFormaExpanded && (
                            <div style={{ padding: '1rem', background: '#fff' }}>
                                <div className="shape-selector">
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: '#4a5568', marginBottom: '0.5rem' }}>Proporción del Marco</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {shapes.map(shape => (
                                            <button
                                                key={shape.id}
                                                type="button"
                                                onClick={() => {
                                                    let finalRatio = shape.ratio;
                                                    
                                                    // Dynamic Logic for "Original" based on Golden Rule
                                                    if (shape.id === 'original') {
                                                        const imgElement = containerRef.current?.querySelector('img');
                                                        if (imgElement && imgElement.naturalWidth) {
                                                            finalRatio = `${imgElement.naturalWidth}/${imgElement.naturalHeight}`;
                                                        } else {
                                                            finalRatio = 'auto'; // Fallback if image not loaded yet
                                                        }
                                                    }

                                                    handleCanvasUpdate({
                                                        shape: shape.id,
                                                        aspectRatio: finalRatio
                                                    });
                                                }}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.6rem 0.4rem',
                                                    background: currentSettings.canvas.shape === shape.id ? '#ebf8ff' : 'white',
                                                    border: `1px solid ${currentSettings.canvas.shape === shape.id ? '#3182ce' : '#e2e8f0'}`,
                                                    borderRadius: '8px',
                                                    fontSize: '0.75rem',
                                                    color: currentSettings.canvas.shape === shape.id ? '#2b6cb0' : '#4a5568',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    boxShadow: currentSettings.canvas.shape === shape.id ? '0 2px 4px rgba(49, 130, 206, 0.2)' : 'none'
                                                }}
                                            >
                                                <span style={{ fontSize: '1.1rem' }}>{shape.icon}</span>
                                                {shape.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="shape-selector" style={{ marginTop: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: '#4a5568', marginBottom: '0.5rem' }}>Curvatura del Borde</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {[
                                            { id: 'none', label: 'Recto', icon: '⬛' },
                                            { id: 'sm', label: 'Suave', icon: '🔲' },
                                            { id: 'md', label: 'Redondeado', icon: '▢' },
                                            { id: 'full', label: 'Círculo', icon: '⏺' }
                                        ].map(radius => (
                                            <button
                                                key={radius.id}
                                                type="button"
                                                onClick={() => handleCanvasChange('radius', radius.id)}
                                                style={{
                                                    flex: 1,
                                                    padding: '0.5rem',
                                                    background: currentSettings.canvas.radius === radius.id ? '#ebf8ff' : 'white',
                                                    border: `1px solid ${currentSettings.canvas.radius === radius.id ? '#3182ce' : '#e2e8f0'}`,
                                                    borderRadius: '6px',
                                                    fontSize: '0.8rem',
                                                    color: currentSettings.canvas.radius === radius.id ? '#2b6cb0' : '#4a5568',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '2px',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <span style={{ fontSize: '1rem' }}>{radius.icon}</span>
                                                {radius.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Background Color */}
                                <div style={{ marginTop: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', color: '#4a5568', marginBottom: '0.5rem' }}>Color Fondo Lienzo</label>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <input 
                                            type="color" 
                                            value={currentSettings.canvas.bgColor}
                                            onChange={(e) => handleCanvasChange('bgColor', e.target.value)}
                                            style={{ width: '60px', height: '35px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', padding: '0' }}
                                        />
                                        <input 
                                            type="text" 
                                            value={currentSettings.canvas.bgColor}
                                            onChange={(e) => handleCanvasChange('bgColor', e.target.value)}
                                            placeholder="#FFFFFF"
                                            style={{ flex: 1, height: '35px', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '0 0.5rem', fontSize: '0.85rem' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageSettingsEditor;
