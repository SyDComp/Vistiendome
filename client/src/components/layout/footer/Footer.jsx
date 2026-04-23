import React from 'react';
import { navLinks, redesSociales, soporteLinks } from '../../../constants/pruebas';

const Footer = ({ onNavigate }) => {
    return (
        <footer className="footer-layout">
            <div className="container footer-grid">
                {/* Columna 1: Marca */}
                <div className="footer-col brand-col">
                    <h2 className="logo-text">Vistiéndome</h2>
                    <p className="footer-bio">
                        Diseño y confección propia de moda modesta y elegante en San Carlos, Chile. 
                        Especialistas en tallaje inclusivo (12 a 7XL) y uniformes congregacionales de alta calidad.
                    </p>
                </div>

                {/* Columna 2: Navegación */}
                <div className="footer-col">
                    <h4>Catálogo</h4>
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
                    <h4>Atención al Cliente</h4>
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

                {/* Columna 4: Newsletter y Social */}
                <div className="footer-col social-col">
                    <h4>Newsletter</h4>
                    <p>Subscríbete para recibir noticias y lanzamientos.</p>
                    <div className="newsletter-input">
                        <input type="email" placeholder="Tu email..." />
                        <button>→</button>
                    </div>
                    <div className="social-icons">
                        {redesSociales.map((red) => (
                            <a 
                                key={red.id} 
                                href={red.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                title={red.nombre}
                            >
                                <span className="social-icon">{red.icono}</span>
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <div className="container">
                    <p>© {new Date().getFullYear()} Vistiéndome S.A. Todos los derechos reservados.</p>
                    <div className="footer-legal-links">
                        <span>Hecho con ♡ en Chile</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
