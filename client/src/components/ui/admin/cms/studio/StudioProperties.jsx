import React from 'react';

const label = { fontSize: '9px', fontWeight: '900', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em', display: 'block', marginBottom: '6px' };
const inputStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '10px 12px', borderRadius: '10px', color: '#fff', fontSize: '13px', width: '100%' };
const zBtn = { flex: 1, padding: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '10px' };
const swatch = (active, c) => ({ width: '26px', height: '26px', borderRadius: '50%', background: c, border: active ? '3px solid #fff' : '2px solid rgba(255,255,255,0.1)', cursor: 'pointer' });

const Prop = ({ label: lbl, children }) => (
    <div>
        <span style={label}>{lbl}</span>
        {children}
    </div>
);

const Slider = ({ min, max, step = 1, value, unit, onChange }) => (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} style={{ flex: 1 }} />
        <span style={{ fontSize: '10px', fontWeight: '800', minWidth: '36px', textAlign: 'right', color: 'rgba(255,255,255,0.5)' }}>{value}{unit}</span>
    </div>
);

const COLORS = ['#ffffff', '#000000', '#8f0653', '#1e1b4b', '#ffd700', '#ff4d4d', '#00c9a7'];

/**
 * StudioProperties
 * Panel derecho: propiedades de capa activa o propiedades del lienzo.
 */
