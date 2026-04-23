import React, { useState, useEffect, useRef } from 'react';

/**
 * SmartCanvas: Controlador Universal de Imagen con Enfoque Visual.
 * Permite calibrar Zoom, Posición X y Posición Y de forma persistente.
 * 
 * @param {string} src - URL de la imagen.
 * @param {object} config - Objeto { zoom: 1, x: 0, y: 0 }.
 * @param {string} mode - 'edit' o 'view'.
 * @param {function} onChange - Callback (config) ejecutado al mover controles en modo 'edit'.
 */
const SmartCanvas = ({ 
    src, 
    config = { zoom: 1, x: 0, y: 0, rotate: 0, brightness: 100 }, 
    mode = 'view', 
    onChange 
}) => {
    // Estado local para los parámetros visuales
    const [localConfig, setLocalConfig] = useState(config);
    const canvasRef = useRef(null);

    // Sincronizar con props externas
    useEffect(() => {
        setLocalConfig({ 
            zoom: config.zoom || 1, 
            x: config.x || 0, 
            y: config.y || 0, 
            rotate: config.rotate || 0, 
            brightness: config.brightness || 100 
        });
    }, [config]);

    const handleParamChange = (key, value) => {
        const newConfig = { ...localConfig, [key]: parseFloat(value) };
        setLocalConfig(newConfig);
        if (onChange) onChange(newConfig);
    };

    // Estilo del Contenedor (El "Lienzo")
    const canvasStyle = {
        position: 'relative',
        width: '100%',
        aspectRatio: '1 / 1', // Proporción cuadrada por defecto para catálogo
        overflow: 'hidden',
        backgroundColor: '#f0f0f0',
        borderRadius: '8px',
        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)',
        cursor: mode === 'edit' ? 'move' : 'default'
    };

    // Estilo de la Imagen (La "Capa Visual")
    const imageStyle = {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        transition: mode === 'view' ? 'transform 0.3s ease, filter 0.3s ease' : 'none',
        transform: `translate(${localConfig.x}%, ${localConfig.y}%) scale(${localConfig.zoom}) rotate(${localConfig.rotate || 0}deg)`,
        filter: `brightness(${localConfig.brightness || 100}%)`
    };

    return (
        <div className="smart-canvas-container" style={{ width: '100%' }}>
            {/* El Lienzo de Renderizado */}
            <div className="canvas-frame" style={canvasStyle} ref={canvasRef}>
                {src ? (
                    <img src={src} alt="Canvas Element" style={imageStyle} draggable={false} />
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#999' }}>
                        Sin Imagen
                    </div>
                )}
            </div>

            {/* Controles del Editor (Solo modo 'edit') */}
            {mode === 'edit' && src && (
                <div style={{ 
                    marginTop: '15px', 
                    padding: '15px', 
                    background: '#fff', 
                    borderRadius: '8px', 
                    border: '1px solid #ddd',
                    fontSize: '11px' 
                }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>🔍 Zoom: {localConfig.zoom.toFixed(2)}x</label>
                            <input 
                                type="range" min="1" max="5" step="0.01" 
                                value={localConfig.zoom} 
                                onChange={(e) => handleParamChange('zoom', e.target.value)} 
                                style={{ width: '100%', accentColor: '#8f0653' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>🔄 Rotar: {localConfig.rotate || 0}°</label>
                            <input 
                                type="range" min="-180" max="180" step="1" 
                                value={localConfig.rotate || 0} 
                                onChange={(e) => handleParamChange('rotate', e.target.value)} 
                                style={{ width: '100%', accentColor: '#333' }}
                            />
                        </div>
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>↔️ Pos X: {(localConfig.x || 0).toFixed(0)}%</label>
                            <input 
                                type="range" min="-100" max="100" step="1" 
                                value={localConfig.x || 0} 
                                onChange={(e) => handleParamChange('x', e.target.value)} 
                                style={{ width: '100%', accentColor: '#8f0653' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>↕️ Pos Y: {(localConfig.y || 0).toFixed(0)}%</label>
                            <input 
                                type="range" min="-100" max="100" step="1" 
                                value={localConfig.y || 0} 
                                onChange={(e) => handleParamChange('y', e.target.value)} 
                                style={{ width: '100%', accentColor: '#8f0653' }}
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: '10px' }}>
                        <label style={{ display: 'block', marginBottom: '5px' }}>💡 Brillo: {localConfig.brightness}%</label>
                        <input 
                            type="range" min="50" max="200" step="1" 
                            value={localConfig.brightness} 
                            onChange={(e) => handleParamChange('brightness', e.target.value)} 
                            style={{ width: '100%', accentColor: '#ffd700' }}
                        />
                    </div>

                    <button 
                        onClick={() => setLocalConfig({ zoom: 1, x: 0, y: 0, rotate: 0, brightness: 100 })}
                        style={{ marginTop: '15px', width: '100%', padding: '5px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Resetear Todo
                    </button>
                </div>
            )}
        </div>
    );
};

export default SmartCanvas;
