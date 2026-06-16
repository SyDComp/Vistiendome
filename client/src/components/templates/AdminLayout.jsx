import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import './AdminLayout.css';

const AdminLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const { user, logout } = useAuth();

    const fetchUnreadCount = async () => {
        try {
            const response = await api.get('/contact?unread_only=true');
            if (response.data) {
                setUnreadMessages(response.data.length);
            }
        } catch (error) {
            console.error('Error fetching unread count:', error);
        }
    };

    useEffect(() => {
        fetchUnreadCount();
        const handleUpdate = () => fetchUnreadCount();
        window.addEventListener('messages_updated', handleUpdate);
        return () => window.removeEventListener('messages_updated', handleUpdate);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    // Close mobile menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (mobileMenuOpen && !event.target.closest('.admin-sidebar') && !event.target.closest('.mobile-menu-btn')) {
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
        <div className={`admin-layout ${collapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
            {/* Mobile Menu Button - Only shows when menu is closed */}
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
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <h2 className="sidebar-logo">
                        ZONA ARTÍSTICA
                    </h2>

                    {/* Close button for mobile */}
                    <button
                        className="mobile-close-btn"
                        onClick={() => setMobileMenuOpen(false)}
                        aria-label="Cerrar menú"
                        title="Cerrar menú"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>

                    {/* Collapse button for desktop */}
                    <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
                        {collapsed ? '→' : '←'}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <NavLink to="/admin" end className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                        <span className="icon">📊</span>
                        <span className="label">Dashboard</span>
                    </NavLink>
                    <NavLink to="/admin/products" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                        <span className="icon">📦</span>
                        <span className="label">Productos</span>
                    </NavLink>
                    <NavLink to="/admin/sales" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                        <span className="icon">💰</span>
                        <span className="label">Ventas y Entregas</span>
                    </NavLink>
                    <NavLink to="/admin/galeria" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                        <span className="icon">🖼️</span>
                        <span className="label">Galería</span>
                    </NavLink>
                    <NavLink to="/admin/registros" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                        <span className="icon">📋</span>
                        <span className="label">Actividad</span>
                    </NavLink>
                    <NavLink to="/admin/mensajes" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''} ${unreadMessages > 0 ? 'has-badge' : ''}`}>
                        <span className="icon">
                            ✉️
                        </span>
                        <span className="label">Mensajes</span>
                        {unreadMessages > 0 && <span className="sidebar-badge">{unreadMessages}</span>}
                    </NavLink>
                    <NavLink to="/admin/invitaciones" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                        <span className="icon">👥</span>
                        <span className="label">Invitaciones</span>
                    </NavLink>
                    <NavLink to="/admin/taller" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                        <span className="icon">🎨</span>
                        <span className="label">El Taller</span>
                    </NavLink>
                    <NavLink to="/admin/config" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>
                        <span className="icon">⚙️</span>
                        <span className="label">Configuración</span>
                    </NavLink>

                    <div className="nav-divider" style={{ margin: '1rem 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}></div>

                    <NavLink to="/" className="nav-item">
                        <span className="icon">🏠</span>
                        <span className="label">Ver Tienda</span>
                    </NavLink>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <div className="avatar">{user?.username?.[0]?.toUpperCase() || 'A'}</div>
                        <div className="details">
                            <span className="username">{user?.username}</span>
                            <span className="role">{user?.role?.name}</span>
                        </div>
                    </div>
                    <button className="logout-btn" onClick={handleLogout} title="Cerrar Sesión">
                        🚪 <span className="label">Salir</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="admin-content">
                <div className="content-container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default AdminLayout;