const StudioProperties = ({ scene, activeLayer, activeLayerIdx, bgColor, breakpoint, viewport, onUpdateLayer, onUpdateScene, onUpdateBreakpoint, onRemoveLayer, onToggleCustomMobile, onResetMobile }) => {
    const isMobile = viewport === 'mobile';

    if (activeLayer) {
        return (
            <div style={{ width: '290px', background: 'rgba(0,0,0,0.3)', borderLeft: '1px solid rgba(255,255,255,0.05)', padding: '22px', overflowY: 'auto', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
                    <span style={{ ...label, marginBottom: 0 }}>PROPIEDADES DE CAPA</span>
                    <span style={{ fontSize: '9px', background: 'rgba(143,6,83,0.2)', color: '#c56fa8', padding: '2px 8px', borderRadius: '6px', fontWeight: '900' }}>
                        {activeLayer.type === 'text' ? 'TEXTO' : 'IMAGEN'}
                    </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                    <Prop label="VISIBILIDAD">
                        <div style={{ display: 'flex', gap: '8px' }}>
                            {[
                                { id: 'both', lbl: 'AMBOS' },
                                { id: 'desktop', lbl: 'PC' },
                                { id: 'mobile', lbl: 'MOVIL' }
                            ].map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => onUpdateLayer({ display: t.id })}
                                    style={{
                                        flex: 1,
                                        padding: '8px 4px',
                                        borderRadius: '8px',
                                        border: '1px solid',
                                        borderColor: (activeLayer.display || 'both') === t.id ? '#8f0653' : 'rgba(255,255,255,0.1)',
                                        background: (activeLayer.display || 'both') === t.id ? 'rgba(143,6,83,0.2)' : 'rgba(255,255,255,0.05)',
                                        color: (activeLayer.display || 'both') === t.id ? '#fff' : 'rgba(255,255,255,0.4)',
                                        fontSize: '9px',
                                        fontWeight: '900',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {t.lbl}
                                </button>
                            ))}
                        </div>
                    </Prop>

                    <Prop label="ENLACE (URL)">
                        <input 
                            type="text" 
                            style={{ ...inputStyle, fontSize: '11px' }} 
                            placeholder="/catalogo/producto/nombre-producto"
                            value={activeLayer.link || ''} 
                            onChange={e => onUpdateLayer({ link: e.target.value })} 
                        />
                    </Prop>

                    {activeLayer.type === 'text' && (
                        <>
                            <Prop label="CONTENIDO">
                                <input type="text" style={inputStyle} value={activeLayer.content || ''} onChange={e => onUpdateLayer({ content: e.target.value })} />
                            </Prop>
                            <Prop label="TAMAÑO DE FUENTE">
                                <Slider min={10} max={200} value={isMobile ? (activeLayer.mf ?? activeLayer.fontSize ?? 48) : (activeLayer.fontSize || 48)} unit="px" onChange={v => onUpdateLayer(isMobile ? { mf: v } : { fontSize: v })} />
                            </Prop>
                            <Prop label="COLOR">
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {COLORS.map(c => (
                                        <button key={c} style={swatch(activeLayer.color === c, c)} onClick={() => onUpdateLayer({ color: c })} />
                                    ))}
                                    <input type="color" value={activeLayer.color || '#fff'} onChange={e => onUpdateLayer({ color: e.target.value })} style={{ width: '26px', height: '26px', border: 'none', background: 'none', cursor: 'pointer' }} />
                                </div>
                            </Prop>
                        </>
                    )}

                    <Prop label="ESCALA">
                        <Slider min={0.1} max={5} step={0.05} value={isMobile ? (activeLayer.ms ?? activeLayer.scale ?? 1) : (activeLayer.scale || 1)} unit="x" onChange={v => onUpdateLayer(isMobile ? { ms: v } : { scale: v })} />
                    </Prop>

                    <Prop label="ROTACIÓN">
                        <Slider min={-180} max={180} value={isMobile ? (activeLayer.mr ?? activeLayer?.rotation ?? 0) : (activeLayer.rotation || 0)} unit="°" onChange={v => onUpdateLayer(isMobile ? { mr: v } : { rotation: v })} />
                    </Prop>

                    <Prop label="ORDEN Z">
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button style={zBtn} onClick={() => onUpdateLayer({ zIndex: Math.max(1, activeLayer.zIndex - 1) })}>↓ BAJAR</button>
                            <span style={{ flex: 1, textAlign: 'center', fontWeight: '900', fontSize: '15px' }}>{activeLayer.zIndex}</span>
                            <button style={zBtn} onClick={() => onUpdateLayer({ zIndex: activeLayer.zIndex + 1 })}>↑ SUBIR</button>
                        </div>
                    </Prop>

                    <button onClick={onRemoveLayer} style={{ padding: '10px', borderRadius: '10px', border: '1px solid rgba(255,77,77,0.3)', color: '#ff4d4d', background: 'transparent', fontWeight: '800', fontSize: '11px', cursor: 'pointer', marginTop: '4px' }}>
                        Eliminar capa
                    </button>
                </div>
            </div>
        );
    }

    // Propiedades del lienzo (ninguna capa seleccionada)
    return (
        <div style={{ width: '290px', background: 'rgba(0,0,0,0.3)', borderLeft: '1px solid rgba(255,255,255,0.05)', padding: '22px', overflowY: 'auto', flexShrink: 0 }}>
            <span style={{ ...label, marginBottom: '20px', display: 'block' }}>PROPIEDADES DEL LIENZO</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                <Prop label="COLOR DE FONDO">
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ position: 'relative', width: '42px', height: '42px', borderRadius: '10px', background: isMobile ? (scene.mobile_bg_color || scene.bg_color) : (scene.bg_color || '#1e1b4b'), border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', flexShrink: 0 }}>
                            <input type="color" value={isMobile ? (scene.mobile_bg_color || scene.bg_color || '#1e1b4b') : (scene.bg_color || '#1e1b4b')} onChange={e => onUpdateScene({ bg_color: e.target.value })} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                        </div>
                        <input type="text" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '12px' }} value={isMobile ? (scene.mobile_bg_color || scene.bg_color || '#1e1b4b') : (scene.bg_color || '#1e1b4b')} onChange={e => onUpdateScene({ bg_color: e.target.value })} />
                    </div>
                </Prop>

                <Prop label={isMobile ? "ESTILO DE BORDES (SÓLO MÓVIL)" : "ESTILO DE BORDES (ESCRITORIO)"}>
                    <div style={{ display: 'flex', gap: '8px', padding: isMobile ? '4px' : '0', background: isMobile ? 'rgba(143,6,83,0.05)' : 'transparent', borderRadius: '10px' }}>
                        {[
                            { id: 'none', lbl: 'RECTO' },
                            { id: 'soft', lbl: 'SUAVE' },
                            { id: 'deep', lbl: 'REDONDO' }
                        ].map(t => {
                            const isCustom = isMobile && scene.mobile_border_type === t.id;
                            const active = (isMobile ? (scene.mobile_border_type || scene.border_type || 'soft') : (scene.border_type || 'soft')) === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => onUpdateScene({ border_type: t.id })}
                                    style={{
                                        flex: 1,
                                        padding: '8px 4px',
                                        borderRadius: '8px',
                                        border: '1px solid',
                                        borderColor: active ? (isCustom ? '#ff4d94' : '#8f0653') : 'rgba(255,255,255,0.1)',
                                        background: active ? (isCustom ? 'rgba(143,6,83,0.4)' : 'rgba(143,6,83,0.2)') : 'rgba(255,255,255,0.05)',
                                        color: active ? '#fff' : 'rgba(255,255,255,0.4)',
                                        fontSize: '9px',
                                        fontWeight: '900',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        boxShadow: isCustom ? '0 0 10px rgba(143,6,83,0.3)' : 'none'
                                    }}
                                >
                                    {t.lbl}
                                </button>
                            );
                        })}
                    </div>
                    {isMobile && scene.mobile_border_type && (
                        <button 
                            onClick={() => onUpdateScene({ mobile_border_type: null })}
                            style={{ background: 'none', border: 'none', color: '#8f0653', fontSize: '9px', fontWeight: '800', marginTop: '6px', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                            RESTAURAR SEGÚN ESCRITORIO
                        </button>
                    )}
                </Prop>

                <div style={{ padding: '14px', borderRadius: '12px', background: 'rgba(143,6,83,0.05)', border: '1px solid rgba(143,6,83,0.15)', fontSize: '10px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.6' }}>
                    Selecciona una capa en el lienzo o en el panel izquierdo para editar sus propiedades.
                </div>
            </div>
        </div>
    );
};

export default StudioProperties;
