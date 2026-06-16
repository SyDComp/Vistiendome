import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import api from '../../services/api';
import './Dashboard.css';

export default function SoporteDashboard() {
    const navigate = useNavigate();
    const user = authService.getCurrentUser();
    const [stats, setStats] = useState({
        sales_today: 0,
        active_deliveries: 0,
        total_products: 0,
        pending_sales: 0
    });
    const [activeDeliveries, setActiveDeliveries] = useState([]);
    const [recentSales, setRecentSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);

            // Fetch stats (parallel requests)
            const [salesRes, deliveriesRes, productsRes] = await Promise.all([
                api.get('/sales'),
                api.get('/deliveries'),
                api.get('/products')
            ]);

            const sales = salesRes.data;
            const deliveries = deliveriesRes.data;
            const products = productsRes.data;

            // Calculate stats
            const today = new Date().toISOString().split('T')[0];
            const salesToday = sales.filter(s => s.created_at?.startsWith(today)).length;
            const activeDelivs = deliveries.filter(d => {
                const status = d.status?.toLowerCase();
                return status !== 'delivered' && status !== 'cancelled';
            }).length;
            const pendingSales = sales.filter(s => s.status?.toLowerCase() === 'pending').length;

            setStats({
                sales_today: salesToday,
                active_deliveries: activeDelivs,
                total_products: products.length,
                pending_sales: pendingSales
            });

            // Set active deliveries (limit to 5)
            setActiveDeliveries(
                deliveries
                    .filter(d => {
                        const status = d.status?.toLowerCase();
                        return status !== 'delivered' && status !== 'cancelled';
                    })
                    .slice(0, 5)
            );

            // Set recent sales (limit to 5)
            setRecentSales(
                sales
                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                    .slice(0, 5)
            );

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickSearch = (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        // Try to determine what type of search
        if (searchQuery.startsWith('WEB-')) {
            // Likely a sale ID
            navigate(`/soporte/ventas?search=${searchQuery}`);
        } else {
            // Product search
            navigate(`/soporte/productos?search=${searchQuery}`);
        }
    };

    const getDeliveryStatusBadge = (status) => {
        const s = status?.toLowerCase();
        const statusMap = {
            'pending': { label: 'Pendiente', class: 'status-pending' },
            'assigned': { label: 'Asignado', class: 'status-assigned' },
            'in_transit': { label: 'En tránsito', class: 'status-transit' },
            'delivered': { label: 'Entregado', class: 'status-delivered' },
            'cancelled': { label: 'Cancelado', class: 'status-cancelled' },
            'failed': { label: 'Fallido', class: 'status-cancelled' }
        };
        const info = statusMap[s] || { label: status, class: '' };
        return <span className={`status-badge ${info.class}`}>{info.label}</span>;
    };

    if (loading) {
        return (
            <div className="soporte-dashboard">
                <div className="loading-message">
                    <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{margin: '0 auto 10px', display: 'block'}}><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z" fill="currentColor"/></svg>
                    Cargando datos del sistema...
                </div>
            </div>
        );
    }

    return (
        <div className="soporte-dashboard">
            <header className="dashboard-header">
                <h1>Atención al Cliente</h1>
                <p className="welcome-message">Bienvenido de vuelta, <strong>{user?.full_name?.split(' ')[0]}</strong> 👋</p>
            </header>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">
                        <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 100 4 2 2 0 000-4z"></path></svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Ventas Hoy</div>
                        <div className="stat-value">{stats.sales_today}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">
                        <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"></path></svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Entregas Activas</div>
                        <div className="stat-value">{stats.active_deliveries}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">
                         <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Productos Total</div>
                        <div className="stat-value">{stats.total_products}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">
                         <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    </div>
                    <div className="stat-content">
                        <div className="stat-label">Pendientes</div>
                        <div className="stat-value">{stats.pending_sales}</div>
                    </div>
                </div>
            </div>

            {/* Quick Search */}
            <div className="quick-search-section">
                <h2>🔍 Búsqueda Rápida</h2>
                <form onSubmit={handleQuickSearch} className="search-form">
                    <input
                        type="text"
                        placeholder="Buscar por ID de venta (ej: WEB-123) o nombre de producto..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                    <button type="submit" className="search-btn">Consultar</button>
                </form>

                <div className="quick-access-buttons">
                    <button onClick={() => navigate('/soporte/productos')} className="quick-btn modern-card">
                        <span style={{ fontSize: '1.25rem' }}>📦</span> Consultar Productos
                    </button>
                    <button onClick={() => navigate('/soporte/ventas')} className="quick-btn modern-card">
                        <span style={{ fontSize: '1.25rem' }}>🛒</span> Seguimiento Ventas
                    </button>
                    <button onClick={() => navigate('/soporte/entregas')} className="quick-btn modern-card">
                        <span style={{ fontSize: '1.25rem' }}>🚚</span> Estado Entregas
                    </button>
                </div>
            </div>

            <div className="dashboard-grid">
                {/* Active Deliveries */}
                <div className="dashboard-section modern-card">
                    <h2>🚚 Entregas en Curso</h2>
                    {activeDeliveries.length === 0 ? (
                        <p className="empty-message">Todo al día, no hay entregas activas en este momento.</p>
                    ) : (
                        <div className="deliveries-list">
                            {activeDeliveries.map((delivery) => (
                                <div key={delivery.id} className="delivery-item">
                                    <div className="delivery-header">
                                        <span className="delivery-id">#{delivery.sale?.internal_ref || delivery.id?.split('-')[0]}</span>
                                        {getDeliveryStatusBadge(delivery.status)}
                                    </div>
                                    <div className="delivery-info">
                                        <div className="info-row">
                                            <span className="label">Repartidor</span>
                                            <span>{delivery.courier?.full_name || 'No asignado'}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="label">Destino</span>
                                            <span>{delivery.sale?.customer_address || 'N/A'}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/soporte/ventas?id=${delivery.sale_id}`)}
                                        className="view-btn"
                                    >
                                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                                        Detalle de Orden
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Sales */}
                <div className="dashboard-section modern-card">
                    <h2>🛍️ Últimas Órdenes</h2>
                    {recentSales.length === 0 ? (
                        <p className="empty-message">Aún no hay ventas recientes en el sistema.</p>
                    ) : (
                        <div className="sales-list">
                            {recentSales.map((sale) => (
                                <div key={sale.id} className="sale-item">
                                    <div className="sale-header">
                                        <span className="sale-id">#{sale.internal_ref || 'S/N'}</span>
                                        <span className="sale-amount">${Number(sale.total || 0).toLocaleString('es-CL')}</span>
                                    </div>
                                    <div className="sale-info">
                                        <div className="info-row">
                                            <span className="label">Cliente</span>
                                            <span>{sale.customer_name || 'N/A'}</span>
                                        </div>
                                        <div className="info-row">
                                            <span className="label">Estado</span>
                                            <span className={`status-${sale.status}`}>{sale.status}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/soporte/ventas?id=${sale.id}`)}
                                        className="view-btn"
                                    >
                                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
                                        Detalle de Orden
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
