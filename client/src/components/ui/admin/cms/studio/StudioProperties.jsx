import React from 'react';
import './estudio.css';

const zBtn = { flex: 1, padding: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: '800', fontSize: '10px' };
const swatch = (active, c) => ({ width: '26px', height: '26px', borderRadius: '50%', background: c, border: active ? '3px solid #fff' : '2px solid rgba(255,255,255,0.1)', cursor: 'pointer' });

const Prop = ({ label: lbl, children }) => (
    <div>
        <span className="est-rotulo">{lbl}</span>
        {children}
    </div>
);

const Slider = ({ min, max, step = 1, value, unit, onChange }) => (
    <div className="est-fila--suelta">
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} className="est-flexible" />
        <span className="est-valor">{value}{unit}</span>
    </div>
);

const COLORS = ['#ffffff', '#000000', '#8f0653', '#1e1b4b', '#ffd700', '#ff4d4d', '#00c9a7'];

/**
 * StudioProperties
 * Panel derecho: propiedades de capa activa o propiedades del lienzo.
 */
const StudioProperties = ({ scene, activeLayer, activeLayerIdx, bgColor, breakpoint, viewport, mode, carouselInterval, onUpdateCarouselInterval, desktopRatio, setDesktopRatio, mobileRatio, setMobileRatio, onApplyBgToAllScenes, onDuplicateDesignToAllScenes, onMoveLayerZ, onUpdateLayer, onUpdateScene, onUpdateBreakpoint, onRemoveLayer, onToggleCustomMobile, onResetMobile, isDeviceMobile }) => {
    const isMobile = viewport === 'mobile';

    if (activeLayer) {
        return (
            <div style={{ width: isDeviceMobile ? '100%' : '290px', background: 'rgba(0,0,0,0.3)', borderLeft: '1px solid rgba(255,255,255,0.05)', padding: isDeviceMobile ? '16px' : '22px', overflowY: 'auto', flexShrink: 0 }}>
                <div className="est-cabecera">
                    <span className="est-rotulo est-rotulo--pegado">PROPIEDADES DE CAPA</span>
                    <span className="est-insignia">
                        {activeLayer.type === 'text' ? 'TEXTO' : 'IMAGEN'}
                    </span>
                </div>

                <div className="est-columna--amplia">

                    <Prop label="¿DÓNDE MOSTRAR ESTE ELEMENTO?">
                        <div className="est-fila">
                            {[
                                { id: 'both', lbl: 'AMBOS' },
                                { id: 'desktop', lbl: 'SOLO PC' },
                                { id: 'mobile', lbl: 'SOLO MÓVIL' }
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
                            className="est-campo est-campo--menor" 
                            placeholder="/catalogo/producto/nombre-producto"
                            value={activeLayer.link || ''} 
                            onChange={e => onUpdateLayer({ link: e.target.value })} 
                        />
                    </Prop>

                    {activeLayer.type === 'text' && (
                        <>
                            <Prop label="CONTENIDO">
                                <input type="text" className="est-campo" value={activeLayer.content || ''} onChange={e => onUpdateLayer({ content: e.target.value })} />
                            </Prop>
                            <Prop label="FUENTE">
                                <select 
                                    className="est-campo est-campo--junto"
                                    value={activeLayer.fontFamily || 'Outfit'}
                                    onChange={e => onUpdateLayer({ fontFamily: e.target.value })}
                                >
                                    <option value="Outfit" style={{ background: '#1e1b4b', color: '#fff' }}>Outfit</option>
                                    <option value="Inter" style={{ background: '#1e1b4b', color: '#fff' }}>Inter</option>
                                    <option value="Playfair Display" style={{ background: '#1e1b4b', color: '#fff' }}>Playfair Display</option>
                                    <option value="Montserrat" style={{ background: '#1e1b4b', color: '#fff' }}>Montserrat</option>
                                    <option value="Cinzel" style={{ background: '#1e1b4b', color: '#fff' }}>Cinzel</option>
                                    <option value="Arial" style={{ background: '#1e1b4b', color: '#fff' }}>Arial</option>
                                    <option value="Times New Roman" style={{ background: '#1e1b4b', color: '#fff' }}>Times New Roman</option>
                                    <option value="Courier New" style={{ background: '#1e1b4b', color: '#fff' }}>Courier New</option>
                                </select>
                            </Prop>
                            <Prop label="ESTILO (NEGRITA / CURSIVA)">
                                <div className="est-fila--separada">
                                    {[
                                        { id: 'normal', lbl: 'N', weight: '400' },
                                        { id: 'bold', lbl: 'B', weight: '700' },
                                        { id: 'black', lbl: 'BLACK', weight: '900' }
                                    ].map(w => (
                                        <button 
                                            key={w.id}
                                            onClick={() => onUpdateLayer({ fontWeight: w.weight })}
                                            style={{
                                                flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid',
                                                borderColor: (activeLayer.fontWeight || '900') === w.weight ? '#8f0653' : 'rgba(255,255,255,0.1)',
                                                background: (activeLayer.fontWeight || '900') === w.weight ? 'rgba(143,6,83,0.2)' : 'rgba(255,255,255,0.05)',
                                                color: (activeLayer.fontWeight || '900') === w.weight ? '#fff' : 'rgba(255,255,255,0.4)',
                                                fontWeight: w.weight, fontSize: '11px', cursor: 'pointer'
                                            }}
                                        >
                                            {w.lbl}
                                        </button>
                                    ))}
                                    <button 
                                        onClick={() => onUpdateLayer({ fontStyle: activeLayer.fontStyle === 'italic' ? 'normal' : 'italic' })}
                                        style={{
                                            flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid',
                                            borderColor: activeLayer.fontStyle === 'italic' ? '#8f0653' : 'rgba(255,255,255,0.1)',
                                            background: activeLayer.fontStyle === 'italic' ? 'rgba(143,6,83,0.2)' : 'rgba(255,255,255,0.05)',
                                            color: activeLayer.fontStyle === 'italic' ? '#fff' : 'rgba(255,255,255,0.4)',
                                            fontStyle: 'italic', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer'
                                        }}
                                    >
                                        I
                                    </button>
                                </div>
                            </Prop>
                            <Prop label="TAMAÑO DE FUENTE">
                                <Slider min={10} max={200} value={isMobile ? (activeLayer.mf ?? activeLayer.fontSize ?? 48) : (activeLayer.fontSize || 48)} unit="px" onChange={v => onUpdateLayer(isMobile ? { mf: v } : { fontSize: v })} />
                            </Prop>
                            <Prop label="COLOR">
                                <div className="est-fila--envuelve">
                                    {COLORS.map(c => (
                                        <button key={c} style={swatch(activeLayer.color === c, c)} onClick={() => onUpdateLayer({ color: c })} />
                                    ))}
                                    <input type="color" value={activeLayer.color || '#fff'} onChange={e => onUpdateLayer({ color: e.target.value })} className="est-icono" />
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
                        <div className="est-fila--centrada">
                            <button style={zBtn} onClick={() => onMoveLayerZ(activeLayerIdx, 'down')}>↓ BAJAR</button>
                            <span className="est-titulo">{activeLayer.zIndex}</span>
                            <button style={zBtn} onClick={() => onMoveLayerZ(activeLayerIdx, 'up')}>↑ SUBIR</button>
                        </div>
                    </Prop>

                    <button onClick={onRemoveLayer} className="est-quitar">
                        Eliminar capa
                    </button>
                </div>
            </div>
        );
    }

    // Propiedades del lienzo (ninguna capa seleccionada)
    return (
        <div style={{ width: isDeviceMobile ? '100%' : '320px', background: 'rgba(0,0,0,0.4)', borderLeft: '1px solid rgba(255,255,255,0.05)', padding: isDeviceMobile ? '16px' : '22px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {/* Header Sticky */}
            <span className="est-rotulo est-rotulo--suelto">PROPIEDADES DEL LIENZO</span>
            <div className="est-columna--amplia">

                <Prop label="COLOR DE FONDO">
                    <div className="est-fila--suelta">
                        <div style={{ position: 'relative', width: '42px', height: '42px', borderRadius: '10px', background: isMobile ? (scene.mobile_bg_color || scene.bg_color) : (scene.bg_color || '#1e1b4b'), border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', flexShrink: 0 }}>
                            <input type="color" value={isMobile ? (scene.mobile_bg_color || scene.bg_color || '#1e1b4b') : (scene.bg_color || '#1e1b4b')} onChange={e => onUpdateScene({ bg_color: e.target.value })} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
                        </div>
                        <input type="text" className="est-campo est-campo--codigo" value={isMobile ? (scene.mobile_bg_color || scene.bg_color || '#1e1b4b') : (scene.bg_color || '#1e1b4b')} onChange={e => onUpdateScene({ bg_color: e.target.value })} />
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
                            className="est-enlace"
                        >
                            RESTAURAR SEGÚN ESCRITORIO
                        </button>
                    )}
                </Prop>

                <Prop label={isMobile ? "PROPORCIÓN (MÓVIL)" : "PROPORCIÓN (ESCRITORIO)"}>
                    <div className="est-pestanas">
                        {[
                            { id: isMobile ? '9/16' : '21/9', lbl: isMobile ? 'VERTICAL' : 'ULTRAWIDE' },
                            { id: '16/9', lbl: 'CLÁSICO' },
                            { id: '1/1', lbl: 'CUADRADO' }
                        ].map(t => {
                            const active = (isMobile ? mobileRatio : desktopRatio) === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => isMobile ? setMobileRatio(t.id) : setDesktopRatio(t.id)}
                                    style={{
                                        flex: 1,
                                        padding: '8px 4px',
                                        borderRadius: '8px',
                                        border: '1px solid',
                                        borderColor: active ? '#8f0653' : 'transparent',
                                        background: active ? 'rgba(143,6,83,0.2)' : 'transparent',
                                        color: active ? '#fff' : 'rgba(255,255,255,0.4)',
                                        fontSize: '9px',
                                        fontWeight: '900',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {t.lbl}
                                </button>
                            );
                        })}
                    </div>
                </Prop>

                {mode === 'multi' && (
                    <>
                        <Prop label="TIEMPO DE CARRUSEL">
                            <Slider min={1} max={15} step={0.5} value={carouselInterval} unit="s" onChange={v => onUpdateCarouselInterval(v)} />
                        </Prop>

                        <div className="est-caja">
                            <span className="est-rotulo est-rotulo--claro">DISEÑO GLOBAL</span>
                            <div className="est-columna">
                                <button 
                                    onClick={onApplyBgToAllScenes}
                                    className="est-pestana"
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    {isDeviceMobile ? 'Aplicar fondo a todo' : 'Aplicar color actual a todas las escenas'}
                                </button>
                                <button 
                                    onClick={onDuplicateDesignToAllScenes}
                                    className="est-pestana est-pestana--activa"
                                    onMouseEnter={e => e.currentTarget.style.background = '#a60862'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#8f0653'}
                                >
                                    {isDeviceMobile ? 'Duplicar diseño a todo' : 'Duplicar diseño a todas las escenas'}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                <div className="est-nota">
                    Selecciona una capa en el lienzo o en el panel izquierdo para editar sus propiedades.
                </div>
            </div>
        </div>
    );
};

export default StudioProperties;
