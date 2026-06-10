import React from 'react';
import { X, Save, Eye, Layers, Monitor, Smartphone } from 'lucide-react';

const S = {
    bar: { padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.3)', flexShrink: 0 },
    logo: { display: 'flex', alignItems: 'center', gap: '14px' },
    badge: { background: 'linear-gradient(135deg,#8f0653,#50032e)', padding: '10px', borderRadius: '12px', boxShadow: '0 8px 16px rgba(143,6,83,0.3)', display:'flex', alignItems:'center', justifyContent:'center' },
    title: { margin: 0, fontSize: '15px', fontWeight: '900', letterSpacing: '-0.02em', background: 'linear-gradient(to right,#fff,rgba(255,255,255,0.6))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    sub: { margin: '2px 0 0', fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em' },
    actions: { display: 'flex', gap: '8px', alignItems: 'center' },
    vpGroup: { display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '3px', gap: '2px' },
};

const vpBtn = (active) => ({
    padding: '6px 12px', borderRadius: '8px', border: 'none',
    background: active ? 'rgba(143,6,83,0.8)' : 'transparent',
    color: active ? '#fff' : 'rgba(255,255,255,0.4)',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
    fontSize: '10px', fontWeight: '800', transition: 'all 0.2s'
});

const iconBtn = (primary = false) => ({
    padding: primary ? '8px 18px' : '8px 14px',
    borderRadius: '10px',
    border: primary ? 'none' : '1px solid rgba(255,255,255,0.1)',
    background: primary ? '#8f0653' : 'rgba(255,255,255,0.05)',
    color: '#fff', fontWeight: '900', fontSize: '11px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '6px',
    boxShadow: primary ? '0 8px 20px rgba(143,6,83,0.4)' : 'none',
    transition: 'all 0.2s'
});

/**
 * StudioHeader
 * Barra superior del Studio: nombre del bloque, toggle de viewport, vista previa y guardar.
 */
const StudioHeader = ({ blockTitle, viewport, viewMode, onViewportChange, onTogglePreview, onSave, onClose }) => (
    <div style={S.bar}>
        <div style={S.logo}>
            <div style={S.badge}>
                <Layers size={18} color="#fff" />
            </div>
            <div>
                <h2 style={S.title}>STUDIO VISTIENDOMÉ</h2>
                <p style={S.sub}>{blockTitle || 'Editor Visual · Sistema de Capas'}</p>
            </div>
        </div>

        <div style={S.actions}>
            {/* Toggle Escritorio / Móvil */}
            <div style={S.vpGroup}>
                <button style={vpBtn(viewport === 'desktop')} onClick={() => onViewportChange('desktop')}>
                    <Monitor size={12} /> Escritorio
                </button>
                <button style={vpBtn(viewport === 'mobile')} onClick={() => onViewportChange('mobile')}>
                    <Smartphone size={12} /> Móvil
                </button>
            </div>

            <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.08)' }} />

            <button style={iconBtn()} onClick={onTogglePreview}>
                <Eye size={13} /> {viewMode === 'preview' ? 'EDITAR' : 'PREVIA'}
            </button>

            <button style={iconBtn(true)} onClick={onSave}>
                <Save size={13} /> GUARDAR
            </button>

            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff', width: '38px', height: '38px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} />
            </button>
        </div>
    </div>
);

export default StudioHeader;
