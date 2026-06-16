import React, { use, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useConfig } from '../../context/ConfigContext';
import { InstagramIcon, FacebookIcon, WhatsAppIcon } from '../atoms/SocialIcons';
import './Footer.css';

const Footer = () => {
    const { configs, socialLinks, storeName } = useConfig();
    const [userRole, setUserRole] = useState(null)

    const [movilScreen, setMovilScreen] = useState(window.innerWidth < 769);

    const [styles, setStyles] = useState({
        textAlign: 'left',
    });

    useEffect(() => {
        const readUser = () => {
            const user = JSON.parse(localStorage.getItem('user'));
            setUserRole(user ? (user.role?.name || user.role) : null);
        };

        readUser(); // initial read on mount
        window.addEventListener('authChange', readUser); // react to login/logout
        return () => window.removeEventListener('authChange', readUser);
    }, []);

    useEffect(() => {
        const handleResize = () => setMovilScreen(window.innerWidth < 769);
        window.addEventListener('resize', handleResize);

        if (window.innerWidth < 769) {
            setStyles({ textAlign: 'center' });
        } else {
            setStyles({ textAlign: 'left' });
        }
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <footer className="main-footer">
            <div className="footer-content">
                <div className="footer-brand" style={styles}>
                    <h3><Link to="/">{storeName}</Link></h3>
                    <p style={{ color: '#666', fontSize: '0.85rem' }}>© {new Date().getFullYear()}</p>
                    <div className="footer-socials" style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                        {socialLinks.instagram && (
                            <a href={`https://instagram.com/${socialLinks.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" title="Instagram" style={{ display: 'flex', alignItems: 'center' }}>
                                <InstagramIcon size={24} />
                            </a>
                        )}
                        {socialLinks.facebook && (
                            <a 
                                href={socialLinks.facebook.startsWith('http') ? socialLinks.facebook : `https://${socialLinks.facebook}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                title="Facebook" 
                                style={{ display: 'flex', alignItems: 'center' }}
                            >
                                <FacebookIcon size={24} />
                            </a>
                        )}
                        {socialLinks.whatsapp && (
                            <a href={`https://wa.me/${socialLinks.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" title="WhatsApp" style={{ display: 'flex', alignItems: 'center' }}>
                                <WhatsAppIcon size={24} />
                            </a>
                        )}
                    </div>

                    {!movilScreen && (
                        <div className="footer-credits">
                            <p>Desarrollado y potenciado por <a href="https://sydcomp.com/" target="_blank" rel="noopener noreferrer">SyDComp</a></p>
                        </div>
                    )}
                </div>

                <div className="footer-links-column" style={{ textAlign: 'center' }}>
                    <h4>Legales</h4>
                    <Link to="/nosotros">Nosotros</Link>
                    <Link to="/terminos">Términos y Condiciones</Link>
                    <Link to="/envios">Políticas de Envío</Link>
                </div>

                <div className="footer-links-column" style={{ textAlign: 'right' }}>
                    <h4>Zona Privada</h4>
                    {userRole === 'Vendedor' && <Link to="/vendedor">Portal Vendedores</Link>}
                    {userRole === 'Repartidor' && <Link to="/repartidor">Portal Repartidores</Link>}
                    {userRole === 'Soporte' && <Link to="/soporte">Portal Soporte</Link>}
                    {userRole === 'Admin' && <Link to="/admin">Panel Admin</Link>}
                    {!userRole && <Link to="/login">Acceso Usuarios</Link>}
                </div>
            </div>

            {movilScreen && (
                <div className="footer-credits">
                    <p>Desarrollado y potenciado por <a href="https://sydcomp.com/" target="_blank" rel="noopener noreferrer">SyDComp</a></p>
                </div>
            )}

            {/* 
            <div className="footer-credits">
                <p>Desarrollado y potenciado por <a href="https://sydcomp.com/" target="_blank" rel="noopener noreferrer">SyDComp</a></p>
            </div> */}
        </footer>
    );
};

export default Footer;
