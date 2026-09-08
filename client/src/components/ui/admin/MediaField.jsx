import React, { useState } from 'react';
import { Image as ImageIcon, Link2, X } from 'lucide-react';
import MediaGallery from '../../interface/admin/media/MediaGallery';
import Imagen from '../Imagen';

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
            {label && <label className="adm-medios-rotulo">{label}</label>}

            {url ? (
                <div className="adm-medios-fila">
                    <Imagen url={url} alt="" className="adm-medios-miniatura" sizes="56px" />
                    <span className="adm-medios-nombre">
                        {v.asset_id ? `Galería · ${url}` : url}
                    </span>
                    <button type="button" onClick={() => onChange({ asset_id: null, url: '' })} title="Quitar" className="adm-medios-quitar">
                        <X size={16} />
                    </button>
                </div>
            ) : null}

            <div className="adm-medios-botones">
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
                    className="adm-medios-url"
                />
            )}

            {showGallery && (
                <div className="adm-visor">
                    <div className="adm-visor-caja">
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
