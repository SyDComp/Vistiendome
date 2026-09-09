import LogoVistiendome from '../../ui/LogoVistiendome';
import React from 'react';
import './Footer.css';
import {
    Camera,
    Globe,
    MessageCircle,
    Mail,
    Music,
    MapPin,
    Clock,
    Phone,
    Map,
    Navigation
} from 'lucide-react';
import { navLinks, soporteLinks } from '../../../constants/navegacion';
import { useSettings } from '../../../context/SettingsContext';
import { buildMapLinks } from '../../../utils/mapLinks';
import { formatearTelefono } from '../../../utils/telefono';

const Footer = ({ onNavigate }) => {
    const { settings } = useSettings();
    const social = settings.social_links || {};
    const contact = settings.contact_info || {};
    const { googleMapsUrl, wazeUrl } = buildMapLinks();

    // Orden por prioridad: Facebook primero (es el canal más importante para Vistiendomé)
    const socialItems = [
        { id: 'facebook', url: social.facebook, icon: <Globe size={18} />, name: 'Facebook' },
        { id: 'instagram', url: social.instagram, icon: <Camera size={18} />, name: 'Instagram' },
        { id: 'tiktok', url: social.tiktok, icon: <Music size={18} />, name: 'TikTok' },
        { id: 'whatsapp', url: social.whatsapp ? `https://wa.me/${social.whatsapp.replace(/\D/g, '')}` : '', icon: <MessageCircle size={18} />, name: 'WhatsApp' },
        { id: 'maps', url: googleMapsUrl, icon: <Map size={18} />, name: 'Google Maps' },
        { id: 'waze', url: wazeUrl, icon: <Navigation size={18} />, name: 'Waze' },
    ].filter(item => item.url);

    return (
        <footer className="footer-layout">
            <div className="container footer-grid">
                {/* Columna 1: Marca y Bio */}
                <div className="footer-col brand-col">
                    <LogoVistiendome tamano="32px" />
                    <p className="footer-bio">
                        Diseño y confección propia de moda modesta y elegante en San Carlos, Chile.
                        Especialistas en tallaje inclusivo (12 a 7XL) y uniformes congregacionales.
                    </p>
                    <div className="footer-social-section">
                        <span className="social-label">CONECTA CON NOSOTROS</span>
                        <div className="social-links-row">
                            {socialItems.map((red) => (
                                <a
                                    key={red.id}
                                    href={red.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="social-btn"
                                >
                                    {red.icon}
                                    <span>{red.name}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Columna 2: Navegación */}
                <div className="footer-col">
                    <h4 className="footer-title">EXPLORA</h4>
                    <ul className="footer-links">
                        {navLinks.map((link) => (
                            <li key={link.destino}>
                                <button onClick={() => onNavigate(link.destino)}>
                                    {link.nombre}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Columna 3: Soporte */}
                <div className="footer-col">
                    <h4 className="footer-title">SERVICIO</h4>
                    <ul className="footer-links">
                        {soporteLinks.map((link) => (
                            <li key={link.id}>
                                <button onClick={() => onNavigate(link.destino, link.seccion)}>
                                    {link.nombre}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Columna 4: Contacto y Ubicación */}
                <div className="footer-col">
                    <h4 className="footer-title">VISÍTANOS</h4>
                    <div className="contact-info-list">
                        <div className="contact-info-item">
                            <MapPin size={16} className="contact-icon" />
                            <div>
                                <span className="info-label">Taller y Showroom</span>
                                <p>{contact.address || 'Camino San Camilo Km 1,8, San Carlos.'}</p>
                            </div>
                        </div>
                        <div className="contact-info-item">
                            <Clock size={16} className="contact-icon" />
                            <div>
                                <span className="info-label">Horarios de Atención</span>
                                <p>Lun - Vie: 09:00 - 18:00 <br/> Sáb: 09:00 - 14:00</p>
                            </div>
                        </div>
                        {contact.email && (
                            <div className="contact-info-item">
                                <Mail size={16} className="contact-icon" />
                                <div>
                                    <span className="info-label">Correo Directo</span>
                                    <p>{contact.email}</p>
                                </div>
                            </div>
                        )}
                        {contact.phone_display && (
                            <div className="contact-info-item">
                                <Phone size={16} className="contact-icon" />
                                <div>
                                    <span className="info-label">Teléfono Directo</span>
                                    <p>{formatearTelefono(contact.phone_display)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <div className="container">
                    <div className="bottom-flex">
                        <p className="copyright">© {new Date().getFullYear()} Vistiendomé. Todos los derechos reservados.</p>
                        <div className="footer-tagline">
                            <span className="heart">♡</span> Hecho en San Carlos, Chile
                        </div>
                    </div>
                </div>
            </div>

        </footer>
    );
};

export default Footer;
