import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useModal } from '../../context/ModalContext';
import { useWebSocket } from '../../context/WebSocketContext';
import api from '../../services/api';
import ExternalSaleModal from '../admin/sales/ExternalSaleModal';
import './Dashboard.css';

export default function VendedorDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [pendingSales, setPendingSales] = useState([]);
    const [mySales, setMySales] = useState([]);
    const [products, setProducts] = useState([]);
    const [couriers, setCouriers] = useState([]);
    const [isExternalModalOpen, setIsExternalModalOpen] = useState(false);
    const [stats, setStats] = useState({
        myTotal: 0,
        myCount: 0,
        totalCouriers: 0,
        availableCouriers: 0,
        busyCouriers: 0,
        completedCount: 0
    });
    const [loading, setLoading] = useState(true);
    const { showNotification } = useNotification();
    const { confirm } = useModal();
    const wsMessage = useWebSocket();

    useEffect(() => {
        fetchData();
    }, []);

    // WebSocket reactivity
    useEffect(() => {
        if (wsMessage && (wsMessage.event === 'SALES_UPDATED' || wsMessage.event === 'DELIVERIES_UPDATED')) {
            console.log('WebSocket update received for vendor dashboard');
            fetchData();
        }
    }, [wsMessage]);

    const fetchData = async () => {
        try {
            // Fetch pending sales (available for all vendors)
            const pendingRes = await api.get('/sales?status=pending');
            const allPending = pendingRes.data.filter(s => !s.seller_id); // Solo sin vendedor asignado
            setPendingSales(allPending);

            // Fetch MY sales (where I'm the seller)
            const myRes = await api.get('/sales/my-sales');

            // Fetch couriers for assignment via backend filtering
            const usersRes = await api.get('/users?role=Repartidor');
            const couriersList = usersRes.data;
            setCouriers(couriersList);

            const deliveriesRes = await api.get('/deliveries');
            const deliveriesData = deliveriesRes.data;

            // Map deliveries to MY sales
            const mySalesWithDelivery = myRes.data.map(sale => {
                const delivery = deliveriesData.find(d => d.sale_id === sale.id);
                return { ...sale, delivery };
            });
            setMySales(mySalesWithDelivery);

            // Fetch products for ExternalSaleModal
            const productsRes = await api.get('/products');
            setProducts(productsRes.data);

            calculateStats(mySalesWithDelivery, couriersList, deliveriesData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (sales, couriers, activeDeliveries) => {
        // Count couriers by availability
        const busyCourierIds = new Set(activeDeliveries.map(d => d.courier_id));
        const availableCouriers = couriers.filter(c => !busyCourierIds.has(c.id));

        console.log('📊 Stats calculation:');
        console.log('  - Busy courier IDs:', Array.from(busyCourierIds));
        console.log('  - Available couriers:', availableCouriers.length);
        console.log('  - Busy couriers:', busyCourierIds.size);

        setStats({
            myTotal: sales.reduce((sum, s) => sum + parseFloat(s.total || 0), 0),
            myCount: sales.length,
            totalCouriers: couriers.length,
            availableCouriers: availableCouriers.length,
            busyCouriers: busyCourierIds.size,
            completedCount: sales.filter(s => s.status === 'completed').length
        });
    };

    const handleManualStatus = async (saleId, deliveryId, newStatus) => {
        try {
            if (!deliveryId) {
                await api.post('/deliveries', {
                    sale_id: saleId,
                    courier_id: null,
                    status: newStatus
                });
            } else {
                await api.patch(`/deliveries/${deliveryId}`, {
                    status: newStatus
                });
            }
            showNotification('success', 'Estado actualizado correctamente');
            fetchData();
        } catch (error) {
            console.error('Error updating manual status:', error);
            showNotification('error', 'Error al actualizar estado manual');
        }
    };

    const assignCourier = async (saleId, courierId) => {
        try {
            // Create delivery assignment
            await api.post('/deliveries', {
                sale_id: saleId,
                courier_id: courierId,
                status: 'assigned'
            });
            showNotification('success', 'Repartidor asignado correctamente');
            fetchData();
        } catch (error) {
            console.error('Error assigning courier:', error);
            const detail = error.response?.data?.detail;
            showNotification('error', detail || 'Error al asignar el repartidor');
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="vendedor-dashboard-wrapper">
            {/* Topbar matching Courier dashboard style */}
            <div className="vendedor-topbar">
                <div className="topbar-logo">
                    <span className="logo-icon">💼</span> Panel de Ventas
                </div>
                <div className="topbar-actions">
                    <Link to="/" className="store-link" style={{ marginRight: '1rem', color: 'inherit', textDecoration: 'none', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }} title="Ir a la Tienda">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                        <span className="hide-on-mobile">Tienda</span>
                    </Link>
                    <div className="user-badge">
                        <div className="user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'V'}</div>
                    </div>
                    <button onClick={handleLogout} className="logout-button" title="Cerrar Sesión">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    </button>
                </div>
            </div>

            <header className="vendedor-header">
                <div className="header-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1>👋 Hola, <span className="highlight-name">{user?.full_name?.split(' ')[0]}</span></h1>
                        <p className="subtitle">Gestiona tus ventas y asigna repartidores</p>
                    </div>
                    <button
                        className="vendedor-btn-primary"
                        onClick={() => setIsExternalModalOpen(true)}
                    >
                        + Agregar Venta Externa
                    </button>
                </div>
            </header>

            <main className="vendedor-main">
                {/* Stats Cards */}
                <div className="kpi-grid">
                    <div className="kpi-card highlight">
                        <div className="kpi-icon-wrapper">
                            <span className="kpi-icon">💰</span>
                        </div>
                        <div className="kpi-content">
                            <h3>Total Gestionado</h3>
                            <p className="kpi-value">${stats.myTotal.toLocaleString()}</p>
                        </div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-icon-wrapper secondary">
                            <span className="kpi-icon">📦</span>
                        </div>
                        <div className="kpi-content">
                            <h3>Mis Ventas</h3>
                            <p className="kpi-value">{stats.myCount}</p>
                        </div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-icon-wrapper accent">
                            <span className="kpi-icon">🚚</span>
                        </div>
                        <div className="kpi-content">
                            <div className="kpi-header-row">
                                <h3>Repartidores</h3>
                                <span className="kpi-badge success">{stats.availableCouriers} Libres</span>
                            </div>
                            <p className="kpi-value">{stats.totalCouriers}</p>
                        </div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-icon-wrapper warning">
                            <span className="kpi-icon">🔄</span>
                        </div>
                        <div className="kpi-content">
                            <div className="kpi-header-row">
                                <h3>En Curso</h3>
                                <span className="kpi-badge info">Ocupados</span>
                            </div>
                            <p className="kpi-value">{stats.busyCouriers}</p>
                        </div>
                    </div>
                </div>

                <div className="dashboard-content-grid">
                    {/* Pending Sales - First Come First Served */}
                    <div className="content-column primary">
                        <div className="section-head">
                            <div className="section-title">
                                <h2>🔥 Ventas Disponibles</h2>
                                <span className="count-pill">{pendingSales.length}</span>
                            </div>
                            <p className="section-desc">Asigna repartidor para ganar esta venta</p>
                        </div>

                        {pendingSales.length === 0 ? (
                            <div className="empty-state-modern">
                                <span className="empty-emoji">🎉</span>
                                <h4>Todo al día</h4>
                                <p>No hay ventas pendientes por asignar en este momento.</p>
                            </div>
                        ) : (
                            <div className="cards-list">
                                {pendingSales.map(sale => (
                                    <div key={sale.id} className="task-card available-card">
                                        <div className="task-card-header">
                                            <div className="ref-badge">
                                                <span className="ref-label">Ref.</span>
                                                <span className="ref-number">#{sale.internal_ref}</span>
                                            </div>
                                            <span className="amount-badge">${parseFloat(sale.total).toLocaleString()}</span>
                                        </div>

                                        <div className="task-card-body">
                                            <h4 className="customer-name">{sale.customer_name}</h4>
                                            
                                            <div className="info-line">
                                                <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                                <span>{sale.customer_phone}</span>
                                            </div>
                                            
                                            <div className="info-line">
                                                <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                                <span>{sale.customer_address || 'Sin dirección'}</span>
                                            </div>
                                        </div>

                                        <div className="task-card-footer">
                                            <div className="select-wrapper">
                                                <select
                                                    className="modern-select"
                                                    onChange={async (e) => {
                                                        const courierId = e.target.value;
                                                        if (courierId) {
                                                            let warningMsg = '¿Asignar este repartidor? La venta pasará a tu lista ("Mis Ventas") y serás responsable de gestionarla y confirmarla.';
                                                            
                                                            if (sale.status === 'pending') {
                                                                warningMsg = '⚠️ ATENCIÓN: Esta venta está PENDIENTE. Al asignar un repartidor pasará automáticamente a estado "Confirmada" y te harás cargo de ella. ¿Deseas continuar?';
                                                            } else if (sale.status === 'confirmed') {
                                                                warningMsg = '¿Reasignar o asignar a este repartidor? Ya está en estado "Confirmada".';
                                                            }

                                                            const confirmed = await confirm({
                                                                title: 'Asignar a Repartidor',
                                                                message: warningMsg,
                                                                confirmText: 'Sí, Asignar',
                                                            });
                                                            
                                                            if (confirmed) {
                                                                assignCourier(sale.id, courierId);
                                                            }
                                                            // We no longer rely on e.target.value = "" here.
                                                            // By using `value=""` controlled by React below, it always resets.
                                                        }
                                                    }}
                                                    value=""
                                                >
                                                    <option value="" disabled>Asignar Repartidor...</option>
                                                    {couriers.map(c => (
                                                        <option key={c.id} value={c.id}>{c.full_name}</option>
                                                    ))}
                                                </select>
                                                <svg className="select-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* My Claimed Sales */}
                    <div className="content-column secondary">
                        <div className="section-head">
                            <div className="section-title">
                                <h2>💼 Mis Ventas</h2>
                            </div>
                            <p className="section-desc">Ventas asignadas a tu gestión</p>
                        </div>

                        {mySales.length === 0 ? (
                            <div className="empty-state-modern light">
                                <h4>Aún no gestionas ventas</h4>
                                <p>Asigna un repartidor a las ventas disponibles para hacerte cargo.</p>
                            </div>
                        ) : (
                            <div className="history-list">
                                    {mySales.map(sale => {
                                        const isExternal = sale.internal_ref?.startsWith('ML-') || sale.internal_ref?.startsWith('EXT-');
                                        return (
                                            <div key={sale.id} className="history-item">
                                                <div className="history-info">
                                                    <div className="history-header">
                                                        <span className="history-name">
                                                            {isExternal && <span className="external-tag">{sale.internal_ref.startsWith('ML-') ? 'ML' : 'EXT'}</span>}
                                                            {sale.customer_name}
                                                        </span>
                                                        <span className="history-amount">${parseFloat(sale.total).toLocaleString()}</span>
                                                    </div>
                                                    <div className="history-meta">
                                                        <span className="history-ref">#{sale.internal_ref}</span>
                                                        {isExternal ? (
                                                            <select
                                                                className="manual-status-selector-sm"
                                                                value={sale.delivery?.status || 'pending'}
                                                                onChange={(e) => handleManualStatus(sale.id, sale.delivery?.id, e.target.value)}
                                                            >
                                                                <option value="pending">⏱️ Pendiente</option>
                                                                <option value="assigned">👤 Asignado</option>
                                                                <option value="in_transit">🚚 En camino</option>
                                                                <option value="delivered">✅ Entregado</option>
                                                                <option value="failed">❌ Fallido</option>
                                                            </select>
                                                        ) : (
                                                            <span className={`status-badge ${sale.status}`}>
                                                                {sale.status === 'pending' && 'Pendiente'}
                                                                {sale.status === 'confirmed' && 'Confirmada'}
                                                                {sale.status === 'completed' && 'Completada'}
                                                                {sale.status === 'in_transit' && 'En Tránsito'}
                                                                {sale.status === 'delivered' && 'Entregado'}
                                                                {sale.status === 'cancelled' && 'Cancelada'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <ExternalSaleModal
                isOpen={isExternalModalOpen}
                onClose={() => setIsExternalModalOpen(false)}
                products={products}
                onSuccess={() => {
                    setIsExternalModalOpen(false);
                    showNotification('success', 'Venta externa registrada con éxito');
                    fetchData();
                }}
            />
        </div>
    );
}
