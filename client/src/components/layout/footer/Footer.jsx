import React from 'react';
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
                    <h2 className="logo-text">Vistiendomé</h2>
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
                                    <span className="social-name">{red.name}</span>
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
                <div className="footer-col contact-col">
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
                                    <p>{contact.phone_display}</p>
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

            <style>{`
                .footer-layout {
                    background-color: #ffffff;
                    border-top: 1px solid #f1f5f9;
                    padding: 80px 0 0 0;
                    color: #475569;
                }
                .footer-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr 1fr 1.5fr;
                    gap: 60px;
                    padding-bottom: 60px;
                }
                .footer-col {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .logo-text {
                    font-family: 'Playfair Display', serif;
                    font-size: 32px;
                    font-weight: 900;
                    color: #1e1b4b;
                    margin: 0;
                }
                .footer-bio {
                    font-size: 15px;
                    line-height: 1.6;
                    color: #64748b;
                    max-width: 320px;
                    margin: 0;
                }
                .footer-title {
                    font-size: 12px;
                    font-weight: 900;
                    letter-spacing: 2px;
                    color: #1e1b4b;
                    margin: 0;
                    padding-bottom: 5px;
                    border-bottom: 2px solid #f1f5f9;
                }
                .footer-links {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .footer-links button {
                    background: none;
                    border: none;
                    padding: 0;
                    color: #64748b;
                    font-size: 14px;
                    text-align: left;
                    cursor: pointer;
                    transition: color 0.2s;
                }
                .footer-links button:hover {
                    color: #8f0653;
                }
                /* En pantalla táctil estos enlaces medían 18px de alto: se
                   fallaban al tocar. Se les da los 44px por padding (el ancho
                   ya alcanzaba) y se compensa el gap para que el pie no se
                   estire de más. En escritorio queda exactamente como estaba. */
                @media (pointer: coarse) {
                    .footer-links { gap: 0; }
                    .footer-links button {
                        min-height: 44px;
                        display: flex;
                        align-items: center;
                    }
                }

                /* Social Section */
                .footer-social-section {
                    margin-top: 20px;
                }
                .social-label {
                    display: block;
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 1px;
                    color: #94a3b8;
                    margin-bottom: 15px;
                }
                .social-links-row {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 12px;
                }
                .social-btn {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 16px;
                    background: #f8fafc;
                    border-radius: 100px;
                    color: #475569;
                    text-decoration: none;
                    font-size: 13px;
                    font-weight: 700;
                    transition: all 0.3s;
                }
                /* 34px de alto en táctil: el ancho sobraba, faltaba el alto. */
                @media (pointer: coarse) {
                    .social-btn { min-height: 44px; }
                }
                .social-btn:hover {
                    background: #fdf2f8;
                    color: #8f0653;
                    transform: translateY(-2px);
                }

                /* Contact Section */
                .contact-info-list {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }
                .contact-info-item {
                    display: flex;
                    gap: 12px;
                }
                .contact-icon {
                    color: #8f0653;
                    margin-top: 3px;
                    flex-shrink: 0;
                }
                .info-label {
                    display: block;
                    font-size: 11px;
                    font-weight: 800;
                    color: #1e1b4b;
                    margin-bottom: 4px;
                    text-transform: uppercase;
                }
                .contact-info-item p {
                    margin: 0;
                    font-size: 14px;
                    line-height: 1.4;
                    color: #64748b;
                }

                /* Footer Bottom */
                .footer-bottom {
                    border-top: 1px solid #f1f5f9;
                    padding: 30px 0;
                    background: #f8fafc;
                }
                .bottom-flex {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .copyright {
                    font-size: 13px;
                    color: #94a3b8;
                    margin: 0;
                }
                .footer-tagline {
                    font-size: 13px;
                    color: #64748b;
                    font-weight: 600;
                }
                .heart {
                    color: #8f0653;
                }

                @media (max-width: 1024px) {
                    .footer-grid {
                        grid-template-columns: 1fr 1fr;
                        gap: 40px;
                    }
                    .brand-col {
                        grid-column: span 2;
                    }
                }
                @media (max-width: 640px) {
                    .footer-grid {
                        grid-template-columns: 1fr;
                    }
                    .brand-col {
                        grid-column: span 1;
                    }
                }
            `}</style>
        </footer>
    );
};

export default Footer;
