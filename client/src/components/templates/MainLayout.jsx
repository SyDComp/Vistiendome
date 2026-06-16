import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useConfig } from '../../context/ConfigContext';
import Footer from '../organisms/Footer';
import CartDrawer from '../organisms/CartDrawer';
import TopBanner from '../molecules/TopBanner';
import './MainLayout.css';

const MainLayout = () => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user, isAuthenticated, logout } = useAuth();
    const { cartCount, isCartOpen, setIsCartOpen } = useCart();
    const { storeName, configs } = useConfig();
    const navigate = useNavigate();
    const location = useLocation();

    // Check catalog mode
    const isCatalogMode = configs?.catalog_mode === 'Activado';

    // Check if we are on the home page
    const isHome = location.pathname === '/';

    // Calculate scrollbar width for smooth transitions
    useEffect(() => {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
    }, []);

    // Scroll effect & Hide/Show logic
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    useEffect(() => {
        const handleScroll = () => {
            if (document.body.style.overflow === 'hidden') return;

            const currentScrollY = window.scrollY;
            const isScrolled = currentScrollY > 50;
            const scrollDiff = currentScrollY - lastScrollY;

            // Determine visibility - ALWAYS visible if mobile menu is open
            if (mobileMenuOpen) {
                setIsVisible(true);
            } else if (currentScrollY <= 10) {
                // At the very top -> Always show
                setIsVisible(true);
            } else if (scrollDiff > 10) {
                // Scrolling DOWN (more than 10px) -> Hide
                setIsVisible(false);
            } else if (scrollDiff < -10) {
                // Scrolling UP (more than 10px) -> Show
                setIsVisible(true);
            }

            if (isScrolled !== scrolled) {
                setScrolled(isScrolled);
            }

            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [scrolled, lastScrollY, mobileMenuOpen]);

    // Block body scroll when mobile menu is open using "Fixed + Offset" trick
    useEffect(() => {
        if (mobileMenuOpen) {
            // ONLY if scroll is not already locked by another modal
            if (!document.body.classList.contains('modal-open')) {
                const scrollY = window.scrollY;
                document.body.style.position = 'fixed';
                document.body.style.top = `-${scrollY}px`;
                document.body.style.width = '100vw';
                document.body.classList.add('modal-open');
            }
        } else {
            // Restore only if no other active layers are present
            setTimeout(() => {
                const activeModals = document.querySelectorAll('.modal-overlay, .cart-drawer-overlay, .mobile-menu-open');
                if (activeModals.length === 0) {
                    const scrollY = document.body.style.top;
                    document.body.style.position = '';
                    document.body.style.top = '';
                    document.body.style.width = '';
                    document.body.classList.remove('modal-open');
                    window.scrollTo(0, parseInt(scrollY || '0') * -1);
                }
            }, 50);
        }
    }, [mobileMenuOpen]);

    // Close mobile menu on resize to prevent "stuck" state
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 768 && mobileMenuOpen) {
                setMobileMenuOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [mobileMenuOpen]);

    // Close mobile menu and RESET scroll on route change
    useEffect(() => {
        setMobileMenuOpen(false);
        
        // Immediate cleanup of any scroll locks from previous page
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.classList.remove('modal-open');
        document.body.classList.remove('product-modal-open');
        
        window.scrollTo(0, 0);
    }, [location.pathname]);

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // Update document title
    useEffect(() => {
        const routeNames = {
            '/': 'Inicio',
            '/catalogo': 'Catálogo',
            '/el-taller': 'El Taller',
            '/contacto': 'Contacto',
            '/nosotros': 'Sobre Nosotros',
            '/terminos': 'Términos',
            '/envios': 'Envíos',
            '/checkout': 'Finalizar Compra',
            '/login': 'Acceso',
            '/register': 'Registro'
        };
        const pageTitle = routeNames[location.pathname] || 'Tienda';
        document.title = `${pageTitle} | ${storeName}`;
    }, [location.pathname, storeName]);

    return (
        <div className="main-layout-container">
            {/* Header fijo: Banner + Navbar juntos */}
            <div className={`sticky-header-wrapper ${!isVisible ? 'nav-hidden' : ''}`}>
                {/* Top Banner (Promo, Vacation, etc.) */}
                <TopBanner />

                {/* Navbar */}
                <nav className={`main-nav ${scrolled || !isHome ? 'scrolled' : ''} ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
                    <div className="nav-logo">
                        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>{storeName}</Link>
                    </div>

                <div className={`nav-links ${mobileMenuOpen ? 'mobile-active' : ''}`}>
                    {isAuthenticated && mobileMenuOpen ? (
                        <div className="user-menu">
                            <span className="user-greeting">Hola, {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}</span>
                        </div>
                    ) : null}

                    <Link
                        to="/catalogo"
                        onClick={() => {
                            setMobileMenuOpen(false);
                            window.dispatchEvent(new Event('catalog-reset'));
                        }}
                    >
                        Catálogo
                    </Link>
                    <Link to="/el-taller" onClick={() => setMobileMenuOpen(false)}>El Taller</Link>
                    <Link to="/contacto" onClick={() => setMobileMenuOpen(false)}>Contacto</Link>

                    {isAuthenticated ? (
                        <div className="user-menu">
                            {!mobileMenuOpen && <span className="user-greeting">Hola, {user?.full_name?.split(' ')[0] || user?.email?.split('@')[0]}</span>}
                            {user?.role?.name === 'Admin' && (
                                <Link to="/admin" className="admin-link" onClick={() => setMobileMenuOpen(false)}>
                                    Panel Admin
                                </Link>
                            )}
                        </div>
                    ) : (
                        <Link to="/login" className="login-btn" onClick={() => setMobileMenuOpen(false)}>Acceso</Link>
                    )}

                    {isAuthenticated ? (
                        <div className="user-menu">
                            <button onClick={handleLogout} className="logout-btn-public">
                                Salir
                            </button>
                        </div>
                    ) : null}
                </div>

                <div className="nav-actions">
                    {/* Global Cart Icon - Hidden in Catalog Mode */}
                    {!isCatalogMode && (
                        <button
                            className="nav-cart-btn"
                            onClick={() => setIsCartOpen(true)}
                            aria-label="Ver carrito"
                        >
                            <span className="cart-icon-emoji">🛒</span>
                            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                        </button>
                    )}

                    <button
                        className="mobile-menu-toggle"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        aria-label="Toggle menu"
                    >
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>

                {mobileMenuOpen && (
                    <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}></div>
                )}
                </nav>
            </div>{/* end sticky-header-wrapper */}

            {/* Main Content */}
            <main className="main-content">
                <Outlet />
            </main>

            {/* Footer */}
            <Footer />

            {/* Global Cart Drawer */}
            <CartDrawer
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
            />
        </div>
    );
};

export default MainLayout;
