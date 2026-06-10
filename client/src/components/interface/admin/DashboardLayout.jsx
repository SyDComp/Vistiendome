import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, Navigate, Link, useLocation } from 'react-router-dom';
import { 
    Package, 
    Image as ImageIcon, 
    Users, 
    LogOut, 
    ChevronLeft, 
    ChevronRight,
    Menu,
    X,
    LayoutDashboard,
    Zap,
    Hammer
} from 'lucide-react';
import InventoryModule from './inventory/InventoryModule';
import WorkspaceModule from './inventory/WorkspaceModule';
import BarcodePrinter from './inventory/BarcodePrinter';
import MediaGallery from './media/MediaGallery';
import HomepageManager from './cms/HomepageManager';
import CustomerServiceManager from './cms/CustomerServiceManager';
import SettingsManager from './cms/SettingsManager';

const DashboardLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // States para colapso (escritorio) y apertura (móvil)
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) setIsSidebarOpen(false); // Cerrar menú móvil si se escala a desktop
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('admin_token');
        if (!token) {
            navigate('/admin/login');
        }
    }, [navigate]);

    // Cerrar sidebar móvil al cambiar de ruta
    useEffect(() => {
        if (isMobile) setIsSidebarOpen(false);
    }, [location.pathname, isMobile]);

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        navigate('/admin/login');
    };

    // Estado de menús expandidos (Persistencia simple)
    const [expandedMenus, setExpandedMenus] = useState(() => {
        const saved = localStorage.getItem('admin_expanded_menus');
        return saved ? JSON.parse(saved) : { inventory: true }; // Inventario abierto por defecto
    });

    useEffect(() => {
        localStorage.setItem('admin_expanded_menus', JSON.stringify(expandedMenus));
    }, [expandedMenus]);

    const toggleMenu = (menuId) => {
        setExpandedMenus(prev => ({ ...prev, [menuId]: !prev[menuId] }));
    };

    const sidebarItems = [
        { id: 'workspace', label: 'Produccion', path: '/admin/dashboard/workspace', icon: Zap },
        { 
            id: 'inventory',
            label: 'Catalogo', 
            path: '/admin/dashboard/inventory', 
            icon: Package,
            children: [
                { label: 'Productos', path: '/admin/dashboard/inventory/products' },
                { label: 'Variantes', path: '/admin/dashboard/inventory/variants' },
                { label: 'Colecciones', path: '/admin/dashboard/inventory/collections' },
                { label: 'Categorias', path: '/admin/dashboard/inventory/categories' },
                { label: 'Caracteristicas', path: '/admin/dashboard/inventory/characteristics' },
                { label: 'Especificaciones', path: '/admin/dashboard/inventory/specifications' },
                { label: '🏷️ Códigos de Barras', path: '/admin/dashboard/inventory/barcodes' }
            ]
        },
        { id: 'media', label: 'Galeria', path: '/admin/dashboard/media', icon: ImageIcon },
        { 
            id: 'cms',
            label: 'Sitio Web', 
            path: '/admin/dashboard/cms', 
            icon: LayoutDashboard,
            children: [
                { label: 'Gestor de Portada', path: '/admin/dashboard/cms/homepage' },
                { label: 'Atención al Cliente', path: '/admin/dashboard/cms/help' },
                { label: 'Redes y Contacto', path: '/admin/dashboard/cms/settings' },
                { label: 'Blog (Pronto)', path: '/admin/dashboard/cms/blog', disabled: true },
            ]
        },
        { id: 'hr', label: 'Personal', path: '/admin/dashboard/hr', icon: Users, disabled: true },
    ];

    return (
        <div className={`admin-layout ${isMobile ? 'mobile' : 'desktop'}`}>
            
            {/* Header Móvil (solo visible en < 768px) */}
            {isMobile && (
                <header className="admin-header-mobile">
                    <div className="admin-sidebar-header-content">
                        <div className="admin-header-logo-box">V</div>
                        <span className="admin-header-logo-text">ADMIN</span>
                    </div>
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="admin-header-btn"
                    >
                        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </header>
            )}

            {/* Overlay para móvil */}
            {isMobile && isSidebarOpen && (
                <div 
                    onClick={() => setIsSidebarOpen(false)}
                    className="admin-overlay"
                />
            )}

            {/* Sidebar Lateral */}
            <aside className={`admin-sidebar ${isMobile ? 'mobile ' + (isSidebarOpen ? 'open' : 'closed') : 'desktop ' + (isCollapsed ? 'collapsed' : 'expanded')}`}>
                {/* Botón de Colapso (Solo Desktop) */}
                {!isMobile && (
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="admin-sidebar-collapse-btn"
                    >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                )}

                {/* Header fijado */}
                <div className={`admin-sidebar-header ${isMobile ? 'mobile' : 'desktop'}`}>
                    <div className="admin-sidebar-header-content">
                        <div className="admin-sidebar-logo-box">V</div>
                        {(!isCollapsed || isMobile) && (
                            <div className="admin-sidebar-title-container">
                                <h3 className="admin-sidebar-title">VISTIENDOMÉ</h3>
                                <span className="admin-sidebar-subtitle">Consola Admin</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Zona de Navegación */}
                <nav className="admin-sidebar-nav">
                    <ul className="admin-sidebar-nav-list">
                        {sidebarItems.map((item) => {
                            const Icon = item.icon;
                            const hasChildren = item.children && item.children.length > 0;
                            const isExpanded = expandedMenus[item.id];
                            const isActive = location.pathname.startsWith(item.path);

                            return (
                                <li key={item.id} className="admin-sidebar-nav-item">
                                        <div 
                                            onClick={() => hasChildren ? toggleMenu(item.id) : !item.disabled && navigate(item.path)}
                                            className={`admin-sidebar-link ${item.disabled ? 'disabled' : ''} ${isActive ? 'active' : 'inactive'} ${(isCollapsed && !isMobile) ? 'collapsed' : 'expanded'} ${!item.disabled ? 'sidebar-item-hover' : ''}`}
                                        >
                                            <Icon size={20} strokeWidth={2} />
                                            {(!isCollapsed || isMobile) && (
                                                <>
                                                    <span className={`admin-sidebar-link-label ${isActive ? 'bold' : 'normal'}`}>{item.label}</span>
                                                    {hasChildren && (
                                                        <span className={`admin-sidebar-chevron ${isExpanded ? 'expanded' : 'collapsed'}`}>
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                        </div>

                                    {/* Sub-items */}
                                    {hasChildren && isExpanded && (!isCollapsed || isMobile) && (
                                        <ul className="admin-sidebar-sublist">
                                            {item.children.map(child => {
                                                const isChildActive = location.pathname === child.path;
                                                return (
                                                    <li key={child.path} className="admin-sidebar-subitem">
                                                        <Link 
                                                            to={child.path}
                                                            className={`admin-sidebar-sublink ${isChildActive ? 'active' : 'inactive'} sidebar-child-hover`}
                                                        >
                                                            {child.label}
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Footer del Sidebar */}
                <div className="admin-sidebar-footer">
                    <button 
                        onClick={handleLogout}
                        className={`admin-sidebar-logout ${(isCollapsed && !isMobile) ? 'collapsed' : 'expanded'} logout-hover`}
                    >
                        <LogOut size={20} />
                        {(!isCollapsed || isMobile) && <span>Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>

            {/* Área de Contenido Central */}
            <main className={`admin-main ${isMobile ? 'mobile' : 'desktop'}`}>
                <div className={`admin-content-wrapper ${isMobile ? 'mobile' : 'desktop'}`}>
                    <div className="admin-content-inner">
                        <Routes>
                            <Route path="/" element={<Navigate to="/admin/dashboard/inventory/products" />} />
                            <Route path="/inventory" element={<Navigate to="/admin/dashboard/inventory/products" />} />
                            <Route path="/inventory/products" element={<InventoryModule view="products" />} />
                            <Route path="/inventory/variants" element={<InventoryModule view="variants" />} />
                            <Route path="/inventory/collections" element={<InventoryModule view="collections" />} />
                            <Route path="/inventory/bodega" element={<InventoryModule view="bodega" />} />
                            <Route path="/inventory/categories" element={<InventoryModule view="categories" />} />
                            <Route path="/inventory/characteristics" element={<InventoryModule view="characteristics" />} />
                            <Route path="/inventory/attributes" element={<InventoryModule view="characteristics" />} />
                            <Route path="/inventory/specifications" element={<InventoryModule view="specifications" />} />
                            <Route path="/inventory/barcodes" element={<BarcodePrinter />} />
                            <Route path="/workspace" element={<WorkspaceModule />} />
                            <Route path="/media" element={<MediaGallery asModal={false} />} />
                            <Route path="/cms/homepage" element={<HomepageManager />} />
                            <Route path="/cms/help" element={<CustomerServiceManager />} />
                            <Route path="/cms/settings" element={<SettingsManager />} />
                            <Route path="*" element={<Navigate to="/admin/dashboard/inventory/products" />} />
                        </Routes>
                    </div>
                </div>
            </main>

        </div>
    );
};

export default DashboardLayout;
