import { NavLink, useNavigate } from 'react-router-dom';
import Heartbeat from '../../interface/Heartbeat';
import { useEffect, useRef, useState } from 'react';
import CartButton from '../../interface/cart/CartButton';
import InstantSearch from './InstantSearch';

const Navbar = ({ links = [], vistaActual }) => { // links are passed from Home
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    
    // Referencias para el scroll
    const lastScrollY = useRef(0);
    const ticking = useRef(false);

    // Bloqueo de scroll al abrir el menú móvil
    useEffect(() => {
        if (isMenuOpen) {
            document.body.classList.add('no-scroll');
            document.documentElement.classList.add('no-scroll');
        } else {
            document.body.classList.remove('no-scroll');
            document.documentElement.classList.remove('no-scroll');
        }
        return () => {
            document.body.classList.remove('no-scroll');
            document.documentElement.classList.remove('no-scroll');
        };
    }, [isMenuOpen]);

    // Lógica para esconder/mostrar Navbar según scroll (Fail-Safe)
    useEffect(() => {
        const updateNavbar = () => {
            const currentScrollY = window.scrollY;

            // Siempre visible en la cima absoluta
            if (currentScrollY <= 10) {
                setIsVisible(true);
                lastScrollY.current = currentScrollY;
                ticking.current = false;
                return;
            }

            // Umbral de sensibilidad
            if (Math.abs(currentScrollY - lastScrollY.current) < 5) {
                ticking.current = false;
                return;
            }

            if (currentScrollY > lastScrollY.current) {
                // Bajando -> Esconder
                setIsVisible(false);
            } else {
                // Subiendo -> Mostrar
                setIsVisible(true);
            }

            lastScrollY.current = currentScrollY;
            ticking.current = false;
        };

        const handleScroll = () => {
            if (isMenuOpen) return; // Inactiva si el menú está abierto

            if (!ticking.current) {
                window.requestAnimationFrame(updateNavbar);
                ticking.current = true;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isMenuOpen]);

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

    return (
        <>
            <header className={`navbar-header ${!isVisible ? 'navbar-hidden' : ''}`}>
                <nav className="navbar container">
                    {/* Logo Section */}
                    <div className="navbar-logo" onClick={() => { navigate('/'); setIsMenuOpen(false); }}>
                        <span className="logo-text">Vistiendomé</span>
                        {/* <Heartbeat /> */}
                    </div>

                    {/* Desktop Search */}
                    <div className="navbar-search-desktop">
                        <InstantSearch />
                    </div>

                    {/* Desktop Links */}
                    <ul className="nav-links-desktop">
                        {links.map((link) => (
                            <li key={link.destino}>
                                <NavLink
                                    to={`/${link.destino}`}
                                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                                >
                                    {link.nombre}
                                </NavLink>
                            </li>
                        ))}
                    </ul>

                    {/* Desktop/Mobile Right Actions */}
                    <div className="navbar-actions">
                        <CartButton />
                        
                        {/* Hamburger Button (Mobile) */}
                        <button 
                            className={`menu-toggle ${isMenuOpen ? 'open' : ''}`}
                            onClick={toggleMenu}
                            aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
                            aria-expanded={isMenuOpen}
                        >
                            <span className="hamburger-bar"></span>
                            <span className="hamburger-bar"></span>
                            <span className="hamburger-bar"></span>
                        </button>
                    </div>
                </nav>
            </header>

            <style>{`
                .navbar-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                @media (max-width: 1024px) {
                    .navbar-actions { gap: 8px; }
                }
            `}</style>

            {/* Mobile Menu Drawer - MOVED OUTSIDE HEADER */}
            <div className={`nav-menu-mobile ${isMenuOpen ? 'open' : ''}`}>
                <div className="mobile-menu-content">
                    {/* Search on Mobile Drawer */}
                    <div className="navbar-search-mobile-wrapper">
                        <InstantSearch isMobile={true} onResultClick={() => setIsMenuOpen(false)} />
                    </div>

                    <ul className="nav-links-mobile">
                        {links.map((link) => (
                            <li key={link.destino}>
                                <NavLink
                                    to={`/${link.destino}`}
                                    className={({ isActive }) => `nav-link-mobile ${isActive ? 'active' : ''}`}
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    {link.nombre}
                                </NavLink>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </>
    );
};

export default Navbar;