import React from 'react';
import { Plus, X } from 'lucide-react';
import './estudio.css';

/**
 * StudioCanvas
 * El lienzo WYSIWYG central.
 * - Ratio 21:9 en escritorio, 9:16 en móvil
 * - Tabs de escenas arriba (solo modo multi)
 * - Capas absolutas arrastrables
 * - Grid de fondo decorativo
 */
const StudioCanvas = ({
    canvasRef,
    scene, layers,
    activeLayerIdx, dragging, viewMode, viewport,
    mode,                       // 'single' | 'multi'
    borderRadius = '3px',
    scenes, activeSceneIdx,     // solo modo multi
    onSelectLayer, onDeselectLayer, onStartDrag,
    onSelectScene, onAddScene, onRemoveScene,   // solo modo multi
    desktopRatio, mobileRatio
}) => {
    const isMobile = viewport === 'mobile';
    const ratio = isMobile ? (mobileRatio || '9/16') : (desktopRatio || '21/9');
    // Para evitar que el lienzo se vuelva más alto que la pantalla (y se coma la UI de arriba/abajo)
    // calculamos el ancho máximo dinámicamente usando la altura disponible y el aspect ratio.
    const baseMaxW = isMobile ? '375px' : '1100px';
    const dynamicMaxW = `min(${baseMaxW}, calc((100vh - 240px) * (${ratio})))`;

    const getRadius = () => {
        const t = isMobile ? (scene.mobile_border_type || scene.border_type || 'soft') : (scene.border_type || 'soft');
        if (t === 'none') return '0px';
        if (t === 'soft') return isMobile ? '32px' : '40px';
        if (t === 'deep') return isMobile ? '60px' : '100px';
        return borderRadius;
    };

    return (
        <div
            className="est-escena"
            onClick={onDeselectLayer}
        >
            {/* Grid guía */}
            <div className="est-cuadricula" />

            {/* Tabs de escenas (multi) */}
            {mode === 'multi' && (
                <div className="est-escenas">
                    {scenes.map((_, i) => (
                        <div key={i} className={`est-escena-ficha${activeSceneIdx === i ? ' est-escena-ficha--activa' : ''}`}>
                            <button onClick={e => { e.stopPropagation(); onSelectScene(i); }}
                                className="est-escena-boton">
                                ESCENA {i + 1}
                            </button>
                            {scenes.length > 1 && activeSceneIdx === i && (
                                <button onClick={e => { e.stopPropagation(); onRemoveScene(i); }}
                                    className="est-escena-quitar"
                                    title="Eliminar Escena"
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <X size={12} strokeWidth={3} />
                                </button>
                            )}
                        </div>
                    ))}
                    <button onClick={e => { e.stopPropagation(); onAddScene(); }}
                        className="est-redondo"
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                        <Plus size={14} />
                    </button>
                </div>
            )}

            {/* El lienzo */}
            <div
                ref={canvasRef}
                style={{
                    width: '100%', maxWidth: dynamicMaxW,
                    aspectRatio: ratio,
                    background: (isMobile ? (scene.mobile_bg_color || scene.bg_color) : scene.bg_color) || '#1e1b4b',
                    position: 'relative', overflow: 'hidden',
                    borderRadius: getRadius(),
                    border: viewMode === 'edit' ? '1px solid rgba(143,6,83,0.5)' : 'none',
                    boxShadow: '0 30px 60px -12px rgba(0,0,0,0.25)',
                    transition: 'all 0.4s ease',
                    containerType: 'inline-size'
                }}
            >
                {[...layers].sort((a, b) => a.zIndex - b.zIndex).map(layer => {
                    const orig = layers.indexOf(layer);
                    const isSel = activeLayerIdx === orig && viewMode === 'edit';
                    return (
                        <div
                            key={layer.id}
                            onMouseDown={e => onStartDrag(e, orig)}
                            onClick={e => e.stopPropagation()}
                            style={{
                                position: 'absolute',
                                left: `${(isMobile ? (layer.mx ?? layer.x) : layer.x)}%`,
                                top: `${(isMobile ? (layer.my ?? layer.y) : layer.y)}%`,
                                zIndex: layer.zIndex,
                                transform: `translate(-50%,-50%) rotate(${(isMobile ? (layer.mr ?? layer.rotation) : (layer.rotation || 0))}deg)`,
                                cursor: viewMode === 'edit' ? (dragging?.idx === orig ? 'grabbing' : 'grab') : 'default',
                                width: layer.type === 'image' ? `${((isMobile ? (layer.ms ?? layer.scale) : (layer.scale || 1))) * 100}%` : 'auto',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                border: isSel ? '2px solid #8f0653' : '2px solid transparent',
                                borderRadius: '4px',
                                padding: '4px',
                                boxShadow: isSel ? '0 0 0 1px #8f0653, 0 0 30px rgba(143,6,83,0.35)' : 'none',
                                transition: dragging?.idx === orig ? 'none' : 'border-color 0.15s, box-shadow 0.15s',
                                userSelect: 'none'
                            }}
                        >
                            {/* Tooltip posición */}
                            {isSel && (
                                <div className="est-etiqueta-flotante">
                                    {(isMobile ? (layer.mx ?? layer.x) : layer.x)}%, {(isMobile ? (layer.my ?? layer.y) : layer.y)}%
                                </div>
                            )}

                            {layer.type === 'text' ? (
                                <div style={{ 
                                    color: layer.color || '#fff', 
                                    fontFamily: layer.fontFamily ? `"${layer.fontFamily}", sans-serif` : 'Outfit, sans-serif',
                                    fontSize: `calc(100cqw * ${(isMobile ? (layer.mf ?? layer.fontSize ?? 48) : (layer.fontSize || 48)) / 1000} * ${isMobile ? (layer.ms ?? layer.scale ?? 1) : (layer.scale || 1)})`,
                                    fontWeight: layer.fontWeight || '900', 
                                    fontStyle: layer.fontStyle || 'normal',
                                    whiteSpace: 'nowrap', 
                                    letterSpacing: '-0.03em', 
                                    lineHeight: '1', 
                                    pointerEvents: 'none' 
                                }}>
                                    {layer.content}
                                </div>
                            ) : (
                                <img
                                    src={layer.url ? `${layer.url}` : ''}
                                    style={{ display: 'block', width: '100%', height: 'auto', pointerEvents: 'none', borderRadius: isSel ? '3px' : '0' }}
                                    alt="" draggable={false}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Status bar */}
            <div className="est-pie-ayuda">
                <span>{isMobile ? `Móvil (${ratio})` : `Escritorio (${ratio})`}</span>
                <span>{layers.length} capas</span>
                <span className="est-marca-color">● {viewMode === 'edit' ? 'Arrastra los elementos' : 'Vista Previa'}</span>
            </div>
        </div>
    );
};

export default StudioCanvas;
