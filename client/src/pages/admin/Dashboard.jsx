import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import './Dashboard.css';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalProducts: 0,
        outOfStock: 0,
        pendingOrders: 0,
        unreadMessages: 0
    });
    const [recentSales, setRecentSales] = useState([]);
    const [recentMessages, setRecentMessages] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [productsRes, salesRes, messagesRes] = await Promise.all([
                    api.get('/products'),
                    api.get('/sales'),
                    api.get('/contact')
                ]);

                const products = productsRes.data || [];
                const sales = salesRes.data || [];
                const messages = messagesRes.data || [];

                setStats({
                    totalProducts: products.length,
                    outOfStock: products.filter(p => Number(p.stock) === 0).length,
                    pendingOrders: sales.filter(s => s.status === 'pending').length,
                    unreadMessages: messages.filter(m => !m.is_read).length
                });

                // Get newest items. Sorting by created_at.
                const parseDate = (d) => new Date(d + (d?.endsWith('Z') ? '' : 'Z'));

                const sortedSales = [...sales].sort((a, b) => parseDate(b.created_at || 0) - parseDate(a.created_at || 0)).slice(0, 5);
                const sortedMessages = [...messages].sort((a, b) => parseDate(b.created_at || 0) - parseDate(a.created_at || 0)).slice(0, 5);

                setRecentSales(sortedSales);
                setRecentMessages(sortedMessages);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return 'Fecha no disponible';
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('es-CL', {
            timeZone: 'America/Santiago',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    if (loading) {
        return <div className="dashboard-page container"><p style={{ marginTop: '2rem' }}>Cargando información del panel...</p></div>;
    }

    return (
        <div className="dashboard-page container">
            <div className="dashboard-header">
                <h1>Panel de Administración</h1>
                <p>Resumen rápido de la actividad de tu tienda.</p>
            </div>

            <div className="dashboard-section">
                <h2>Resumen de Tienda</h2>
                <div className="kpi-grid">
                    <div className="kpi-card">
                        <span className="kpi-icon">📦</span>
                        <div className="kpi-content">
                            <span className="kpi-value">{stats.totalProducts}</span>
                            <span className="kpi-label">Productos Publicados</span>
                            {stats.outOfStock > 0 && <span className="kpi-subtext">{stats.outOfStock} agotados</span>}
                        </div>
                    </div>
                    <div className="kpi-card">
                        <span className="kpi-icon">🛍️</span>
                        <div className="kpi-content">
                            <span className="kpi-value">{stats.pendingOrders}</span>
                            <span className="kpi-label">Ventas Pendientes</span>
                        </div>
                    </div>
                    <div className="kpi-card">
                        <span className="kpi-icon">✉️</span>
                        <div className="kpi-content">
                            <span className="kpi-value">{stats.unreadMessages}</span>
                            <span className="kpi-label">Mensajes sin Leer</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-section">
                <h2>Gestión Rápida</h2>
                <div className="actions-grid">
                    <Link to="/admin/products" className="action-card">
                        <span className="icon">➕</span>
                        Añadir / Editar Productos
                    </Link>
                    <Link to="/admin/config" className="action-card">
                        <span className="icon">⚙️</span>
                        Configurar Tienda
                    </Link>
                    <Link to="/admin/mensajes" className="action-card">
                        <span className="icon">💬</span>
                        Ver Mensajes
                    </Link>
                    <Link to="/admin/sales" className="action-card">
                        <span className="icon">📈</span>
                        Ver Despachos
                    </Link>
                </div>
            </div>

            <div className="dashboard-section">
                <h2>Actividad Reciente</h2>
                <div className="activity-grid">
                    {/* Pedidos */}
                    <div className="activity-card">
                        <h3>Últimos Pedidos</h3>
                        {recentSales.length > 0 ? (
                            <ul className="activity-list">
                                {recentSales.map(sale => (
                                    <li key={sale.id} className="activity-item">
                                        <div className="activity-info">
                                            <span className="activity-title">{sale.customer_name}</span>
                                            <span className="activity-meta">Total: ${Number(sale.total).toLocaleString('es-CL')}</span>
                                        </div>
                                        <span className={`activity-status ${sale.status}`}>
                                            {{
                                                'pending': 'Pendiente',
                                                'confirmed': 'Confirmada',
                                                'shipped': 'Enviada',
                                                'completed': 'Completada',
                                                'cancelled': 'Cancelada'
                                            }[sale.status] || sale.status}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p style={{ color: '#888', fontSize: '0.9rem' }}>No hay pedidos recientes.</p>
                        )}
                    </div>

                    {/* Mensajes */}
                    <div className="activity-card">
                        <h3>Últimos Mensajes</h3>
                        {recentMessages.length > 0 ? (
                            <ul className="activity-list">
                                {recentMessages.map(msg => (
                                    <li key={msg.id} className="activity-item">
                                        <div className="activity-info">
                                            <span className="activity-title">{msg.name}</span>
                                            <span className="activity-meta">{formatDate(msg.created_at)}</span>
                                        </div>
                                        {!msg.is_read && <span className="activity-status unread">Nuevo</span>}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p style={{ color: '#888', fontSize: '0.9rem' }}>No hay mensajes recientes.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
