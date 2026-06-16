import React from 'react';
import { Layers, Type, Image as ImageIcon, Package, Trash2, Palette } from 'lucide-react';

const row = (active) => ({
    padding: '8px 12px', borderRadius: '12px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '10px', transition: 'all 0.2s',
    border: `1px solid ${active ? '#8f0653' : 'transparent'}`,
    background: active ? 'rgba(143,6,83,0.15)' : 'rgba(255,255,255,0.03)',
    transform: active ? 'translateX(3px)' : 'none'
});

const addBtn = (span2 = false) => ({
    padding: '10px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.03)', color: '#fff',
    border: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
    gridColumn: span2 ? 'span 2' : undefined, transition: 'all 0.2s'
});

const thumb = { width: '26px', height: '26px', borderRadius: '6px', background: '#fff', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' };

/**
 * StudioLayerPanel
 * Panel izquierdo: lista de capas (con color de fondo como capa especial)
 * y botones para añadir nuevos elementos.
 */
const StudioLayerPanel = ({
    layers, activeLayerIdx, bgColor, viewport,
    onSelectLayer, onRemoveLayer, onBgColorChange,
    onAddText, onAddFromGallery, onAddFromCatalog, isDeviceMobile
}) => (
    <div style={{ width: isDeviceMobile ? '100%' : '300px', background: 'rgba(0,0,0,0.4)', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <span style={{ fontSize: '10px', fontWeight: '900', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Capas</span>
                <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '100px', fontWeight: '800' }}>{layers.length}</span>
            </div>

            {/* Fondo */}
            <div style={{ ...row(false), marginBottom: '6px' }}>
                <div style={{ ...thumb, background: bgColor, border: '2px solid rgba(255,255,255,0.15)' }} />
                <div style={{ flex: 1, fontSize: '11px', fontWeight: '900' }}>Fondo</div>
                <div style={{ position: 'relative' }}>
                    <Palette size={13} color="rgba(255,255,255,0.4)" />
                    <input type="color" value={bgColor} onChange={e => onBgColorChange(e.target.value)}
                        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                </div>
            </div>

            {/* Capas (orden Z desc) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {layers.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.12)' }}>
                        <Layers size={24} style={{ marginBottom: '8px' }} />
                        <p style={{ fontSize: '10px', margin: 0 }}>Sin elementos</p>
                        <p style={{ fontSize: '9px', margin: '4px 0 0', opacity: 0.6 }}>Añade texto o imágenes</p>
                    </div>
                )}
                {[...layers].sort((a, b) => b.zIndex - a.zIndex).map(layer => {
                    const orig = layers.indexOf(layer);
                    const active = activeLayerIdx === orig;
                    return (
                        <div key={layer.id} style={row(active)} onClick={() => onSelectLayer(orig)}>
                            <div style={thumb}>
                                {layer.type === 'text'
                                    ? <Type size={12} color="#000" />
                                    : <img src={`${(window.location.origin.includes('localhost') ? 'http://localhost:8000' : '')}${layer.url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '11px', fontWeight: '900', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {layer.type === 'text' ? (layer.content || 'Texto') : 'Imagen'}
                                </div>
                                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: '700' }}>Z: {layer.zIndex}</div>
                            </div>
                            {active && (
                                <button onClick={e => { e.stopPropagation(); onRemoveLayer(orig); }}
                                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: '2px' }}
                                    onMouseEnter={e => e.currentTarget.style.color = '#ff4d4d'}
                                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}>
                                    <Trash2 size={11} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Botones añadir */}
        <div style={{ padding: '14px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)' }}>
            {viewport === 'mobile' && (
                <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: '700', textAlign: 'center', marginBottom: '10px' }}>
                    Editando capas MÓVIL
                </p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {[
                    { label: 'TEXTO',    icon: <Type size={16}/>,        action: onAddText,        span: false },
                    { label: 'GALERÍA',  icon: <ImageIcon size={16}/>,   action: onAddFromGallery, span: false },
                    { label: 'CATÁLOGO', icon: <Package size={16}/>,     action: onAddFromCatalog, span: true  },
                ].map(b => (
                    <button key={b.label} style={addBtn(b.span)} onClick={b.action}
                        onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.12)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'; }}>
                        {b.icon}
                        <span style={{ fontSize: '9px', fontWeight: '900', letterSpacing: '0.05em' }}>{b.label}</span>
                    </button>
                ))}
            </div>
        </div>
    </div>
);

export default StudioLayerPanel;
