import React from 'react';
import { X, Save, Eye, Layers, Monitor, Smartphone } from 'lucide-react';

const S = {
    bar: { padding: '16px 20px', display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)', flexShrink: 0 },
    logo: { display: 'flex', alignItems: 'center', gap: '12px' },
    badge: { background: 'linear-gradient(135deg,#8f0653,#50032e)', padding: '10px', borderRadius: '12px', boxShadow: '0 8px 16px rgba(143,6,83,0.3)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0 },
    title: { margin: 0, fontSize: '13px', fontWeight: '900', letterSpacing: '-0.02em', background: 'linear-gradient(to right,#fff,rgba(255,255,255,0.6))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    sub: { margin: '2px 0 0', fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' },
    actions: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' },
    vpGroup: { display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '3px', gap: '2px' },
};

const vpBtn = (active) => ({
    padding: '6px 12px', borderRadius: '8px', border: 'none',
    background: active ? 'rgba(143,6,83,0.8)' : 'transparent',
    color: active ? '#fff' : 'rgba(255,255,255,0.4)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
    fontSize: '10px', fontWeight: '800', transition: 'all 0.2s'
});

const iconBtn = (type = 'default') => {
    const isSave = type === 'save';
    const isDanger = type === 'danger';
    return {
        padding: isSave ? '8px 24px' : '8px 14px',
        borderRadius: '10px',
        border: isSave ? '1px solid rgba(255,100,180,0.4)' : isDanger ? '1px solid rgba(255,77,77,0.2)' : '1px solid rgba(255,255,255,0.1)',
        background: isSave ? 'linear-gradient(135deg, #8f0653, #d10a7a)' : isDanger ? 'rgba(255,77,77,0.1)' : 'rgba(255,255,255,0.05)',
        color: isDanger ? '#ffb3b3' : '#fff', 
        fontWeight: '900', fontSize: '11px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '6px',
        boxShadow: isSave ? '0 0 15px rgba(209,10,122,0.4), 0 8px 20px rgba(143,6,83,0.4)' : 'none',
        transition: 'all 0.2s',
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    };
};

/**
 * StudioHeader
 * Barra superior del Studio: nombre del bloque, toggle de viewport, vista previa y guardar.
 */
const StudioHeader = ({ blockTitle, viewport, viewMode, onViewportChange, onTogglePreview, onSave, onClose, isDeviceMobile }) => (
    <div style={S.bar}>
        <div style={{ ...S.logo, order: 1 }}>
            <div style={S.badge}>
                <Layers size={18} color="#fff" />
            </div>
            <div>
                <h2 style={S.title}>STUDIO VISTIENDOMÉ</h2>
                <p style={S.sub}>{blockTitle || 'Editor Visual · Sistema de Capas'}</p>
            </div>
        </div>

        {/* CONTROLES DE LA VENTANA */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', order: isDeviceMobile ? 2 : 3, marginLeft: isDeviceMobile ? 'auto' : '16px' }}>
            <button style={iconBtn('save')} onClick={onSave}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
                <Save size={14} /> GUARDAR
            </button>

            <button style={iconBtn('danger')} onClick={onClose}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,77,77,0.2)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,77,77,0.1)'; e.currentTarget.style.color = '#ffb3b3'; }}
            >
                <X size={16} />
            </button>
        </div>

        {/* CONTROLES DEL LIENZO */}
        <div style={{ 
            display: 'flex', 
            gap: '8px', 
            alignItems: 'center', 
            order: isDeviceMobile ? 3 : 2,
            width: isDeviceMobile ? '100%' : 'auto', 
            marginLeft: isDeviceMobile ? '0' : 'auto',
            marginTop: isDeviceMobile ? '14px' : '0',
            justifyContent: isDeviceMobile ? 'center' : 'flex-end',
            borderTop: isDeviceMobile ? '1px solid rgba(255,255,255,0.05)' : 'none',
            paddingTop: isDeviceMobile ? '14px' : '0'
        }}>
            {/* Toggle Escritorio / Móvil */}
            <div style={S.vpGroup}>
                <button style={vpBtn(viewport === 'desktop')} onClick={() => onViewportChange('desktop')}>
                    <Monitor size={12} /> Escritorio
                </button>
                <button style={vpBtn(viewport === 'mobile')} onClick={() => onViewportChange('mobile')}>
                    <Smartphone size={12} /> Móvil
                </button>
            </div>

            {!isDeviceMobile && <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.08)' }} />}

            <button style={iconBtn()} onClick={onTogglePreview}>
                <Eye size={12} /> {viewMode === 'edit' ? 'PREVIA' : 'EDITAR'}
            </button>
        </div>
    </div>
);

export default StudioHeader;
