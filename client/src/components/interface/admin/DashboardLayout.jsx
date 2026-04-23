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
    LayoutDashboard
} from 'lucide-react';
import InventoryModule from './inventory/InventoryModule';
import MediaGallery from './media/MediaGallery';

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
        { 
            id: 'inventory',
            label: 'Inventario', 
            path: '/admin/dashboard/inventory', 
            icon: Package,
            children: [
                { label: 'Productos', path: '/admin/dashboard/inventory/products' },
                { label: 'Variantes', path: '/admin/dashboard/inventory/variants' },
                { label: 'Bodega (Kardex)', path: '/admin/dashboard/inventory/bodega' },
                { label: 'Categorías', path: '/admin/dashboard/inventory/categories' },
                { label: 'Características', path: '/admin/dashboard/inventory/characteristics' },
                { label: 'Especificaciones', path: '/admin/dashboard/inventory/specifications' }
            ]
        },
        { id: 'media', label: 'Galería', path: '/admin/dashboard/media', icon: ImageIcon },
        { id: 'hr', label: 'Personal', path: '/admin/dashboard/hr', icon: Users, disabled: true },
    ];

    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: isMobile ? 'column' : 'row',
            height: '100vh', 
            width: '100vw',
            backgroundColor: '#f8fafc', 
            fontFamily: 'Inter, sans-serif',
            overflow: 'hidden' 
        }}>
            
            {/* Header Móvil (solo visible en < 768px) */}
            {isMobile && (
                <header style={{
                    height: '60px',
                    backgroundColor: '#1e1b4b',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 20px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    zIndex: 110
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', background: '#8f0653', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>V</div>
                        <span style={{ fontWeight: '700', fontSize: '14px', letterSpacing: '0.5px' }}>ADMIN</span>
                    </div>
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                    >
                        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </header>
            )}

            {/* Overlay para móvil */}
            {isMobile && isSidebarOpen && (
                <div 
                    onClick={() => setIsSidebarOpen(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        zIndex: 115,
                        animation: 'fadeInOverlay 0.3s ease'
                    }}
                />
            )}

            {/* Sidebar Lateral */}
            <aside style={{ 
                width: isMobile ? '280px' : (isCollapsed ? '80px' : '280px'), 
                backgroundColor: '#1e1b4b', 
                color: 'white', 
                display: 'flex', 
                flexDirection: 'column', 
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: '4px 0 15px rgba(0,0,0,0.1)',
                zIndex: isMobile ? 120 : 100,
                position: isMobile ? 'fixed' : 'relative',
                height: isMobile ? '100%' : 'auto',
                left: isMobile ? (isSidebarOpen ? 0 : '-280px') : 0
            }}>
                {/* Botón de Colapso (Solo Desktop) */}
                {!isMobile && (
                    <button 
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        style={{
                            position: 'absolute',
                            right: '-12px',
                            top: '45px',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: '#8f0653',
                            color: 'white',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                            zIndex: 101,
                            transition: 'transform 0.3s'
                        }}
                    >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                    </button>
                )}

                {/* Header fijado */}
                <div style={{ 
                    padding: isMobile ? '20px' : '30px 20px', 
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div style={{ 
                            minWidth: '40px', 
                            height: '40px', 
                            background: '#8f0653', 
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '20px'
                        }}>V</div>
                        {(!isCollapsed || isMobile) && (
                            <div style={{ animation: 'fadeIn 0.3s' }}>
                                <h3 style={{ margin: 0, fontSize: '16px', letterSpacing: '0.5px', color: '#fff' }}>VISTIÉNDOME</h3>
                                <span style={{ color: '#8b8bbd', fontSize: '11px', textTransform: 'uppercase' }}>Consola Admin</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Zona de Navegación */}
                <nav style={{ 
                    flex: 1, 
                    padding: '20px 10px', 
                    overflowY: 'auto', 
                    overflowX: 'hidden'
                }}>
                    <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
                        {sidebarItems.map((item) => {
                            const Icon = item.icon;
                            const hasChildren = item.children && item.children.length > 0;
                            const isExpanded = expandedMenus[item.id];
                            const isActive = location.pathname.startsWith(item.path);

                            return (
                                <li key={item.id} style={{ marginBottom: '8px' }}>
                                    <div 
                                        onClick={() => hasChildren ? toggleMenu(item.id) : !item.disabled && navigate(item.path)}
                                        style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '15px',
                                            padding: '12px 15px', 
                                            borderRadius: '10px',
                                            textDecoration: 'none', 
                                            color: item.disabled ? '#433e7a' : (isActive ? '#fff' : '#8b8bbd'),
                                            background: (isActive && !hasChildren) ? '#8f0653' : 'transparent',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            cursor: item.disabled ? 'not-allowed' : 'pointer',
                                            justifyContent: (isCollapsed && !isMobile) ? 'center' : 'flex-start',
                                            position: 'relative'
                                        }}
                                        className={!item.disabled ? 'sidebar-item-hover' : ''}
                                    >
                                        <Icon size={20} strokeWidth={2} />
                                        {(!isCollapsed || isMobile) && (
                                            <>
                                                <span style={{ fontSize: '14px', fontWeight: isActive ? '600' : '400', flex: 1 }}>{item.label}</span>
                                                {hasChildren && (
                                                    <span style={{ transition: 'transform 0.3s', transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Sub-items */}
                                    {hasChildren && isExpanded && (!isCollapsed || isMobile) && (
                                        <ul style={{ listStyle: 'none', padding: '5px 0 0 45px', margin: 0, animation: 'fadeIn 0.2s ease' }}>
                                            {item.children.map(child => {
                                                const isChildActive = location.pathname === child.path;
                                                return (
                                                    <li key={child.path} style={{ marginBottom: '4px' }}>
                                                        <Link 
                                                            to={child.path}
                                                            style={{
                                                                display: 'block',
                                                                padding: '8px 10px',
                                                                fontSize: '13px',
                                                                color: isChildActive ? '#fff' : '#8b8bbd',
                                                                textDecoration: 'none',
                                                                borderRadius: '8px',
                                                                background: isChildActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                                                                fontWeight: isChildActive ? '600' : '400',
                                                                transition: 'all 0.2s'
                                                            }}
                                                            className="sidebar-child-hover"
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
                <div style={{ 
                    padding: '20px', 
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    backgroundColor: 'rgba(0,0,0,0.1)'
                }}>
                    <button 
                        onClick={handleLogout}
                        style={{ 
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: (isCollapsed && !isMobile) ? 'center' : 'flex-start',
                            gap: '15px',
                            padding: '12px', 
                            background: 'transparent', 
                            color: '#ef4444', 
                            border: '1px solid transparent', 
                            borderRadius: '10px', 
                            cursor: 'pointer',
                            fontWeight: '600', 
                            fontSize: '14px', 
                            transition: 'all 0.2s'
                        }}
                        className="logout-hover"
                    >
                        <LogOut size={20} />
                        {(!isCollapsed || isMobile) && <span>Cerrar Sesión</span>}
                    </button>
                </div>
            </aside>

            {/* Área de Contenido Central */}
            <main style={{ 
                flex: 1, 
                height: isMobile ? 'calc(100% - 60px)' : '100%', 
                display: 'flex', 
                flexDirection: 'column',
                overflow: 'hidden' 
            }}>
                <div style={{ 
                    flex: 1, 
                    padding: isMobile ? '15px' : '30px 40px',
                    overflow: 'hidden',
                    backgroundColor: '#f8fafc',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
                        <Routes>
                            <Route path="/" element={<Navigate to="/admin/dashboard/inventory/products" />} />
                            <Route path="/inventory" element={<Navigate to="/admin/dashboard/inventory/products" />} />
                            <Route path="/inventory/products" element={<InventoryModule view="products" />} />
                            <Route path="/inventory/variants" element={<InventoryModule view="variants" />} />
                            <Route path="/inventory/bodega" element={<InventoryModule view="bodega" />} />
                            <Route path="/inventory/categories" element={<InventoryModule view="categories" />} />
                            <Route path="/inventory/characteristics" element={<InventoryModule view="characteristics" />} />
                            <Route path="/inventory/attributes" element={<InventoryModule view="characteristics" />} />
                            <Route path="/inventory/specifications" element={<InventoryModule view="specifications" />} />
                            <Route path="/media" element={<MediaGallery />} />
                            <Route path="*" element={<Navigate to="/admin/dashboard/inventory/products" />} />
                        </Routes>
                    </div>
                </div>
            </main>

            <style>{`
                .sidebar-item-hover:hover {
                    background-color: rgba(255,255,255,0.05) !important;
                    color: #fff !important;
                }
                .sidebar-child-hover:hover {
                    background-color: rgba(255,255,255,0.05) !important;
                    color: #fff !important;
                    transform: translateX(4px);
                }
                .logout-hover:hover {
                    background-color: rgba(239, 68, 68, 0.1) !important;
                    border-color: rgba(239, 68, 68, 0.2) !important;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateX(-5px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes fadeInOverlay {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default DashboardLayout;
