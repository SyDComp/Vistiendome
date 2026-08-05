import React, { useState } from 'react';
import { Image as ImageIcon, Link2, X } from 'lucide-react';
import MediaGallery from '../../interface/admin/media/MediaGallery';
import { getImageUrl } from '../../../lib/api/endpoints';

/**
 * Campo reutilizable de imagen: elegir de la galería (guarda asset_id, robusto ante
 * renombrados) O pegar una URL externa. Maneja un objeto { asset_id, url }; también
 * acepta un string suelto (legacy / URL) por compatibilidad.
 */
const MediaField = ({ value, onChange, label }) => {
    const [showGallery, setShowGallery] = useState(false);

    // Normalizamos: string => {asset_id:null, url}; objeto => tal cual
    const v = typeof value === 'string'
        ? { asset_id: null, url: value }
        : (value || { asset_id: null, url: '' });
    const url = v.url || '';
    const isExternal = !v.asset_id && !!url;
    const [showUrl, setShowUrl] = useState(isExternal);

    const btn = (active) => ({
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '8px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: '700',
        cursor: 'pointer', border: '1px solid ' + (active ? '#8f0653' : '#e2e8f0'),
        background: active ? '#fdf2f8' : '#fff', color: active ? '#8f0653' : '#64748b',
    });

    return (
        <div>
            {label && <label style={{ display: 'block', fontSize: '13px', fontWeight: '800', color: '#475569', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>}

            {url ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                    <img src={getImageUrl(url)} alt="" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '8px', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '12px', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.asset_id ? `Galería · ${url}` : url}
                    </span>
                    <button type="button" onClick={() => onChange({ asset_id: null, url: '' })} title="Quitar" style={{ border: 'none', background: '#fff', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <X size={16} />
                    </button>
                </div>
            ) : null}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button type="button" style={btn(false)} onClick={() => setShowGallery(true)}>
                    <ImageIcon size={14} /> Elegir de galería
                </button>
                <button type="button" style={btn(showUrl)} onClick={() => setShowUrl(s => !s)}>
                    <Link2 size={14} /> URL externa
                </button>
            </div>

            {showUrl && (
                <input
                    type="text"
                    value={isExternal ? url : ''}
                    onChange={(e) => onChange({ asset_id: null, url: e.target.value })}
                    placeholder="https://..."
                    style={{ width: '100%', height: '44px', padding: '0 14px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '14px', marginTop: '10px', boxSizing: 'border-box' }}
                />
            )}

            {showGallery && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
                    <div style={{ width: '90%', height: '90%', background: '#fff', borderRadius: '24px', overflow: 'hidden' }}>
                        <MediaGallery
                            isOpen
                            onClose={() => setShowGallery(false)}
                            selectionMode={true}
                            allowMultiple={false}
                            confirmButtonText="Seleccionar Imagen"
                            contextInfo="Seleccionando Imagen"
                            onSelect={(assets) => {
                                const a = Array.isArray(assets) ? assets[0] : assets;
                                if (a?.url) onChange({ asset_id: a.id ?? null, url: a.url });
                                setShowGallery(false);
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default MediaField;
