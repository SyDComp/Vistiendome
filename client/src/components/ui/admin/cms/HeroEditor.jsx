import React, { useState, useEffect, useRef } from 'react';
import {
    X, Save, Eye, Layers, Type, Image as ImageIcon,
    Trash2, Plus, Sparkles, Palette
} from 'lucide-react';
import MediaGallery from '../../../interface/admin/media/MediaGallery';
import LibraryPicker from '../../../interface/admin/inventory/LibraryPicker';

/* ─────────────────────────────────────────────
   Studio de Portada
   Funciona igual que CompositionEditor pero sin
   slides múltiples: un solo lienzo (banner).
───────────────────────────────────────────── */
const HeroEditor = ({ isOpen, onClose, data, onSave }) => {

    // ── Estado principal ──────────────────────
    const [bgColor,    setBgColor]    = useState('#1e1b4b');
    const [layers,     setLayers]     = useState([]);
    const [activeIdx,  setActiveIdx]  = useState(null);
    const [dragging,   setDragging]   = useState(null);
    const [viewMode,   setViewMode]   = useState('edit');
    const [showGallery, setShowGallery] = useState(false);
    const [showLibrary, setShowLibrary] = useState(false);
    const canvasRef = useRef(null);

    // ── Leer datos al abrir ───────────────────
    useEffect(() => {
        if (!isOpen) return;
        const cfg = data?.config || {};
        setBgColor(cfg.bg_color || '#1e1b4b');
        setLayers(cfg.layers   || []);
        setActiveIdx(null);
    }, [isOpen, data]);

    // ── Capa activa ───────────────────────────
    const activeLayer = activeIdx !== null ? layers[activeIdx] : null;

    // ── Helpers de capas ──────────────────────
    const updateLayer = (idx, patch) =>
        setLayers(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l));

    const addLayer = (type, extra = {}) => {
        const newLayer = {
            id: Date.now(),
            type,
            x: 50, y: 50,
            scale: 1, rotation: 0,
            zIndex: layers.length + 1,
            ...extra
        };
        if (type === 'text') { newLayer.content = 'Nuevo texto'; newLayer.color = '#ffffff'; newLayer.fontSize = 48; }
        setLayers(prev => { const next = [...prev, newLayer]; setActiveIdx(next.length - 1); return next; });
    };

    const removeLayer = (idx) => {
        setLayers(prev => prev.filter((_, i) => i !== idx));
        setActiveIdx(null);
    };

    // ── Drag sobre el canvas ──────────────────
    const handleMouseDown = (e, idx) => {
        if (viewMode === 'preview') return;
        e.stopPropagation();
        setActiveIdx(idx);
        const layer = layers[idx];
        setDragging({ idx, startX: e.clientX, startY: e.clientY, initX: layer.x, initY: layer.y });
    };

    useEffect(() => {
        const onMove = (e) => {
            if (!dragging || !canvasRef.current) return;
            const rect = canvasRef.current.getBoundingClientRect();
            const dx = ((e.clientX - dragging.startX) / rect.width)  * 100;
            const dy = ((e.clientY - dragging.startY) / rect.height) * 100;
            updateLayer(dragging.idx, {
                x: Math.round(Math.max(0, Math.min(100, dragging.initX + dx))),
                y: Math.round(Math.max(0, Math.min(100, dragging.initY + dy)))
            });
        };
        const onUp = () => setDragging(null);
        if (dragging) { window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp); }
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, [dragging]);

    // ── Guardar ───────────────────────────────
    const handleSave = () => {
        onSave({ ...data, config: { bg_color: bgColor, layers } });
        onClose();
    };

    if (!isOpen) return null;

    // ── RENDER ────────────────────────────────
    return (
        <div style={{ position:'fixed', inset:0, zIndex:5000, background:'rgba(10,8,28,0.98)', backdropFilter:'blur(15px)', display:'flex', flexDirection:'column', color:'#fff', fontFamily:'Inter, sans-serif', animation:'fadeIn 0.3s ease' }}>

            {/* ── Header ─────────────────────────── */}
            <div style={{ padding:'18px 32px', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(0,0,0,0.3)', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
                    <div style={{ background:'linear-gradient(135deg,#8f0653,#50032e)', padding:'10px', borderRadius:'12px', boxShadow:'0 8px 16px rgba(143,6,83,0.3)' }}>
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h2 style={{ margin:0, fontSize:'16px', fontWeight:'900', letterSpacing:'-0.02em', background:'linear-gradient(to right,#fff,rgba(255,255,255,0.6))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>STUDIO DE PORTADA</h2>
                        <p style={{ margin:0, fontSize:'10px', color:'rgba(255,255,255,0.3)', fontWeight:'700', textTransform:'uppercase', letterSpacing:'0.08em' }}>Diseña tu banner principal · Sistema de capas</p>
                    </div>
                </div>
                <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                    <button onClick={() => setViewMode(v => v === 'edit' ? 'preview' : 'edit')} style={{ padding:'8px 18px', borderRadius:'10px', border:'1px solid rgba(255,255,255,0.1)', background: viewMode === 'preview' ? '#fff' : 'rgba(255,255,255,0.05)', color: viewMode === 'preview' ? '#000' : '#fff', fontWeight:'800', fontSize:'11px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
                        <Eye size={13} /> {viewMode === 'preview' ? 'VOLVER' : 'VISTA PREVIA'}
                    </button>
                    <button onClick={handleSave} style={{ padding:'8px 20px', borderRadius:'10px', background:'#8f0653', color:'#fff', border:'none', fontWeight:'900', fontSize:'11px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', boxShadow:'0 8px 20px rgba(143,6,83,0.4)' }}>
                        <Save size={13} /> GUARDAR BORRADOR
                    </button>
                    <button onClick={onClose} style={{ background:'rgba(255,255,255,0.05)', border:'none', color:'#fff', width:'40px', height:'40px', borderRadius:'10px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* ── Main ───────────────────────────── */}
            <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

                {/* LEFT: Panel de Capas */}
                <div style={{ width:'280px', background:'rgba(0,0,0,0.4)', borderRight:'1px solid rgba(255,255,255,0.05)', display:'flex', flexDirection:'column' }}>
                    {/* Lista */}
                    <div style={{ flex:1, overflowY:'auto', padding:'20px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                            <span style={{ fontSize:'10px', fontWeight:'900', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Capas</span>
                            <span style={{ fontSize:'10px', background:'rgba(255,255,255,0.05)', padding:'2px 8px', borderRadius:'100px', fontWeight:'800' }}>{layers.length}</span>
                        </div>

                        {/* Fondo de color (siempre primero) */}
                        <div style={{ padding:'10px 12px', borderRadius:'12px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)', marginBottom:'8px', display:'flex', alignItems:'center', gap:'10px' }}>
                            <div style={{ width:'28px', height:'28px', borderRadius:'6px', background: bgColor, border:'2px solid rgba(255,255,255,0.2)', flexShrink:0 }} />
                            <div style={{ flex:1, fontSize:'11px', fontWeight:'900' }}>Fondo</div>
                            <div style={{ position:'relative' }}>
                                <Palette size={14} color="rgba(255,255,255,0.4)" />
                                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }} />
                            </div>
                        </div>

                        {/* Capas (orden Z invertido para UX) */}
                        <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                            {layers.length === 0 && (
                                <div style={{ textAlign:'center', padding:'40px 0', color:'rgba(255,255,255,0.15)' }}>
                                    <Layers size={28} style={{ marginBottom:'10px' }} />
                                    <p style={{ fontSize:'11px', margin:0 }}>Sin elementos</p>
                                </div>
                            )}
                            {[...layers].sort((a,b) => b.zIndex - a.zIndex).map(layer => {
                                const origIdx = layers.indexOf(layer);
                                const isSel = activeIdx === origIdx;
                                return (
                                    <div key={layer.id} onClick={() => setActiveIdx(origIdx)} style={{ padding:'8px 12px', borderRadius:'12px', border:`1px solid ${isSel ? '#8f0653' : 'transparent'}`, background: isSel ? 'rgba(143,6,83,0.15)' : 'rgba(255,255,255,0.03)', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px', transition:'all 0.2s', transform: isSel ? 'translateX(3px)' : 'none' }}>
                                        <div style={{ width:'28px', height:'28px', borderRadius:'6px', background:'#fff', overflow:'hidden', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                            {layer.type === 'text'
                                                ? <Type size={13} color="#000" />
                                                : <img src={`${(window.location.origin.includes('localhost') ? 'http://localhost:8000' : '')}${layer.url}`} style={{ width:'100%', height:'100%', objectFit:'cover' }} alt="" />
                                            }
                                        </div>
                                        <div style={{ flex:1, minWidth:0 }}>
                                            <div style={{ fontSize:'11px', fontWeight:'900', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                                {layer.type === 'text' ? (layer.content || 'Texto') : 'Imagen'}
                                            </div>
                                            <div style={{ fontSize:'9px', color:'rgba(255,255,255,0.3)', fontWeight:'700' }}>Z-INDEX: {layer.zIndex}</div>
                                        </div>
                                        {isSel && (
                                            <button onClick={e => { e.stopPropagation(); removeLayer(origIdx); }} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.3)', cursor:'pointer', padding:'4px' }} onMouseEnter={e => e.currentTarget.style.color='#ff4d4d'} onMouseLeave={e => e.currentTarget.style.color='rgba(255,255,255,0.3)'}>
                                                <Trash2 size={12} />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Botones añadir elemento */}
                    <div style={{ padding:'16px', borderTop:'1px solid rgba(255,255,255,0.05)', background:'rgba(0,0,0,0.2)' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                            {[
                                { label:'TEXTO', icon:<Type size={18}/>, action: () => addLayer('text') },
                                { label:'GALERÍA', icon:<ImageIcon size={18}/>, action: () => setShowGallery(true) },
                                { label:'CATÁLOGO', icon:<Layers size={18}/>, action: () => setShowLibrary(true) },
                            ].map(btn => (
                                <button key={btn.label} onClick={btn.action} style={{ padding:'12px', borderRadius:'12px', background:'rgba(255,255,255,0.03)', color:'#fff', border:'1px solid rgba(255,255,255,0.05)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', gridColumn: btn.label === 'CATÁLOGO' ? 'span 2' : undefined, transition:'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.12)'; }} onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.05)'; }}>
                                    {btn.icon}
                                    <span style={{ fontSize:'9px', fontWeight:'900', letterSpacing:'0.05em' }}>{btn.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CENTER: Canvas */}
                <div style={{ flex:1, background:'#080808', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'48px', position:'relative', overflow:'hidden' }} onClick={() => setActiveIdx(null)}>
                    {/* Grid guía */}
                    <div style={{ position:'absolute', inset:0, opacity:0.025, pointerEvents:'none', background:'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg,rgba(255,255,255,0.1) 1px,transparent 1px)', backgroundSize:'80px 80px' }} />

                    {/* El lienzo */}
                    <div
                        ref={canvasRef}
                        style={{ width:'100%', maxWidth:'1200px', aspectRatio:'21/9', background: bgColor, position:'relative', overflow:'hidden', boxShadow: viewMode==='edit' ? '0 60px 120px -20px rgba(0,0,0,0.9)' : '0 10px 30px rgba(0,0,0,0.3)', borderRadius:'4px', border: viewMode==='edit' ? '1px solid rgba(143,6,83,0.4)' : 'none', transition:'all 0.5s ease' }}
                    >
                        {[...layers].sort((a,b) => a.zIndex - b.zIndex).map(layer => {
                            const origIdx = layers.indexOf(layer);
                            const isSel = activeIdx === origIdx && viewMode === 'edit';
                            return (
                                <div
                                    key={layer.id}
                                    onMouseDown={e => handleMouseDown(e, origIdx)}
                                    onClick={e => e.stopPropagation()}
                                    style={{
                                        position:'absolute',
                                        left:`${layer.x}%`,
                                        top:`${layer.y}%`,
                                        zIndex: layer.zIndex,
                                        transform:`translate(-50%,-50%) rotate(${layer.rotation||0}deg) scale(${layer.scale||1})`,
                                        cursor: viewMode==='edit' ? (dragging?.idx===origIdx ? 'grabbing' : 'grab') : 'default',
                                        border: isSel ? '2px solid #8f0653' : '2px solid transparent',
                                        borderRadius:'4px',
                                        padding: isSel ? '6px' : '6px',
                                        boxShadow: isSel ? '0 0 0 1px #8f0653, 0 0 40px rgba(143,6,83,0.4)' : 'none',
                                        transition: dragging?.idx===origIdx ? 'none' : 'box-shadow 0.2s, border-color 0.2s',
                                        userSelect:'none'
                                    }}
                                >
                                    {isSel && (
                                        <div style={{ position:'absolute', top:'-34px', left:'50%', transform:'translateX(-50%)', background:'#8f0653', color:'#fff', fontSize:'9px', padding:'3px 10px', borderRadius:'6px', fontWeight:'900', whiteSpace:'nowrap' }}>
                                            {layer.x}%, {layer.y}% · Z{layer.zIndex}
                                        </div>
                                    )}
                                    {layer.type === 'text' ? (
                                        <div style={{ color: layer.color||'#fff', fontSize:`${layer.fontSize||48}px`, fontWeight:'900', whiteSpace:'nowrap', letterSpacing:'-0.03em', lineHeight:'1', pointerEvents:'none' }}>
                                            {layer.content}
                                        </div>
                                    ) : (
                                        <img
                                            src={layer.url ? `${(window.location.origin.includes('localhost') ? 'http://localhost:8000' : '')}${layer.url}` : '/placeholder.jpg'}
                                            style={{ display:'block', maxWidth:'500px', height:'auto', pointerEvents:'none', borderRadius: isSel ? '4px' : '0' }}
                                            alt=""
                                            draggable={false}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Status bar */}
                    <div style={{ marginTop:'24px', display:'flex', gap:'24px', color:'rgba(255,255,255,0.3)', fontSize:'10px', fontWeight:'800', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                        <span>Lienzo: 21:9 UltraWide</span>
                        <span>{layers.length} capas</span>
                        <span style={{ color:'#8f0653' }}>● {viewMode === 'edit' ? 'Modo Edición · Arrastra los elementos' : 'Vista Previa'}</span>
                    </div>
                </div>

                {/* RIGHT: Propiedades */}
                <div style={{ width:'300px', background:'rgba(0,0,0,0.3)', borderLeft:'1px solid rgba(255,255,255,0.05)', padding:'24px', overflowY:'auto' }}>
                    {activeLayer ? (
                        <div style={{ display:'flex', flexDirection:'column', gap:'20px', animation:'slideInRight 0.2s ease' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                <h3 style={{ margin:0, fontSize:'11px', fontWeight:'900', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Propiedades de Capa</h3>
                                <span style={{ fontSize:'9px', background:'rgba(143,6,83,0.2)', color:'#8f0653', padding:'2px 8px', borderRadius:'6px', fontWeight:'900' }}>{activeLayer.type === 'text' ? 'TEXTO' : 'IMAGEN'}</span>
                            </div>

                            {/* Texto */}
                            {activeLayer.type === 'text' && (
                                <>
                                    <Prop label="CONTENIDO">
                                        <input type="text" value={activeLayer.content} onChange={e => updateLayer(activeIdx, { content: e.target.value })} style={inputStyle} />
                                    </Prop>
                                    <Prop label="TAMAÑO">
                                        <SliderRow min={12} max={200} value={activeLayer.fontSize||48} unit="px" onChange={v => updateLayer(activeIdx, { fontSize: v })} />
                                    </Prop>
                                    <Prop label="COLOR">
                                        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                                            {['#fff','#000','#8f0653','#1e1b4b','#ffd700','#ff4d4d'].map(c => (
                                                <button key={c} onClick={() => updateLayer(activeIdx, { color: c })} style={{ width:'28px', height:'28px', borderRadius:'50%', background:c, border: activeLayer.color===c ? '3px solid #fff' : '2px solid rgba(255,255,255,0.1)', cursor:'pointer' }} />
                                            ))}
                                            <input type="color" value={activeLayer.color||'#fff'} onChange={e => updateLayer(activeIdx, { color: e.target.value })} style={{ width:'28px', height:'28px', border:'none', background:'none', cursor:'pointer' }} />
                                        </div>
                                    </Prop>
                                </>
                            )}

                            {/* Transformaciones comunes */}
                            <Prop label="ESCALA">
                                <SliderRow min={0.1} max={4} step={0.05} value={activeLayer.scale||1} unit="x" onChange={v => updateLayer(activeIdx, { scale: v })} />
                            </Prop>
                            <Prop label="ROTACIÓN">
                                <SliderRow min={-180} max={180} value={activeLayer.rotation||0} unit="°" onChange={v => updateLayer(activeIdx, { rotation: v })} />
                            </Prop>
                            <Prop label="ORDEN (Z-INDEX)">
                                <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                                    <button onClick={() => updateLayer(activeIdx, { zIndex: Math.max(1, activeLayer.zIndex-1) })} style={zBtnStyle}>BAJAR</button>
                                    <span style={{ flex:1, textAlign:'center', fontWeight:'900', fontSize:'16px' }}>{activeLayer.zIndex}</span>
                                    <button onClick={() => updateLayer(activeIdx, { zIndex: activeLayer.zIndex+1 })} style={zBtnStyle}>SUBIR</button>
                                </div>
                            </Prop>

                            <button onClick={() => removeLayer(activeIdx)} style={{ padding:'10px', borderRadius:'10px', border:'1px solid rgba(255,77,77,0.3)', color:'#ff4d4d', background:'transparent', fontWeight:'800', fontSize:'11px', cursor:'pointer', marginTop:'8px' }}>
                                Eliminar capa
                            </button>
                        </div>
                    ) : (
                        <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
                            <h3 style={{ margin:0, fontSize:'11px', fontWeight:'900', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.05em' }}>Propiedades del Lienzo</h3>
                            <Prop label="COLOR DE FONDO">
                                <div style={{ display:'flex', gap:'10px', alignItems:'center' }}>
                                    <div style={{ position:'relative', width:'44px', height:'44px', borderRadius:'10px', background: bgColor, border:'1px solid rgba(255,255,255,0.1)', overflow:'hidden' }}>
                                        <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ position:'absolute', inset:0, opacity:0, cursor:'pointer', width:'100%', height:'100%' }} />
                                    </div>
                                    <input type="text" value={bgColor} onChange={e => setBgColor(e.target.value)} style={{ ...inputStyle, flex:1, fontFamily:'monospace' }} />
                                </div>
                            </Prop>
                            <div style={{ padding:'16px', borderRadius:'12px', background:'rgba(143,6,83,0.05)', border:'1px solid rgba(143,6,83,0.15)', fontSize:'11px', color:'rgba(255,255,255,0.5)', lineHeight:'1.6' }}>
                                Selecciona una capa en el lienzo o en la barra lateral para editar sus propiedades.
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Galería */}
            {showGallery && (
                <div style={{ position:'fixed', inset:0, zIndex:6000, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(10px)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <div style={{ width:'90%', height:'90%', background:'#fff', borderRadius:'28px', overflow:'hidden' }}>
                        <MediaGallery isOpen onClose={() => setShowGallery(false)} onSelect={assets => {
                            const asset = Array.isArray(assets) ? assets[0] : assets;
                            addLayer('image', { url: asset.url });
                            setShowGallery(false);
                        }} />
                    </div>
                </div>
            )}

            {/* Catálogo */}
            {showLibrary && (
                <LibraryPicker isOpen onClose={() => setShowLibrary(false)} type="variants" title="Seleccionar Producto"
                    onItemClick={v => { addLayer('image', { url: v.image || v.image_url, link:`/catalogo/producto/${v.product_id}/${v.sku}` }); setShowLibrary(false); }} />
            )}

            <style>{`
                @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
                @keyframes slideInRight { from { transform:translateX(16px); opacity:0; } to { transform:translateX(0); opacity:1; } }
                input[type=range] { -webkit-appearance:none; background:rgba(255,255,255,0.1); height:3px; border-radius:2px; width:100%; }
                input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; height:14px; width:14px; border-radius:50%; background:#8f0653; cursor:pointer; }
            `}</style>
        </div>
    );
};

/* ─── Sub-componentes de UI ─── */
const Prop = ({ label, children }) => (
    <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
        <label style={{ fontSize:'9px', fontWeight:'900', color:'rgba(255,255,255,0.35)', letterSpacing:'0.08em' }}>{label}</label>
        {children}
    </div>
);

const SliderRow = ({ min, max, step=1, value, unit, onChange }) => (
    <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(parseFloat(e.target.value))} />
        <span style={{ fontSize:'11px', fontWeight:'800', minWidth:'40px', textAlign:'right', color:'rgba(255,255,255,0.6)' }}>{value}{unit}</span>
    </div>
);

const inputStyle = {
    background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)',
    padding:'10px 12px', borderRadius:'10px', color:'#fff', fontSize:'13px', width:'100%'
};

const zBtnStyle = {
    flex:1, padding:'8px', background:'rgba(255,255,255,0.05)', border:'none',
    color:'#fff', borderRadius:'8px', cursor:'pointer', fontWeight:'800', fontSize:'10px'
};

export default HeroEditor;
