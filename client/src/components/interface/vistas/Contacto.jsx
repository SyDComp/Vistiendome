import React, { useState, useEffect } from 'react';
import { useSettings } from '../../../context/SettingsContext';
import { Camera, Globe, MessageCircle, Mail, Phone, MapPin, Clock, User, Users, Calendar, FileText, X } from 'lucide-react';
import { formatRUT } from '../../../utils/formatters';
import { buildWhatsAppMessage } from '../../../utils/cartUtils';
import Button from '../../ui/Button';
import { get, post } from '../../../lib/api/client';

const Contacto = () => {
    const { settings } = useSettings();
    const contact = settings.contact_info || {};
    const social = settings.social_links || {};

    const rawShippingMethods = settings?.shipping_methods !== undefined 
        ? settings.shipping_methods 
        : ['STARKEN', 'CORREOS DE CHILE', 'RETIRO EN LOCAL', 'OTRO'];
    const shippingMethods = rawShippingMethods.filter(m => !m.toUpperCase().includes('CHILEXPRESS'));
    const finalShippingMethods = shippingMethods.length > 0 ? shippingMethods : ['STARKEN', 'CORREOS DE CHILE', 'RETIRO EN LOCAL', 'OTRO'];

    const [tipoContacto, setTipoContacto] = useState('seleccion'); // 'seleccion', 'individual', 'grupo'
    const [formData, setFormData] = useState({
        rut: '',
        nombre: '',
        email: '',
        whatsapp: '+569',
        transporte: finalShippingMethods[0] || 'STARKEN',
        tipo_despacho: 'DOMICILIO',
        region: '',
        comuna: '',
        comuna_id: '',
        direccion: '',
        mensaje: '',
        tipoGrupo: 'Coristas',
        cantidad: '',
        evento: ''
    });

    const [status, setStatus] = useState(''); // 'sending', 'success', 'error'
    const [regiones, setRegiones] = useState([]);
    const [comunas, setComunas] = useState([]);

    useEffect(() => {
        get('/api/v1/geo/regiones')
            .then(data => setRegiones(data))
            .catch(err => console.error('Error fetching regiones:', err));
    }, []);

    // Los settings (y por ende finalShippingMethods) cargan async: si el método
    // por defecto quedó desfasado con la lista real, lo resincronizamos.
    useEffect(() => {
        if (finalShippingMethods.length > 0 && !finalShippingMethods.includes(formData.transporte)) {
            setFormData(prev => ({ ...prev, transporte: finalShippingMethods[0] }));
        }
    }, [finalShippingMethods, formData.transporte]);

    useEffect(() => {
        try {
            const saved = localStorage.getItem('contactoDraft');
            if (saved) {
                setFormData(JSON.parse(saved));
            }
        } catch (e) {}
    }, []);

    useEffect(() => {
        localStorage.setItem('contactoDraft', JSON.stringify(formData));
    }, [formData]);

    useEffect(() => {
        if (!formData.region || regiones.length === 0) {
            if (!formData.region) setComunas([]);
            return;
        }
        const regionObj = regiones.find(r => 
            r.nombre.trim().toLowerCase() === String(formData.region).trim().toLowerCase() ||
            String(r.id) === String(formData.region)
        );
        if (regionObj) {
            get(`/api/v1/geo/regiones/${regionObj.id}/comunas`)
                .then(data => {
                    const loadedComunas = Array.isArray(data) ? data : [];
                    setComunas(loadedComunas);
                    setFormData(prev => {
                        const match = loadedComunas.find(c => 
                            c.nombre.trim().toLowerCase() === String(prev.comuna || '').trim().toLowerCase() ||
                            String(c.id) === String(prev.comuna_id || '')
                        );
                        if (match && (prev.comuna !== match.nombre || prev.comuna_id !== match.id)) {
                            return { ...prev, comuna: match.nombre, comuna_id: match.id };
                        }
                        return prev;
                    });
                })
                .catch(err => console.error('Error fetching comunas:', err));
        } else {
            setComunas([]);
        }
    }, [formData.region, regiones]);

    const handleRegionChange = (e) => {
        const selectedRegionNombre = e.target.value;
        setFormData(prev => ({ 
            ...prev, 
            region: selectedRegionNombre,
            comuna: '', 
            comuna_id: '' 
        }));
    };

    const handleComunaChange = (e) => {
        const selectedComunaNombre = e.target.value;
        const comunaObj = comunas.find(c => c.nombre === selectedComunaNombre);
        setFormData(prev => ({ 
            ...prev, 
            comuna: selectedComunaNombre,
            comuna_id: comunaObj ? comunaObj.id : ''
        }));
    };

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateWhatsApp(formData.whatsapp)) {
            setStatus('error-whatsapp');
            return;
        }

        // Abrir WhatsApp de Paola con el resumen (sincrónico, dentro del gesto del usuario,
        // para evitar bloqueo de pop-ups). Además se guarda en el CRM más abajo.
        const numeroPaola = (social.whatsapp || '').replace(/\D/g, '');
        if (numeroPaola) {
            const esGrupo = tipoContacto === 'grupo';
            const esRetiro = formData.transporte?.toUpperCase().includes('RETIRO');
            const mensajeWA = buildWhatsAppMessage({
                tipo: esGrupo ? 'grupo' : 'consulta',
                cliente: { nombre: formData.nombre, rut: formData.rut, email: formData.email, telefono: formData.whatsapp },
                despacho: esRetiro ? {
                    transporte: formData.transporte
                } : {
                    transporte: formData.tipo_despacho === 'SUCURSAL' ? `${formData.transporte} (retiro en sucursal)` : formData.transporte,
                    direccion: formData.tipo_despacho === 'SUCURSAL' ? null : formData.direccion,
                    comuna: formData.comuna,
                    region: formData.region,
                },
                grupo: esGrupo ? { tipo: formData.tipoGrupo, cantidad: formData.cantidad, evento: formData.evento } : undefined,
                mensaje: formData.mensaje,
            });
            const whatsappUrl = `https://wa.me/${numeroPaola}?text=${encodeURIComponent(mensajeWA)}`;
            const isIOSOrIPad = /iPad|iPhone|iPod/i.test(navigator.userAgent) || 
                                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
                                /Android/i.test(navigator.userAgent);
            let popup = null;
            if (!isIOSOrIPad) {
                popup = window.open(whatsappUrl, '_blank');
            }
            if (isIOSOrIPad || !popup || popup.closed || typeof popup.closed === 'undefined') {
                window.location.href = whatsappUrl;
            }
        }

        setStatus('sending');
        
        try {
            const partesNombre = formData.nombre.trim().split(' ');
            const nombres = partesNombre[0] || '';
            const apellidos = partesNombre.slice(1).join(' ') || '';

            const origen = tipoContacto === 'individual' ? 'CONTACTO_INDIVIDUAL' : 'CONTACTO_GRUPAL';
            const esRetiro = formData.transporte?.toUpperCase().includes('RETIRO');

            const payload = {
                rut: formData.rut,
                nombres: nombres,
                apellidos: apellidos,
                email_personal: formData.email,
                telefono: formData.whatsapp,
                transporte: formData.transporte,
                tipo_despacho: esRetiro ? 'TIENDA' : formData.tipo_despacho,
                region: esRetiro ? null : formData.region,
                comuna: esRetiro ? null : formData.comuna,
                comuna_id: esRetiro ? null : formData.comuna_id,
                direccion: esRetiro ? null : formData.direccion,
                mensaje: formData.mensaje,
                origen: origen
            };

            if (tipoContacto === 'grupo') {
                payload.tipo_grupo = formData.tipoGrupo;
                payload.cantidad_aprox = formData.cantidad ? parseInt(formData.cantidad, 10) : null;
                payload.fecha_evento = formData.evento;
            }

            try {
                await post('/api/v1/crm/', payload);
            } catch (error) {
                console.error("Error al registrar el contacto en el backend", error);
            }

            setStatus('success');
            setFormData({
                rut: '',
                nombre: '',
                email: '',
                whatsapp: '+569',
                transporte: finalShippingMethods[0] || 'STARKEN',
                tipo_despacho: 'DOMICILIO',
                region: '',
                comuna: '',
                comuna_id: '',
                direccion: '',
                mensaje: '',
                tipoGrupo: 'Coristas',
                cantidad: '',
                evento: ''
            });
            localStorage.removeItem('contactoDraft');

        } catch (error) {
            console.error("Error de red al enviar contacto:", error);
            setStatus('error-whatsapp'); // Reutilizamos este estado o creamos uno nuevo
        }
    };

    const renderSelection = () => (
        <div className="contact-selection fade-in">
            <h2 className="selection-title">¿Cómo podemos ayudarte?</h2>
            <div className="selection-grid">
                <div className="selection-card" onClick={() => setTipoContacto('individual')}>
                    <div className="card-icon">🛍️</div>
                    <h3>Busco una prenda para mí</h3>
                    <p>Consultas sobre tallas, disponibilidad o visitas al local en San Carlos.</p>
                    <Button variant="secondary">Contactar Ventas</Button>
                </div>
                <div className="selection-card" onClick={() => setTipoContacto('grupo')}>
                    <div className="card-icon">⛪</div>
                    <h3>Uniformes para mi Grupo</h3>
                    <p>Cotizaciones para Coristas o Dorcas, elección de telas y plazos de confección.</p>
                    <Button variant="secondary">Solicitar Presupuesto</Button>
                </div>
            </div>
        </div>
    );

    const renderFormModal = () => {
        if (tipoContacto === 'seleccion') return null;
        
        return (
            <div className="contact-modal-overlay fade-in" onClick={() => setTipoContacto('seleccion')}>
                <div className="contact-modal-card slide-up" onClick={e => e.stopPropagation()}>
                    <div className="contact-modal-header">
                        <h2>{tipoContacto === 'individual' ? 'Consulta Personal' : 'Presupuesto Grupal'}</h2>
                        <button type="button" className="btn-close-modal" onClick={() => setTipoContacto('seleccion')}>
                            <X size={20} />
                        </button>
                    </div>

                    <form className="contact-form" onSubmit={handleSubmit}>
                        <div className="contact-form-body">
                            <p className="form-intro">Déjanos tus datos y Paola te contactará a la brevedad.</p>
                <div className="form-group">
                    <label><User size={16} /> RUT *</label>
                    <input 
                        type="text" 
                        placeholder="Ej: 12.345.678-9" 
                        required 
                        value={formData.rut}
                        onChange={(e) => setFormData({...formData, rut: e.target.value})}
                        onBlur={(e) => setFormData({...formData, rut: formatRUT(e.target.value)})}
                    />
                </div>
                <div className="form-group">
                    <label><User size={16} /> Nombre Completo *</label>
                    <input 
                        type="text" 
                        placeholder="Ej: María González" 
                        required 
                        value={formData.nombre}
                        onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    />
                </div>
                <div className="form-group">
                    <label><Mail size={16} /> Email</label>
                    <input 
                        type="email" 
                        placeholder="tu@email.com" 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                </div>
                <div className="form-group">
                    <label><Phone size={16} /> WhatsApp (Chile) *</label>
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

                <div className="form-group">
                    <label><MapPin size={16} /> Método de Envío *</label>
                    <select 
                        value={formData.transporte}
                        onChange={(e) => setFormData({...formData, transporte: e.target.value})}
                    >
                        {finalShippingMethods.map((method, idx) => (
                            <option key={idx} value={method}>{method}</option>
                        ))}
                    </select>
                </div>

                {formData.transporte?.toUpperCase().includes('RETIRO') ? (
                    <div className="form-group">
                        <p style={{ margin: 0, fontSize: '13px', color: '#0369a1', background: '#e0f2fe', padding: '12px 14px', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                            📍 <strong>Retiro presencial en Tienda / Taller en San Carlos, Región de Ñuble.</strong> Te contactaremos por WhatsApp con la dirección exacta y horarios disponibles para la entrega.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="form-group">
                            <label><MapPin size={16} /> Tipo de Entrega *</label>
                            <select 
                                value={formData.tipo_despacho}
                                onChange={(e) => setFormData({...formData, tipo_despacho: e.target.value})}
                            >
                                <option value="DOMICILIO">Despacho a Domicilio</option>
                                <option value="SUCURSAL">Retiro en Sucursal de Envío</option>
                            </select>
                        </div>

                        <div className="form-row" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%'}}>
                            <div className="form-group">
                                <label><MapPin size={16} /> Región</label>
                                <select 
                                    value={formData.region} 
                                    onChange={handleRegionChange}
                                >
                                    <option value="">Selecciona una región</option>
                                    {regiones.map(r => (
                                        <option key={r.id} value={r.nombre}>{r.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label><MapPin size={16} /> Comuna</label>
                                <select 
                                    value={formData.comuna || ''} 
                                    onChange={handleComunaChange}
                                    disabled={!formData.region}
                                >
                                    <option value="">Selecciona una comuna</option>
                                    {comunas.map(c => (
                                        <option key={c.id} value={c.nombre}>{c.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {formData.tipo_despacho === 'SUCURSAL' ? (
                            <div className="form-group">
                                <p style={{ margin: 0, fontSize: '13px', color: '#64748b', background: '#f8fafc', padding: '12px 14px', borderRadius: '12px' }}>
                                    Retiras en una sucursal de <strong>{formData.transporte}</strong>. Coordinarás la sucursal exacta por WhatsApp según tu comuna.
                                </p>
                            </div>
                        ) : (
                            <div className="form-group">
                                <label><MapPin size={16} /> Dirección (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Calle, número..."
                                    value={formData.direccion}
                                    onChange={(e) => setFormData({...formData, direccion: e.target.value})}
                                />
                            </div>
                        )}
                    </>
                )}

                {tipoContacto === 'grupo' && (
                    <>
                        <div className="form-row" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', width: '100%'}}>
                            <div className="form-group">
                                <label><Users size={16} /> Tipo de Grupo</label>
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
                                <label><Users size={16} /> Cantidad Aprox.</label>
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
                            <label><Calendar size={16} /> Fecha de Evento (Opcional)</label>
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
                    <label><FileText size={16} /> Mensaje</label>
                    <textarea 
                        rows="4" 
                        placeholder="Cuéntanos más para asesorarte mejor..."
                        value={formData.mensaje}
                        onChange={(e) => setFormData({...formData, mensaje: e.target.value})}
                    ></textarea>
                </div>
                
                        </div>
                        
                        <div className="contact-form-footer">
                            <Button type="submit" variant="primary" disabled={status === 'sending'} style={{width: '100%'}}>
                                {status === 'sending' ? 'Enviando...' : 'Enviar Solicitud'}
                            </Button>
                            
                            {status === 'success' && (
                                <div className="success-banner">¡Listo! Te abrimos WhatsApp para enviar tu solicitud a Paola. Si no se abrió, revisa que tu navegador permita ventanas emergentes.</div>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    return (
        <section className="contacto-view">
            {renderFormModal()}
            <div className="container">
                <div className="contacto-header">
                    <span className="subtitle">Hablemos</span>
                    <h1>Contacto Directo</h1>
                    <p className="hero-text">Estamos en San Carlos, Ñuble, listos para vestir tu fe con elegancia.</p>
                </div>

                <div className="contacto-main-container">
                    {renderSelection()}
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
                    {contact.phone_display && (
                        <div className="info-block">
                            <h4><Phone size={18} /> Teléfono Directo</h4>
                            <p>{contact.phone_display}</p>
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
                    paddingTop: '40px',
                    flexWrap: 'wrap'
                }}>
                    {social.facebook && (
                        <a href={social.facebook} target="_blank" rel="noopener noreferrer" className="social-link-item">
                            <Globe size={24} /> <span>Facebook</span>
                        </a>
                    )}
                    {social.instagram && (
                        <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="social-link-item">
                            <Camera size={24} /> <span>Instagram</span>
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
                
                /* Modal Estilos */
                .contact-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(15, 23, 42, 0.7);
                    backdrop-filter: blur(4px);
                    z-index: 9999;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                .contact-modal-card {
                    width: 100%;
                    max-width: 800px;
                    background: white;
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                }

                .contact-modal-header {
                    padding: 24px;
                    background: #f8fafc;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #e2e8f0;
                    flex-shrink: 0;
                    box-sizing: border-box;
                    width: 100%;
                }
                .contact-modal-header h2 { margin: 0; font-size: 1.25rem; font-weight: 800; color: #1e1b4b; }
                
                .btn-close-modal { background: none; border: none; cursor: pointer; color: #94a3b8; }
                .btn-close-modal:hover { color: #1e1b4b; }

                .contact-form {
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    width: 100%;
                    box-sizing: border-box;
                }

                .contact-form-body {
                    padding: 24px;
                    overflow-y: auto;
                    overflow-x: hidden;
                    box-sizing: border-box;
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .contact-form-footer {
                    padding: 24px;
                    background: white;
                    border-top: 1px solid #e2e8f0;
                    flex-shrink: 0;
                    box-sizing: border-box;
                    width: 100%;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .form-intro { font-size: 14px; color: #64748b; margin-bottom: 8px; line-height: 1.5; margin-top: 0; }

                @media (max-width: 768px) {
                    .contact-modal-card {
                        max-height: 95vh;
                    }
                    .contact-modal-header, .contact-form-body, .contact-form-footer {
                        padding: 16px;
                    }
                }
                
                /* Estilos homologados con CheckoutForm */
                .contact-form .form-group label {
                    font-size: 13px;
                    font-weight: 700;
                    color: #1e1b4b;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    text-transform: none;
                    letter-spacing: normal;
                    margin-bottom: 8px;
                }
                .contact-form input, 
                .contact-form select, 
                .contact-form textarea {
                    height: 48px;
                    padding: 0 16px;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    font-size: 14px;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    box-sizing: border-box;
                    width: 100%;
                    background: white;
                }
                .contact-form textarea {
                    height: auto;
                    padding: 16px;
                }
                .contact-form input:focus, 
                .contact-form select:focus, 
                .contact-form textarea:focus {
                    outline: none;
                    border-color: #1e1b4b;
                    box-shadow: 0 0 0 3px rgba(30, 27, 75, 0.05);
                }
            `}</style>
        </section>
    );
};

export default Contacto;
