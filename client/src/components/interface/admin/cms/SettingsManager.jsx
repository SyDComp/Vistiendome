import React, { useState, useEffect } from 'react';
import { 
    Camera, 
    Globe, 
    MessageCircle, 
    Mail, 
    Save, 
    CheckCircle,
    Phone,
    Info
} from 'lucide-react';
import Button from '../../../ui/Button';
import { getSiteSettings, updateSiteSetting } from '../../../../lib/api/endpoints';

const SettingsManager = () => {
    const [settings, setSettings] = useState({
        instagram: '',
        facebook: '',
        whatsapp: '',
        tiktok: '',
        email: '',
        phone_display: '',
        address: ''
    });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const data = await getSiteSettings();
                if (data.social_links) {
                    setSettings(prev => ({ ...prev, ...data.social_links }));
                }
                if (data.contact_info) {
                    setSettings(prev => ({ ...prev, ...data.contact_info }));
                }
            } catch (err) {
                console.error("Error loading settings:", err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            const social = {
                instagram: settings.instagram,
                facebook: settings.facebook,
                whatsapp: settings.whatsapp,
                tiktok: settings.tiktok
            };
            const contact = {
                email: settings.email,
                phone_display: settings.phone_display,
                address: settings.address
            };

            await Promise.all([
                updateSiteSetting('social_links', social),
                updateSiteSetting('contact_info', contact)
            ]);

            setMessage({ type: 'success', text: 'Configuraciones guardadas correctamente' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: 'Error al guardar los cambios' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando configuraciones...</div>;

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '900', color: '#1e1b4b' }}>Puntos de Contacto</h1>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '14px' }}>Configura tus redes sociales y datos de contacto globales.</p>
                </div>
                <Button 
                    onClick={handleSave} 
                    variant="primary" 
                    disabled={isSaving}
                    style={{ background: '#8f0653', height: '48px', padding: '0 24px' }}
                >
                    {isSaving ? 'Guardando...' : <><Save size={18} /> Guardar Cambios</>}
                </Button>
            </header>

            {message && (
                <div style={{ 
                    padding: '16px 24px', 
                    borderRadius: '16px', 
                    background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                    color: message.type === 'success' ? '#059669' : '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontWeight: '700',
                    fontSize: '14px',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    <CheckCircle size={20} />
                    {message.text}
                </div>
            )}

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
                gap: '24px',
                overflowY: 'auto',
                paddingBottom: '40px'
            }}>
                <section style={{ background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fdf2f8', color: '#8f0653', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Globe size={20} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e1b4b' }}>Redes Sociales</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="input-group">
                            <label style={labelStyle}><Camera size={14} /> Instagram (URL)</label>
                            <input 
                                type="text" 
                                name="instagram" 
                                value={settings.instagram} 
                                onChange={handleChange}
                                placeholder="https://instagram.com/tu_cuenta"
                                style={inputStyle} 
                            />
                        </div>
                        <div className="input-group">
                            <label style={labelStyle}><Globe size={14} /> Facebook (URL)</label>
                            <input 
                                type="text" 
                                name="facebook" 
                                value={settings.facebook} 
                                onChange={handleChange}
                                placeholder="https://facebook.com/tu_pagina"
                                style={inputStyle} 
                            />
                        </div>
                        <div className="input-group">
                            <label style={labelStyle}><Info size={14} /> TikTok (URL)</label>
                            <input 
                                type="text" 
                                name="tiktok" 
                                value={settings.tiktok} 
                                onChange={handleChange}
                                placeholder="https://tiktok.com/@tu_usuario"
                                style={inputStyle} 
                            />
                        </div>
                        <div className="input-group">
                            <label style={labelStyle}><MessageCircle size={14} /> WhatsApp (Solo número)</label>
                            <input 
                                type="text" 
                                name="whatsapp" 
                                value={settings.whatsapp} 
                                onChange={handleChange}
                                placeholder="569XXXXXXXX"
                                style={inputStyle} 
                            />
                            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Sin el signo '+' ni espacios.</p>
                        </div>
                    </div>
                </section>

                <section style={{ background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Mail size={20} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e1b4b' }}>Información de Contacto</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div className="input-group">
                            <label style={labelStyle}><Mail size={14} /> Correo Electrónico</label>
                            <input 
                                type="email" 
                                name="email" 
                                value={settings.email} 
                                onChange={handleChange}
                                placeholder="contacto@vistiendome.cl"
                                style={inputStyle} 
                            />
                        </div>
                        <div className="input-group">
                            <label style={labelStyle}><Phone size={14} /> Teléfono Visible</label>
                            <input 
                                type="text" 
                                name="phone_display" 
                                value={settings.phone_display} 
                                onChange={handleChange}
                                placeholder="+56 9 1234 5678"
                                style={inputStyle} 
                            />
                        </div>
                        <div className="input-group">
                            <label style={labelStyle}><Globe size={14} /> Dirección / Taller</label>
                            <textarea 
                                name="address" 
                                value={settings.address} 
                                onChange={handleChange}
                                placeholder="San Carlos, Ñuble, Chile."
                                style={{ ...inputStyle, height: '100px', resize: 'none', paddingTop: '12px' }} 
                            />
                        </div>
                    </div>
                    
                    <div style={{ marginTop: '24px', padding: '15px', background: '#f8fafc', borderRadius: '16px', display: 'flex', gap: '12px' }}>
                        <Info size={16} style={{ color: '#64748b', flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                            Los campos que dejes vacíos no se mostrarán en la web pública (Footer y Contacto).
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
};

const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    fontWeight: '800',
    color: '#475569',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
};

const inputStyle = {
    width: '100%',
    height: '48px',
    padding: '0 16px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    fontSize: '14px',
    color: '#1e1b4b',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box'
};

export default SettingsManager;
