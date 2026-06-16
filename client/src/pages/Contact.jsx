import React, { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { useConfig } from '../context/ConfigContext';
import api from '../services/api';
import Input from '../components/atoms/Input';
import Button from '../components/atoms/Button';
import { WhatsAppIcon, InstagramIcon, FacebookIcon, MailIcon } from '../components/atoms/SocialIcons';
import EmailActionDialog from '../components/molecules/EmailActionDialog';
import SectionHeader from '../components/atoms/SectionHeader';
import './Contact.css';

export default function Contact() {
    const { showNotification } = useNotification();
    const { socialLinks } = useConfig();
    const [loading, setLoading] = useState(false);
    const [activeEmail, setActiveEmail] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            // Allow only numbers and +
            const filteredValue = value.replace(/[^0-9+]/g, '');
            setFormData(prev => ({ ...prev, [name]: filteredValue }));
        } else {
            setFormData(prev => ({
                ...formData,
                [name]: value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validations
        if (!formData.name || formData.name.trim().length < 3) {
            showNotification('error', "Por favor ingresa tu nombre completo.");
            return;
        }

        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            showNotification('error', "Por favor ingresa un correo electrónico válido.");
            return;
        }

        // Phone is optional. Only validate if not empty.
        if (formData.phone && formData.phone.trim().length > 0 && formData.phone.trim().length < 8) {
            showNotification('error', "Por favor ingresa un número de teléfono válido (mínimo 8 dígitos) o déjalo en blanco.");
            return;
        }

        if (!formData.subject || formData.subject.trim().length < 3) {
            showNotification('error', "Por favor ingresa un asunto válido para tu mensaje.");
            return;
        }

        if (!formData.message || formData.message.trim().length < 10) {
            showNotification('error', "Por favor ingresa un mensaje más detallado (mínimo 10 caracteres).");
            return;
        }

        setLoading(true);

        try {
            await api.post('/contact', formData);
            showNotification('success', 'Mensaje enviado exitosamente. Te responderemos pronto.');
            setFormData({
                name: '',
                email: '',
                phone: '',
                subject: '',
                message: ''
            });
        } catch (err) {
            if (err.response) {
                showNotification('error', 'Error al enviar el mensaje. Por favor intenta nuevamente.');
            } else {
                showNotification('error', 'Error de conexión. Por favor verifica tu conexión a internet.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="contact-page">
            <SectionHeader 
                title="Contacto"
                subtitle="Nos encantaría saber de ti"
            />

            <div className="contact-layout">
                {/* Contact Form */}
                <div className="contact-form-section">
                    <h2>Envíanos un mensaje</h2>

                    <form onSubmit={handleSubmit} className="contact-form" noValidate>
                        <Input
                            label="Nombre"
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="Ej: María González"
                        />
                        <Input
                            label="Email"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="Ej: maria@correo.cl"
                        />
                        <Input
                            label="Teléfono (Opcional)"
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="Ej: +56912345678"
                            maxLength={15}
                        />
                        <Input
                            label="Asunto"
                            type="text"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            required
                            placeholder="Ej: Consulta sobre un producto"
                        />

                        {/* Textarea styled consistently with Input atom */}
                        <div className="input-wrapper">
                            <label className="input-label">
                                Mensaje <span className="input-required">*</span>
                            </label>
                            <div className="input-container">
                                <textarea
                                    name="message"
                                    rows="5"
                                    className="input-field"
                                    style={{ resize: 'vertical', height: 'auto' }}
                                    placeholder="Escribe aqui tu consulta o mensaje..."
                                    value={formData.message}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <Button type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
                            {loading ? 'Enviando...' : 'Enviar Mensaje'}
                        </Button>
                    </form>
                </div>

                {/* Social Media Links */}
                <aside className="contact-sidebar">
                    <h3>Otros canales</h3>
                    <div className="social-links">
                        {socialLinks.whatsapp && (
                            <a
                                href={`https://wa.me/${socialLinks.whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="social-link"
                            >
                                <span className="icon"><WhatsAppIcon size={28} /></span>
                                <div>
                                    <strong>WhatsApp</strong>
                                    <p>{socialLinks.whatsapp}</p>
                                </div>
                            </a>
                        )}

                        {socialLinks.instagram && (
                            <a
                                href={`https://instagram.com/${socialLinks.instagram.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="social-link"
                            >
                                <span className="icon"><InstagramIcon size={28} /></span>
                                <div>
                                    <strong>Instagram</strong>
                                    <p>{socialLinks.instagram}</p>
                                </div>
                            </a>
                        )}

                        {socialLinks.facebook && (
                            <a
                                href={socialLinks.facebook.startsWith('http') ? socialLinks.facebook : `https://${socialLinks.facebook}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="social-link"
                            >
                                <span className="icon"><FacebookIcon size={28} /></span>
                                <div>
                                    <strong>Facebook</strong>
                                    <p>Visita nuestra página</p>
                                </div>
                            </a>
                        )}

                        {socialLinks.email && (
                            <div
                                onClick={() => setActiveEmail(socialLinks.email)}
                                className="social-link"
                                style={{ cursor: 'pointer' }}
                            >
                                <span className="icon"><MailIcon size={28} color="#6366f1" /></span>
                                <div>
                                    <strong>Email</strong>
                                    <p>{socialLinks.email}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            {activeEmail && (
                <EmailActionDialog 
                    email={activeEmail} 
                    onClose={() => setActiveEmail(null)} 
                    showContactLink={false} 
                />
            )}

        </div>
    );
}
