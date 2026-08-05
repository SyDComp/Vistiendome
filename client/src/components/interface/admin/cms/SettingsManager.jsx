import React, { useState, useEffect } from 'react';
import { 
    Camera, 
    Globe, 
    MessageCircle, 
    Mail, 
    Save, 
    CheckCircle,
    Phone,
    Info,
    Truck,
    Plus,
    X,
    Megaphone,
    Sliders
} from 'lucide-react';
import Button from '../../../ui/Button';
import MediaField from '../../../ui/admin/MediaField';
import LinkField from '../../../ui/admin/LinkField';
import { getSiteSettings, updateSiteSetting } from '../../../../lib/api/endpoints';
import { useSettings } from '../../../../context/SettingsContext';
import { getShippingColor } from '../../../../utils/shippingColors';

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
    const [shippingMethods, setShippingMethods] = useState([]);
    const [shippingColors, setShippingColors] = useState({});
    const [newMethod, setNewMethod] = useState('');
    const [welcomeModal, setWelcomeModal] = useState({
        active: false,
        frequency: 'session',
        title: '',
        body: '',
        image_url: '',
        image_asset_id: null,
        image_fit: 'cover',
        image_position: 'center',
        image_max_height: '280px',
        button_text: '',
        button_link: '',
        title_color: '#1e293b',
        body_color: '#475569',
        bg_color: '#ffffff',
        button_bg_color: '#8f0653',
        button_text_color: '#ffffff'
    });
    const [topBanner, setTopBanner] = useState({
        active: false,
        text: '',
        bg_color: '#8f0653',
        text_color: '#ffffff',
        animated: false,
        direction: 'left',
        speed: 20,
        repeat: true,
        link: '',
        link_label: '',
        frequency: 'session'
    });
    const [nosotros, setNosotros] = useState({ image_asset_id: null, image_url: '' });
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const { refreshSettings } = useSettings();

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
                if (data.shipping_methods !== undefined) {
                    setShippingMethods(data.shipping_methods.filter(m => !m.toUpperCase().includes('CHILEXPRESS')));
                } else {
                    setShippingMethods(['STARKEN', 'CORREOS DE CHILE', 'RETIRO EN LOCAL', 'OTRO']);
                }
                if (data.shipping_colors !== undefined) {
                    setShippingColors(data.shipping_colors);
                }
                if (data.welcome_modal) {
                    setWelcomeModal(prev => ({ ...prev, ...data.welcome_modal }));
                }
                if (data.top_banner) {
                    setTopBanner(prev => ({ ...prev, ...data.top_banner }));
                }
                if (data.nosotros) {
                    setNosotros(prev => ({ ...prev, ...data.nosotros }));
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
                updateSiteSetting('contact_info', contact),
                updateSiteSetting('shipping_methods', shippingMethods),
                updateSiteSetting('shipping_colors', shippingColors),
                updateSiteSetting('welcome_modal', welcomeModal),
                updateSiteSetting('top_banner', topBanner),
                updateSiteSetting('nosotros', nosotros)
            ]);
            
            if (refreshSettings) await refreshSettings();

            setMessage({ type: 'success', text: 'Configuraciones guardadas correctamente' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: 'Error al guardar los cambios' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleChange = (e) => {
        let { name, value } = e.target;
        if (name === 'phone_display') {
            value = value.replace(/[^0-9+\-() ]/g, '').slice(0, 25);
        } else if (name === 'whatsapp') {
            value = value.replace(/\D/g, '').slice(0, 15);
        }
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleAddShippingMethod = () => {
        if (newMethod.trim() && !shippingMethods.includes(newMethod.toUpperCase())) {
            setShippingMethods([...shippingMethods, newMethod.toUpperCase()]);
            setNewMethod('');
        }
    };

    const handleRemoveShippingMethod = (methodToRemove) => {
        setShippingMethods(shippingMethods.filter(m => m !== methodToRemove));
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
                            <label style={labelStyle}><Globe size={14} /> Facebook (URL) · principal</label>
                            <input
                                type="text"
                                name="facebook"
                                value={settings.facebook}
                                onChange={handleChange}
                                placeholder="https://facebook.com/tu_pagina"
                                style={inputStyle}
                            />
                            <p style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Es la red principal: se muestra primero en el sitio.</p>
                        </div>
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
                                maxLength={15}
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
                                maxLength={25}
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

                <section style={{ background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Truck size={20} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e1b4b' }}>Métodos de Envío</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input 
                                type="text" 
                                value={newMethod} 
                                onChange={(e) => setNewMethod(e.target.value)}
                                placeholder="Ej: BLUEXPRESS"
                                style={inputStyle}
                                onKeyPress={(e) => e.key === 'Enter' && handleAddShippingMethod()}
                            />
                            <Button onClick={handleAddShippingMethod} variant="secondary" style={{ flexShrink: 0, height: '48px', padding: '0 16px' }}>
                                <Plus size={18} />
                            </Button>
                        </div>
                        
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                            {shippingMethods.length === 0 && <span style={{color: '#94a3b8', fontSize: '14px'}}>No hay métodos configurados.</span>}
                            {shippingMethods.map((method, idx) => {
                                const currentColor = shippingColors[method] || getShippingColor(method, shippingColors);
                                return (
                                    <div key={idx} style={{ 
                                        display: 'flex', alignItems: 'center', gap: '8px', 
                                        background: `${currentColor}15`, padding: '6px 12px', 
                                        borderRadius: '8px', border: `1.5px solid ${currentColor}40`,
                                        fontSize: '13px', fontWeight: '700', color: currentColor,
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                    }}>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }} title="Haz clic para modificar el color de este transporte">
                                            <div style={{
                                                width: '18px', height: '18px', borderRadius: '50%',
                                                backgroundColor: currentColor, border: '2px solid #fff',
                                                boxShadow: '0 0 0 1px #cbd5e1', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
                                            }}>
                                                <input 
                                                    type="color" 
                                                    value={currentColor} 
                                                    onChange={(e) => setShippingColors(prev => ({ ...prev, [method]: e.target.value }))}
                                                    style={{ opacity: 0, width: '20px', height: '20px', cursor: 'pointer', padding: 0, margin: 0, border: 'none' }}
                                                />
                                            </div>
                                            <span>{method}</span>
                                        </label>
                                        <X 
                                            size={14} 
                                            style={{ cursor: 'pointer', color: '#ef4444', marginLeft: '4px' }} 
                                            onClick={() => handleRemoveShippingMethod(method)}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section style={{ background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fdf2f8', color: '#8f0653', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Megaphone size={20} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e1b4b' }}>Modal de Bienvenida</h3>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '24px' }}>
                        <input
                            type="checkbox"
                            checked={welcomeModal.active}
                            onChange={(e) => setWelcomeModal(prev => ({ ...prev, active: e.target.checked }))}
                            style={{ width: '20px', height: '20px', accentColor: '#8f0653' }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>
                            Mostrar el modal de bienvenida en la web
                        </span>
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        <div className="input-group">
                            <label style={labelStyle}><Info size={14} /> Frecuencia</label>
                            <select
                                value={welcomeModal.frequency}
                                onChange={(e) => setWelcomeModal(prev => ({ ...prev, frequency: e.target.value }))}
                                style={inputStyle}
                            >
                                <option value="session">Una vez por sesión</option>
                                <option value="day">Una vez por día</option>
                                <option value="always">Siempre al entrar</option>
                            </select>
                            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', lineHeight: 1.5 }}>
                                {welcomeModal.frequency === 'session' && 'Se muestra una vez por visita; no reaparece hasta que el cliente cierre y vuelva a abrir el navegador.'}
                                {welcomeModal.frequency === 'day' && 'Se muestra una vez al día por cliente, aunque siga navegando.'}
                                {welcomeModal.frequency === 'always' && 'Se muestra cada vez que el cliente entra a la web (más intrusivo).'}
                            </p>
                        </div>

                        <div className="input-group">
                            <label style={labelStyle}><Megaphone size={14} /> Título</label>
                            <input
                                type="text"
                                value={welcomeModal.title}
                                onChange={(e) => setWelcomeModal(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Ej: ¡Bienvenida a Vistiendomé!"
                                style={inputStyle}
                            />
                        </div>

                        <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}><Info size={14} /> Mensaje</label>
                            <textarea
                                value={welcomeModal.body}
                                onChange={(e) => setWelcomeModal(prev => ({ ...prev, body: e.target.value }))}
                                placeholder="Anuncio, novedad o promoción que quieras destacar..."
                                style={{ ...inputStyle, height: '100px', resize: 'vertical', paddingTop: '12px' }}
                            />
                        </div>

                        <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                            <MediaField
                                label="Imagen (opcional)"
                                value={{ asset_id: welcomeModal.image_asset_id, url: welcomeModal.image_url }}
                                onChange={(v) => setWelcomeModal(prev => ({ ...prev, image_asset_id: v.asset_id, image_url: v.url }))}
                            />
                        </div>

                        {(welcomeModal.image_url || welcomeModal.image_asset_id) && (
                            <div style={{ gridColumn: '1 / -1', background: '#f8fafc', padding: '18px', borderRadius: '16px', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e1b4b', fontWeight: '800', fontSize: '14px' }}>
                                    <Sliders size={16} style={{ color: '#8f0653' }} />
                                    Ajustes Visuales de la Imagen
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                                    <div>
                                        <label style={{ ...labelStyle, fontSize: '12px' }}>Modo de Ajuste</label>
                                        <select
                                            value={welcomeModal.image_fit || 'cover'}
                                            onChange={(e) => setWelcomeModal(prev => ({ ...prev, image_fit: e.target.value }))}
                                            style={{ ...inputStyle, height: '42px', fontSize: '13px' }}
                                        >
                                            <option value="cover">Cover (Recortar llenando espacio)</option>
                                            <option value="contain">Contain (Ver imagen completa sin cortes)</option>
                                        </select>
                                    </div>

                                    {(welcomeModal.image_fit !== 'contain') && (
                                        <div>
                                            <label style={{ ...labelStyle, fontSize: '12px' }}>Posición de Encuadre</label>
                                            <select
                                                value={welcomeModal.image_position || 'center'}
                                                onChange={(e) => setWelcomeModal(prev => ({ ...prev, image_position: e.target.value }))}
                                                style={{ ...inputStyle, height: '42px', fontSize: '13px' }}
                                            >
                                                <option value="top">Superior (Arriba / Rostro)</option>
                                                <option value="center">Centro (Estándar)</option>
                                                <option value="bottom">Inferior (Abajo)</option>
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label style={{ ...labelStyle, fontSize: '12px' }}>Altura Máxima del Contenedor</label>
                                        <select
                                            value={welcomeModal.image_max_height || '280px'}
                                            onChange={(e) => setWelcomeModal(prev => ({ ...prev, image_max_height: e.target.value }))}
                                            style={{ ...inputStyle, height: '42px', fontSize: '13px' }}
                                        >
                                            <option value="200px">Compacta (200px)</option>
                                            <option value="280px">Estándar (280px)</option>
                                            <option value="360px">Grande (360px)</option>
                                            <option value="460px">Flyer / Vertical (460px)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="input-group">
                            <label style={labelStyle}><Plus size={14} /> Texto del botón (opcional)</label>
                            <input
                                type="text"
                                value={welcomeModal.button_text}
                                onChange={(e) => setWelcomeModal(prev => ({ ...prev, button_text: e.target.value }))}
                                placeholder="Ej: Ver colección"
                                style={inputStyle}
                            />
                        </div>

                        <div className="input-group">
                            <LinkField
                                label="Link del botón (opcional)"
                                value={welcomeModal.button_link}
                                onChange={(v) => setWelcomeModal(prev => ({ ...prev, button_link: v }))}
                            />
                        </div>

                        <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed #e2e8f0', paddingTop: '20px' }}>
                            <label style={labelStyle}>Colores</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px' }}>
                                <ColorField label="Título" value={welcomeModal.title_color} onChange={(v) => setWelcomeModal(prev => ({ ...prev, title_color: v }))} />
                                <ColorField label="Mensaje" value={welcomeModal.body_color} onChange={(v) => setWelcomeModal(prev => ({ ...prev, body_color: v }))} />
                                <ColorField label="Fondo modal" value={welcomeModal.bg_color} onChange={(v) => setWelcomeModal(prev => ({ ...prev, bg_color: v }))} />
                                <ColorField label="Fondo botón" value={welcomeModal.button_bg_color} onChange={(v) => setWelcomeModal(prev => ({ ...prev, button_bg_color: v }))} />
                                <ColorField label="Texto botón" value={welcomeModal.button_text_color} onChange={(v) => setWelcomeModal(prev => ({ ...prev, button_text_color: v }))} />
                            </div>
                            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '10px' }}>
                                La "X" para cerrar se ajusta automáticamente para contrastar con el fondo del modal.
                            </p>
                        </div>
                    </div>

                    <div style={{ marginTop: '24px', padding: '15px', background: '#f8fafc', borderRadius: '16px', display: 'flex', gap: '12px' }}>
                        <Info size={16} style={{ color: '#64748b', flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                            Si cambias el contenido, el modal volverá a mostrarse aunque el cliente ya lo haya visto. Deja el botón sin texto si no quieres llamado a la acción.
                        </p>
                    </div>
                </section>

                <section style={{ background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Megaphone size={20} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e1b4b' }}>Barra de Anuncio (arriba del sitio)</h3>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '24px' }}>
                        <input
                            type="checkbox"
                            checked={topBanner.active}
                            onChange={(e) => setTopBanner(prev => ({ ...prev, active: e.target.checked }))}
                            style={{ width: '20px', height: '20px', accentColor: '#8f0653' }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>
                            Mostrar la barra de anuncio en la parte superior
                        </span>
                    </label>

                    <div className="input-group" style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}><Info size={14} /> Mensaje</label>
                        <input
                            type="text"
                            value={topBanner.text}
                            onChange={(e) => setTopBanner(prev => ({ ...prev, text: e.target.value }))}
                            placeholder="Ej: Envío gratis en compras sobre $50.000"
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                        <div className="input-group">
                            <LinkField
                                label="Enlace (opcional)"
                                value={topBanner.link}
                                onChange={(v, lbl) => setTopBanner(prev => ({ ...prev, link: v, link_label: prev.link_label || lbl || '' }))}
                            />
                        </div>
                        <div className="input-group">
                            <label style={labelStyle}><Info size={14} /> Texto del enlace (apodo, opcional)</label>
                            <input
                                type="text"
                                value={topBanner.link_label}
                                onChange={(e) => setTopBanner(prev => ({ ...prev, link_label: e.target.value }))}
                                placeholder="Ej: Click acá"
                                style={inputStyle}
                            />
                            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', lineHeight: 1.5 }}>
                                Si lo dejas vacío, se muestra el enlace en crudo. Si es interno redirige; si es externo abre otra pestaña.
                            </p>
                        </div>
                        <div className="input-group">
                            <label style={labelStyle}><Info size={14} /> Frecuencia</label>
                            <select
                                value={topBanner.frequency}
                                onChange={(e) => setTopBanner(prev => ({ ...prev, frequency: e.target.value }))}
                                style={inputStyle}
                            >
                                <option value="session">Una vez por sesión</option>
                                <option value="day">Una vez por día</option>
                                <option value="always">Siempre al entrar</option>
                            </select>
                            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', lineHeight: 1.5 }}>
                                {topBanner.frequency === 'session' && 'Si el cliente la cierra, no reaparece hasta cerrar y reabrir el navegador.'}
                                {topBanner.frequency === 'day' && 'Reaparece una vez al día aunque la haya cerrado.'}
                                {topBanner.frequency === 'always' && 'Aparece cada vez que entra (se puede cerrar por esa visita).'}
                            </p>
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={labelStyle}>Colores</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '18px' }}>
                            <ColorField label="Fondo" value={topBanner.bg_color} onChange={(v) => setTopBanner(prev => ({ ...prev, bg_color: v }))} />
                            <ColorField label="Texto" value={topBanner.text_color} onChange={(v) => setTopBanner(prev => ({ ...prev, text_color: v }))} />
                        </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', marginBottom: '16px' }}>
                        <input
                            type="checkbox"
                            checked={topBanner.animated}
                            onChange={(e) => setTopBanner(prev => ({ ...prev, animated: e.target.checked }))}
                            style={{ width: '20px', height: '20px', accentColor: '#8f0653' }}
                        />
                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>
                            Texto en movimiento (animación deslizante)
                        </span>
                    </label>

                    {topBanner.animated && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                            <div className="input-group">
                                <label style={labelStyle}>Dirección</label>
                                <select
                                    value={topBanner.direction}
                                    onChange={(e) => setTopBanner(prev => ({ ...prev, direction: e.target.value }))}
                                    style={inputStyle}
                                >
                                    <option value="left">← Hacia la izquierda (clásico)</option>
                                    <option value="right">→ Hacia la derecha</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label style={labelStyle}>Velocidad</label>
                                <select
                                    value={topBanner.speed}
                                    onChange={(e) => setTopBanner(prev => ({ ...prev, speed: parseInt(e.target.value) }))}
                                    style={inputStyle}
                                >
                                    <option value={40}>Muy lenta</option>
                                    <option value={28}>Lenta</option>
                                    <option value={20}>Normal</option>
                                    <option value={12}>Rápida</option>
                                    <option value={7}>Muy rápida</option>
                                </select>
                            </div>
                            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={topBanner.repeat}
                                        onChange={(e) => setTopBanner(prev => ({ ...prev, repeat: e.target.checked }))}
                                        style={{ width: '20px', height: '20px', accentColor: '#8f0653' }}
                                    />
                                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#334155' }}>
                                        Repetir el texto para llenar la barra
                                    </span>
                                </label>
                                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', lineHeight: 1.5 }}>
                                    {topBanner.repeat
                                        ? 'Activado: el mensaje se repite formando un flujo continuo que llena toda la barra (tipo ticker).'
                                        : 'Desactivado: un solo mensaje cruza la barra, sale por un lado y vuelve a entrar por el otro (con espacio entre pasadas).'}
                                </p>
                            </div>
                        </div>
                    )}

                    <div style={{ marginTop: '24px', padding: '15px', background: '#f8fafc', borderRadius: '16px', display: 'flex', gap: '12px' }}>
                        <Info size={16} style={{ color: '#64748b', flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                            El cliente puede cerrarla; no reaparece en esa sesión. Si cambias el mensaje, vuelve a mostrarse. Con el texto en movimiento, la animación se pausa al pasar el mouse.
                        </p>
                    </div>
                </section>

                <section style={{ background: '#fff', padding: '30px', borderRadius: '24px', border: '1px solid #e2e8f0', gridColumn: '1 / -1' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Info size={20} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e1b4b' }}>Página "Nosotros"</h3>
                    </div>

                    <MediaField
                        label="Imagen del Taller"
                        value={{ asset_id: nosotros.image_asset_id, url: nosotros.image_url }}
                        onChange={(v) => setNosotros(prev => ({ ...prev, image_asset_id: v.asset_id, image_url: v.url }))}
                    />

                    <div style={{ marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '16px', display: 'flex', gap: '12px' }}>
                        <Info size={16} style={{ color: '#64748b', flexShrink: 0 }} />
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b', lineHeight: '1.5' }}>
                            Si no eliges una imagen, se mostrará la que viene por defecto en la página.
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
};

const ColorField = ({ label, value, onChange }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ fontSize: '12px', fontWeight: '700', color: '#64748b' }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
                type="color"
                value={value || '#000000'}
                onChange={(e) => onChange(e.target.value)}
                style={{ width: '40px', height: '40px', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', background: 'none', padding: '2px' }}
            />
            <input
                type="text"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                style={{ width: '90px', height: '40px', padding: '0 10px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '13px', color: '#1e1b4b', outline: 'none' }}
            />
        </div>
    </div>
);

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
