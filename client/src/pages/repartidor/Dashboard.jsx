import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Button from '../../components/atoms/Button';
import Modal from '../../components/molecules/Modal';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useWebSocket } from '../../context/WebSocketContext';
import './Dashboard.css';

export default function RepartidorDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [deliveries, setDeliveries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeDelivery, setActiveDelivery] = useState(null);
    
    // Photo upload state
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const { showNotification } = useNotification();

    // Fetch assigned deliveries
    const fetchDeliveries = async () => {
        try {
            setLoading(true);
            const response = await api.get('/deliveries');
            setDeliveries(response.data);

            // Auto-select active delivery if one is in transit
            const inTransit = response.data.find(d => d.status === 'in_transit');
            if (inTransit) setActiveDelivery(inTransit);
        } catch (error) {
            console.error("Error fetching deliveries:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDeliveries();
    }, []);

    const wsMessage = useWebSocket();
    useEffect(() => {
        if (wsMessage && wsMessage.event === 'DELIVERIES_UPDATED') {
            console.log('WebSocket update received for deliveries');
            // Silent refetch to avoid interrupting the user if they're looking at details
            // For a better UX, we could only fetch if no active delivery or just update the list
            fetchDeliveries();
        }
    }, [wsMessage]);

    const updateStatus = async (deliveryId, newStatus) => {
        try {
            const response = await api.patch(`/deliveries/${deliveryId}`, { status: newStatus });

            // Update local state
            setDeliveries(prev => prev.map(d => d.id === deliveryId ? response.data : d));

            if (newStatus === 'in_transit') {
                setActiveDelivery(response.data);
            } else if (newStatus === 'delivered') {
                setActiveDelivery(null);
                showNotification('success', '¡Entrega completada con éxito! 🎉');
            }
        } catch (error) {
            console.error("Error updating status:", error);
            showNotification('error', "No se pudo actualizar el estado.");
        }
    };

    useEffect(() => {
        // Cleanup preview URL on unmount
        return () => {
            if (photoPreview) URL.revokeObjectURL(photoPreview);
        };
    }, [photoPreview]);

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validation
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showNotification('error', 'Por favor selecciona una imagen válida (JPG, PNG).');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showNotification('error', 'La imagen es muy pesada. Máximo 5MB.');
            return;
        }

        setPhotoFile(file);
        
        // Free previous preview if exists
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        
        // Create new preview
        setPhotoPreview(URL.createObjectURL(file));
    };

    const handleClearPhoto = () => {
        setPhotoFile(null);
        if (photoPreview) URL.revokeObjectURL(photoPreview);
        setPhotoPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleConfirmDelivery = async () => {
        if (!activeDelivery) return;
        
        // If a photo was selected, upload it first
        if (photoFile) {
            setUploading(true);
            try {
                const formData = new FormData();
                formData.append('file', photoFile);
                
                // Ensure correct API base URL handling
                await api.post(`/deliveries/${activeDelivery.id}/upload-proof`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                showNotification('success', 'Evidencia subida correctamente.');
            } catch (error) {
                console.error("Error uploading photo:", error);
                setUploading(false);
                showNotification('error', 'No se pudo subir la foto, pero intentaremos marcarlo como entregado.');
                // We proceed anyway to not block the delivery
            }
        }
        
        // Mark as delivered
        await updateStatus(activeDelivery.id, 'delivered');
        
        // Cleanup modal state
        setIsUploadModalOpen(false);
        handleClearPhoto();
        setUploading(false);
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    if (loading) return <div className="loader-container"><div className="loader"></div></div>;

    const pendingDeliveries = deliveries.filter(d => d.status !== 'delivered');
    const pendingCount = pendingDeliveries.length;

    // Helper to ensure backend naive dates are treated as UTC
    const parseUTCDate = (dateStr) => {
        if (!dateStr) return new Date();
        const str = String(dateStr);
        if (!str.endsWith('Z') && !str.match(/[+-]\d{2}:\d{2}$/)) {
            return new Date(`${str}Z`);
        }
        return new Date(str);
    };

    return (
        <div className="repartidor-wrapper">
            {/* Header / Nav */}
            <div className="repartidor-topbar">
                <div className="topbar-logo">
                    <span className="logo-icon">📦</span> ZArtistica Delivery
                </div>
                <div className="topbar-actions">
                    <Link to="/" className="store-link" style={{ marginRight: '1rem', color: 'inherit', textDecoration: 'none', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }} title="Ir a la Tienda">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                        <span className="hide-on-mobile">Tienda</span>
                    </Link>
                    <div className="user-badge">
                        <div className="user-avatar">{user?.name?.charAt(0)?.toUpperCase() || 'U'}</div>
                    </div>
                    <button onClick={handleLogout} className="logout-button" title="Cerrar Sesión">
                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    </button>
                </div>
            </div>

            <main className="repartidor-main">
                <header className="page-header">
                    <h1>Hola, <span className="highlight-name">{user?.name?.split(' ')[0] || 'Repartidor'}</span></h1>
                    <p className="page-subtitle">
                        {pendingCount === 0 
                            ? "¡Todo al día! No tienes asignaciones nuevas." 
                            : `Tienes ${pendingCount} entrega${pendingCount === 1 ? '' : 's'} pendiente${pendingCount === 1 ? '' : 's'}.`}
                    </p>
                </header>

                <div className="dashboard-layout">
                    {/* Primary Column (Active Route) */}
                    <div className="primary-column">
                        <div className="section-title">
                            <h3>Ruta Actual</h3>
                        </div>
                        
                        {activeDelivery ? (
                            <div className="active-route-card">
                                <div className="route-status-bar">
                                    <div className="pulsing-indicator"></div>
                                    <span>EN TRÁNSITO</span>
                                </div>
                                
                                <div className="customer-block">
                                    <div className="customer-info">
                                        <h4>{activeDelivery.sale.customer_name}</h4>
                                        <div className="info-row">
                                            <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                                                <p style={{ margin: 0, wordBreak: 'break-word' }}>{activeDelivery.sale.customer_address}</p>
                                                <button 
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(activeDelivery.sale.customer_address);
                                                        showNotification('success', 'Dirección copiada al portapapeles');
                                                    }}
                                                    title="Copiar dirección"
                                                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', display: 'flex', transition: 'color 0.2s' }}
                                                    onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                                                    onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                                                >
                                                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                                </button>
                                            </div>
                                        </div>
                                        <div className="info-row">
                                            <svg className="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                            <a href={`tel:${activeDelivery.sale.customer_phone}`} className="phone-link">{activeDelivery.sale.customer_phone}</a>
                                        </div>

                                        {/* Navegación GPS */}
                                        <div className="navigation-actions">
                                            {activeDelivery.sale.delivery_lat && activeDelivery.sale.delivery_lng ? (
                                                <>
                                                    <a href={`https://waze.com/ul?ll=${activeDelivery.sale.delivery_lat},${activeDelivery.sale.delivery_lng}&navigate=yes`} target="_blank" rel="noopener noreferrer" className="btn-nav btn-waze">
                                                        🚙 Navegar con Waze
                                                    </a>
                                                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${activeDelivery.sale.delivery_lat},${activeDelivery.sale.delivery_lng}`} target="_blank" rel="noopener noreferrer" className="btn-nav btn-gmaps">
                                                        📍 Ir con Google Maps
                                                    </a>
                                                </>
                                            ) : (
                                                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeDelivery.sale.customer_address)}`} target="_blank" rel="noopener noreferrer" className="btn-nav btn-gmaps">
                                                    📍 Buscar en Google Maps
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="order-ref">
                                        <small>Ref.</small>
                                        <span>#{activeDelivery.sale.internal_ref}</span>
                                    </div>
                                </div>


                                <div className="action-panel">
                                    <Button
                                        variant="success"
                                        size="lg"
                                        className="btn-complete-delivery"
                                        onClick={() => setIsUploadModalOpen(true)}
                                    >
                                        Entregar Pedido
                                        <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="empty-state-card">
                                <div className="empty-icon">📍</div>
                                <h3>Sin ruta activa</h3>
                                <p>Selecciona una entrega pendiente de tu lista para comenzar a navegar.</p>
                            </div>
                        )}
                    </div>

                    {/* Secondary Column (Task List) */}
                    <div className="secondary-column">
                        <div className="section-title">
                            <h3>Por Entregar</h3>
                            <span className="count-badge">{pendingCount}</span>
                        </div>
                        
                        <div className="task-list">
                            {pendingDeliveries.length === 0 ? (
                                <div className="no-tasks">
                                    <p>No tienes entregas en cola.</p>
                                </div>
                            ) : (
                                pendingDeliveries
                                    .map(delivery => (
                                        <div key={delivery.id} className={`task-card ${delivery.status === 'in_transit' ? 'is-active' : ''}`}>
                                            <div className="task-indicator"></div>
                                            <div className="task-body">
                                                <div className="task-header">
                                                    <h5>{delivery.sale.customer_name}</h5>
                                                    <span className="task-ref">#{delivery.sale.internal_ref}</span>
                                                </div>
                                                <p className="task-address">{delivery.sale.customer_address}</p>
                                            </div>
                                            <div className="task-action">
                                                {delivery.status !== 'in_transit' && (
                                                    <button 
                                                        className="btn-start-route" 
                                                        onClick={() => updateStatus(delivery.id, 'in_transit')}
                                                        disabled={activeDelivery !== null}
                                                        title={activeDelivery ? "Termina tu ruta actual primero" : "Iniciar entrega"}
                                                    >
                                                        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                    </button>
                                                )}
                                                {delivery.status === 'in_transit' && (
                                                    <span className="badge-driving">Navegando</span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>

                        {/* Recent History */}
                        {(() => {
                            const todayStr = new Date().toLocaleDateString('es-CL', { timeZone: 'America/Santiago' });
                            const todayDeliveries = deliveries.filter(d => {
                                if (d.status !== 'delivered' || !d.completed_at) return false;
                                const completedStr = parseUTCDate(d.completed_at).toLocaleDateString('es-CL', { timeZone: 'America/Santiago' });
                                return completedStr === todayStr;
                            });
                            
                            if (todayDeliveries.length === 0) return null;

                            return (
                                <div className="history-section">
                                    <div className="section-title mt-4">
                                        <h3>Completados Hoy <span style={{ background: '#3b82f6', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', marginLeft: '0.5rem' }}>{todayDeliveries.length}</span></h3>
                                    </div>
                                    <div className="history-list">
                                        {todayDeliveries.slice(0, 5).map(delivery => (
                                        <div key={delivery.id} className="history-item">
                                            <span className="history-icon">✅</span>
                                            <div className="history-info">
                                                <span className="history-name">{delivery.sale.customer_name}</span>
                                                <span className="history-ref">#{delivery.sale.internal_ref}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.2rem' }}>
                                                {delivery.updated_at && (
                                                    <span className="history-time" style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                        Inicio: {parseUTCDate(delivery.assigned_at || delivery.created_at).toLocaleTimeString('es-CL', { 
                                                            hour: '2-digit', 
                                                            minute: '2-digit',
                                                            timeZone: 'America/Santiago'
                                                        })}
                                                    </span>
                                                )}
                                                {delivery.completed_at && (
                                                    <span className="history-time" style={{ fontWeight: '600', color: '#10b981' }}>
                                                        Término: {parseUTCDate(delivery.completed_at).toLocaleTimeString('es-CL', { 
                                                            hour: '2-digit', 
                                                            minute: '2-digit',
                                                            timeZone: 'America/Santiago'
                                                        })}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            </main>

            {/* Photo Upload Confirmation Modal */}
            <Modal
                isOpen={isUploadModalOpen}
                onClose={() => {
                    setIsUploadModalOpen(false);
                    handleClearPhoto();
                }}
                title="Confirmar Entrega"
                footer={
                    <div className="upload-modal-footer">
                        <Button 
                            variant="secondary" 
                            onClick={() => {
                                setIsUploadModalOpen(false);
                                handleClearPhoto();
                            }}
                            disabled={uploading}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            variant="success" 
                            onClick={handleConfirmDelivery}
                            disabled={uploading}
                            className="btn-confirm-final"
                        >
                            {uploading ? (
                                <span className="uploading-text"><span className="spinner-small"></span> Finalizando...</span>
                            ) : (
                                "Sí, Entregado"
                            )}
                        </Button>
                    </div>
                }
            >
                <div className="upload-modal-content">
                    <p className="upload-instruction">¿Deseas adjuntar una foto como comprobante de entrega?</p>
                    
                    {!photoPreview ? (
                        <div 
                            className="upload-dropzone"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <svg className="upload-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            <span>Tomar foto o seleccionar archivo</span>
                            <small>(Opcional)</small>
                        </div>
                    ) : (
                        <div className="photo-preview-container">
                            <img src={photoPreview} alt="Preview" className="photo-preview-img" />
                            <button className="btn-remove-photo" onClick={handleClearPhoto} title="Quitar foto">
                                &times;
                            </button>
                        </div>
                    )}
                    
                    <input 
                        type="file" 
                        accept="image/jpeg, image/png, image/jpg, image/webp"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                        capture="environment" /* Suggests mobile camera directly */
                    />
                </div>
            </Modal>
        </div>
    );
}
