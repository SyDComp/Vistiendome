import React from 'react';
import { Plus, X } from 'lucide-react';

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
            style={{ flex: 1, background: '#080808', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', position: 'relative', overflow: 'hidden' }}
            onClick={onDeselectLayer}
        >
            {/* Grid guía */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.022, pointerEvents: 'none', background: 'linear-gradient(rgba(255,255,255,0.1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)', backgroundSize: '80px 80px' }} />

            {/* Tabs de escenas (multi) */}
            {mode === 'multi' && (
                <div style={{ position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', width: 'max-content', maxWidth: '90vw', gap: '6px', padding: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', zIndex: 10 }}>
                    {scenes.map((_, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', background: activeSceneIdx === i ? '#8f0653' : 'transparent', borderRadius: '100px', transition: 'all 0.25s' }}>
                            <button onClick={e => { e.stopPropagation(); onSelectScene(i); }}
                                style={{ padding: '6px 16px', borderRadius: '100px', border: 'none', background: 'transparent', color: activeSceneIdx === i ? '#fff' : 'rgba(255,255,255,0.4)', fontSize: '10px', fontWeight: '900', cursor: 'pointer', paddingRight: (activeSceneIdx === i && scenes.length > 1) ? '6px' : '16px' }}>
                                ESCENA {i + 1}
                            </button>
                            {scenes.length > 1 && activeSceneIdx === i && (
                                <button onClick={e => { e.stopPropagation(); onRemoveScene(i); }}
                                    style={{ background: 'transparent', border: 'none', color: '#ffb3b3', cursor: 'pointer', display: 'flex', padding: '4px', marginRight: '6px', borderRadius: '50%' }}
                                    title="Eliminar Escena"
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <X size={12} strokeWidth={3} />
                                </button>
                            )}
                        </div>
                    ))}
                    <button onClick={e => { e.stopPropagation(); onAddScene(); }}
                        style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                                <div style={{ position: 'absolute', top: '-30px', left: '50%', transform: 'translateX(-50%)', background: '#8f0653', color: '#fff', fontSize: '9px', padding: '3px 8px', borderRadius: '5px', fontWeight: '900', whiteSpace: 'nowrap', pointerEvents: 'none' }}>
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
            <div style={{ marginTop: '18px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', color: 'rgba(255,255,255,0.25)', fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'center' }}>
                <span>{isMobile ? `Móvil (${ratio})` : `Escritorio (${ratio})`}</span>
                <span>{layers.length} capas</span>
                <span style={{ color: '#8f0653' }}>● {viewMode === 'edit' ? 'Arrastra los elementos' : 'Vista Previa'}</span>
            </div>
        </div>
    );
};

export default StudioCanvas;
