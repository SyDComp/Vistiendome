import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './SoporteLayout.css';

const SoporteLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { user, logout } = useAuth();

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    // Force uncollapsed on mobile
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768 && collapsed) {
                setCollapsed(false);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Check initially
        return () => window.removeEventListener('resize', handleResize);
    }, [collapsed]);

    // Close mobile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (mobileMenuOpen && !event.target.closest('.soporte-sidebar') && !event.target.closest('.mobile-menu-btn')) {
                setMobileMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [mobileMenuOpen]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className={`soporte-layout ${collapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
            {/* Mobile Menu Button */}
            {!mobileMenuOpen && (
                <button
                    className="mobile-menu-btn"
                    onClick={() => setMobileMenuOpen(true)}
                    aria-label="Abrir menú"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            )}

            {/* Overlay for mobile */}
            {mobileMenuOpen && <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)}></div>}

            {/* Sidebar */}
            <aside className="soporte-sidebar">
                <div className="sidebar-header">
                    <h2 className="sidebar-logo">{collapsed ? 'S' : '🎧 Soporte'}</h2>
                    <div className="readonly-badge">Lectura</div>

                    {/* Close button for mobile */}
                    <button
                        className="mobile-close-btn"
                        onClick={() => setMobileMenuOpen(false)}
                        aria-label="Cerrar menú"
                    >
                        ✕
                    </button>

                    {/* Collapse button for desktop */}
                    <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={collapsed ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"}></path>
                        </svg>
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <NavLink to="/soporte" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                        <span className="icon">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
                        </span>
                        {!collapsed && <span className="label">Dashboard</span>}
                    </NavLink>
                    <NavLink to="/soporte/productos" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                        <span className="icon">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                        </span>
                        {!collapsed && <span className="label">Productos</span>}
                    </NavLink>
                    <NavLink to="/soporte/ventas" className={({ isActive }) => isActive || location.pathname.includes('/soporte/entregas') ? 'nav-item active' : 'nav-item'}>
                        <span className="icon">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 100 4 2 2 0 000-4z"></path></svg>
                        </span>
                        {!collapsed && <span className="label">Ventas y Entregas</span>}
                    </NavLink>
                    <NavLink to="/soporte/mensajes" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                        <span className="icon">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                        </span>
                        {!collapsed && <span className="label">Mensajes</span>}
                    </NavLink>

                    <div className="nav-divider" style={{ margin: '1rem 0', borderTop: '1px solid var(--support-border, rgba(0,0,0,0.1))' }}></div>

                    <NavLink to="/" className="nav-item">
                        <span className="icon">
                            <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                        </span>
                        {!collapsed && <span className="label">Ver Tienda</span>}
                    </NavLink>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="user-avatar">{user?.full_name?.charAt(0)?.toUpperCase()}</div>
                        {!collapsed && (
                            <div className="user-details">
                                <div className="user-name">{user?.full_name || 'Usuario'}</div>
                                <div className="user-role">Soporte al Cliente</div>
                            </div>
                        )}
                    </div>
                    <button className="logout-btn" onClick={handleLogout} title="Cerrar Sesión">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                        {!collapsed && <span>Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="soporte-main">
                <Outlet />
            </main>
        </div>
    );
};

export default SoporteLayout;
