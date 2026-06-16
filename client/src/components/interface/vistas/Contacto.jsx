import React, { useState } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { Camera, Globe, MessageCircle, Music, Mail, Phone, MapPin, Clock } from 'lucide-react';

const Contacto = () => {
    const { settings } = useSettings();
    const contact = settings.contact_info || {};
    const social = settings.social_links || {};

    const [tipoContacto, setTipoContacto] = useState('seleccion'); // 'seleccion', 'individual', 'grupo'
    const [formData, setFormData] = useState({
        nombre: '',
        whatsapp: '+569',
        mensaje: '',
        tipoGrupo: 'Coristas',
        cantidad: '',
        evento: ''
    });

    const [status, setStatus] = useState(''); // 'sending', 'success', 'error'

    const handleWhatsAppChange = (e) => {
        let value = e.target.value;
        if (!value.startsWith('+569')) {
            value = '+569';
        }
        const numbers = value.slice(4).replace(/\D/g, '').slice(0, 8);
        setFormData({ ...formData, whatsapp: '+569' + numbers });
    };

    const validateWhatsApp = (number) => {
        return /^\+569\d{8}$/.test(number);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!validateWhatsApp(formData.whatsapp)) {
            setStatus('error-whatsapp');
            return;
        }

        setStatus('sending');
        setTimeout(() => {
            console.log('Datos enviados:', formData);
            setStatus('success');
        }, 1500);
    };

    const renderSelection = () => (
        <div className="contact-selection fade-in">
            <h2 className="selection-title">¿Cómo podemos ayudarte?</h2>
            <div className="selection-grid">
                <div className="selection-card" onClick={() => setTipoContacto('individual')}>
                    <div className="card-icon">🛍️</div>
                    <h3>Busco una prenda para mí</h3>
                    <p>Consultas sobre tallas, disponibilidad o visitas al local en San Carlos.</p>
                    <button className="ui-btn ui-btn-secondary">Contactar Ventas</button>
                </div>
                <div className="selection-card" onClick={() => setTipoContacto('grupo')}>
                    <div className="card-icon">⛪</div>
                    <h3>Uniformes para mi Grupo</h3>
                    <p>Cotizaciones para Coristas o Dorcas, elección de telas y plazos de confección.</p>
                    <button className="ui-btn ui-btn-secondary">Solicitar Presupuesto</button>
                </div>
            </div>
        </div>
    );

    const renderForm = () => (
        <div className="contact-form-wrapper fade-in">
            <button className="back-btn" onClick={() => setTipoContacto('seleccion')}>
                ← Volver a elegir
            </button>
            <div className="form-header">
                <h2>{tipoContacto === 'individual' ? 'Consulta Personal' : 'Presupuesto Grupal'}</h2>
                <p>Déjanos tus datos y Paola te contactará a la brevedad.</p>
            </div>

            <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Nombre Completo</label>
                    <input 
                        type="text" 
                        placeholder="Ej: María González" 
                        required 
                        value={formData.nombre}
                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    />
                </div>
                <div className="form-group">
                    <label>WhatsApp (Chile)</label>
                    <input 
                        type="tel" 
                        placeholder="+569 1234 5678" 
                        required 
                        value={formData.whatsapp}
                        onChange={handleWhatsAppChange}
                        className={status === 'error-whatsapp' ? 'input-error' : ''}
                    />
                    {status === 'error-whatsapp' && <span className="error-msg">El número debe tener 8 dígitos después del +569</span>}
                </div>

                {tipoContacto === 'grupo' && (
                    <>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Tipo de Grupo</label>
                                <select 
                                    value={formData.tipoGrupo}
                                    onChange={(e) => setFormData({...formData, tipoGrupo: e.target.value})}
                                >
                                    <option>Coristas</option>
                                    <option>Dorcas</option>
                                    <option>Otro</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Cantidad Aprox.</label>
                                <input 
                                    type="number" 
                                    placeholder="Ej: 20" 
                                    required
                                    value={formData.cantidad}
                                    onChange={(e) => setFormData({...formData, cantidad: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Fecha de Evento (Opcional)</label>
                            <input 
                                type="text" 
                                placeholder="Ej: Aniversario en Noviembre"
                                value={formData.evento}
                                onChange={(e) => setFormData({...formData, evento: e.target.value})}
                            />
                        </div>
                    </>
                )}

                <div className="form-group">
                    <label>Mensaje</label>
                    <textarea 
                        rows="4" 
                        placeholder="Cuéntanos más para asesorarte mejor..."
                        value={formData.mensaje}
                        onChange={(e) => setFormData({...formData, mensaje: e.target.value})}
                    ></textarea>
                </div>
                
                <div className="form-submit-container">
                    <button type="submit" className="ui-btn ui-btn-primary" disabled={status === 'sending'}>
                        {status === 'sending' ? 'Enviando...' : 'Enviar Solicitud'}
                    </button>
                </div>

                {status === 'success' && (
                    <div className="success-banner">¡Mensaje enviado con éxito! Paola se contactará contigo pronto.</div>
                )}
            </form>
        </div>
    );

    return (
        <section className="contacto-view">
            <div className="container">
                <div className="contacto-header">
                    <span className="subtitle">Hablemos</span>
                    <h1>Contacto Directo</h1>
                    <p className="hero-text">Estamos en San Carlos, Ñuble, listos para vestir tu fe con elegancia.</p>
                </div>

                <div className="contacto-main-container">
                    {tipoContacto === 'seleccion' ? renderSelection() : renderForm()}
                </div>

                <div className="contacto-footer-info">
                    <div className="info-block">
                        <h4><MapPin size={18} /> Taller y Showroom</h4>
                        <p>{contact.address || 'Camino San Camilo Km 1,8, San Carlos, Chile.'}</p>
                    </div>
                    {contact.email && (
                        <div className="info-block">
                            <h4><Mail size={18} /> Correo Electrónico</h4>
                            <p>{contact.email}</p>
                        </div>
                    )}
                    <div className="info-block">
                        <h4><Clock size={18} /> Horarios</h4>
                        <p>Lun - Vie: 09:00 - 18:00 / Sáb: 09:00 - 14:00</p>
                    </div>
                </div>

                <div className="contacto-social-links" style={{ 
                    marginTop: '60px', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    gap: '30px',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '40px'
                }}>
                    {social.instagram && (
                        <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="social-link-item">
                            <Camera size={24} /> <span>Instagram</span>
                        </a>
                    )}
                    {social.facebook && (
                        <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="social-link-item">
                            <Globe size={24} /> <span>Facebook</span>
                        </a>
                    )}
                    {social.whatsapp && (
                        <a href={`https://wa.me/${social.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="social-link-item">
                            <MessageCircle size={24} /> <span>WhatsApp</span>
                        </a>
                    )}
                </div>
            </div>
            <style>{`
                .social-link-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    color: #64748b;
                    text-decoration: none;
                    font-weight: 700;
                    transition: all 0.3s;
                    padding: 12px 20px;
                    border-radius: 12px;
                    background: #f8fafc;
                }
                .social-link-item:hover {
                    color: #8f0653;
                    background: #fdf2f8;
                    transform: translateY(-2px);
                }
                .info-block h4 {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
            `}</style>
        </section>
    );
};

export default Contacto;
