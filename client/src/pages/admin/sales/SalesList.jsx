import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Button from '../../../components/atoms/Button';
import TableFilter from '../../../components/templates/TableFilter';
import DataTable from '../../../components/organisms/DataTable';
import { useNotification } from '../../../context/NotificationContext';
import { useAuth } from '../../../context/AuthContext';
import { useWebSocket } from '../../../context/WebSocketContext';
import api from '../../../services/api';

import HelpModal from '../../../components/molecules/HelpModal';
import ExternalSaleModal from './ExternalSaleModal';
import './SalesList.css';

const saleStatusLabels = {
    'pending': 'Pendiente',
    'confirmed': 'Confirmada',
    'shipped': 'Enviada',
    'completed': 'Completada',
    'cancelled': 'Cancelada'
};

const deliveryStatusConfig = {
    'pending': { label: '⏱️ Pendiente', color: '#ff9800', description: "Ningún repartidor ha comenzado la entrega." },
    'assigned': { label: '👤 Asignado', color: '#2196f3', description: "Repartidor asignado, preparándose para salir." },
    'in_transit': { label: '🚚 En camino', color: '#9c27b0', description: "El producto está siendo transportado ahora mismo.", trackable: true },
    'delivered': { label: '✅ Entregado', color: '#4caf50', description: "El cliente recibió exitosamente el producto." },
    'failed': { label: '❌ Fallo', color: '#f44336', description: "Hubo un problema con la entrega." }
};

const sortSalesPriority = (salesArray) => {
    return [...salesArray].sort((a, b) => {
        const parseDate = (d) => new Date(d + (d?.endsWith('Z') ? '' : 'Z'));
        return parseDate(b.created_at || 0) - parseDate(a.created_at || 0);
    });
};

export default function SalesList() {
    const [sales, setSales] = useState([]);
    const [filteredSales, setFilteredSales] = useState([]);
    const [products, setProducts] = useState([]);
    const [couriers, setCouriers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [assigningId, setAssigningId] = useState(null);
    const [pendingAssignmentId, setPendingAssignmentId] = useState(null); // For HelpModal interception
    const [selectedCourier, setSelectedCourier] = useState('');

    const [selectedSaleDetails, setSelectedSaleDetails] = useState(null);
    const [evidenceImageModal, setEvidenceImageModal] = useState(null);
    const [isProductListModalOpen, setIsProductListModalOpen] = useState(false);
    const [isExternalModalOpen, setIsExternalModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const { showNotification } = useNotification();
    const { user } = useAuth();
    const wsMessage = useWebSocket();
    const location = useLocation();

    const fetchData = async () => {
        try {
            // Fetch Sales and Deliveries
            const [salesRes, deliveriesRes] = await Promise.all([
                api.get('/sales'),
                api.get('/deliveries')
            ]);

            const salesData = salesRes.data;
            const deliveriesData = deliveriesRes.data;

            // Map deliveries to sales
            const salesWithDelivery = salesData.map(sale => {
                const delivery = deliveriesData.find(d => d.sale_id === sale.id);
                return { ...sale, delivery };
            });

            const sortedSales = sortSalesPriority(salesWithDelivery);
            setSales(sortedSales);
            setFilteredSales(sortedSales);

            // Fetch Couriers and Products
            const [couriersRes, productsRes] = await Promise.all([
                api.get('/users?role=Repartidor'),
                api.get('/products')
            ]);
            setCouriers(couriersRes.data);
            setProducts(productsRes.data);

        } catch (error) {
            console.error("Error data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Listen to WebSocket events
    useEffect(() => {
        if (wsMessage && (wsMessage.event === 'SALES_UPDATED' || wsMessage.event === 'DELIVERIES_UPDATED')) {
            console.log('WebSocket update received for sales/deliveries:', wsMessage);
            fetchData();
        }
    }, [wsMessage]);

    // Effect to handle direct links to a specific sale (e.g., from Dashboard)
    useEffect(() => {
        if (!loading && filteredSales.length > 0) {
            const params = new URLSearchParams(location.search);
            const targetId = params.get('id');

            if (targetId) {
                const saleIndex = filteredSales.findIndex(s => s.id === targetId);
                if (saleIndex !== -1) {
                    const targetSale = filteredSales[saleIndex];
                    setSelectedSaleDetails(targetSale);

                    // Calculate page (1-indexed)
                    const pageSize = 10;
                    const targetPage = Math.floor(saleIndex / pageSize) + 1;
                    setCurrentPage(targetPage);
                }
            }
        }
    }, [loading, filteredSales, location.search]);

    const handleAssignClick = (saleId) => {
        const hideWarning = localStorage.getItem('hide_assign_courier_warning') === 'true';
        if (hideWarning) {
            setAssigningId(saleId);
        } else {
            setPendingAssignmentId(saleId);
        }
    };

    const handleConfirmWarning = () => {
        setAssigningId(pendingAssignmentId);
        setPendingAssignmentId(null);
    };

    const handleCancelWarning = () => {
        setPendingAssignmentId(null);
    };

    const handleAssign = async (saleId) => {
        if (!selectedCourier) {
            showNotification('warning', "Selecciona un repartidor");
            return;
        }

        try {
            await api.post('/deliveries', {
                sale_id: saleId,
                courier_id: selectedCourier,
                status: 'assigned'
            });

            showNotification('success', "Repartidor asignado correctamente");
            setAssigningId(null);
            setSelectedCourier('');
            fetchData(); // Refresh
        } catch (error) {
            console.error(error);
            showNotification('error', error.response?.data?.detail || "Error al asignar repartidor");
        }
    };

    const handleManualStatus = async (saleId, deliveryId, newStatus) => {
        try {
            if (!deliveryId) {
                // Create manual delivery if it doesn't exist
                await api.post('/deliveries', {
                    sale_id: saleId,
                    courier_id: null, // Null for manual control
                    status: newStatus
                });
            } else {
                // Update existing delivery
                await api.patch(`/deliveries/${deliveryId}`, {
                    status: newStatus
                });
            }
            showNotification('success', `Estado actualizado a ${deliveryStatusConfig[newStatus]?.label || newStatus}`);
            fetchData();
        } catch (error) {
            console.error(error);
            showNotification('error', "Error al actualizar estado manual");
        }
    };

    if (loading) return <div>Cargando ventas...</div>;

    const canManageSales = ['Admin', 'Vendedor'].includes(user?.role?.name);

    return (
        <div className="admin-page">
            <div
                className="page-header"
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '3rem',
                    marginBottom: '2rem',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem'
                }}
            >
                <h2>Gestión de Ventas y Despachos</h2>
                {canManageSales && (
                    <Button variant="primary" onClick={() => setIsExternalModalOpen(true)}>
                        + Agregar Venta Externa
                    </Button>
                )}
            </div>

            {/* Table Filter */}
            <TableFilter
                searchPlaceholder="Buscar por cliente, dirección o REF..."
                searchFields={['customer_name', 'customer_address', 'internal_ref']}
                quickFilters={[
                    { key: 'all', label: 'Todas' },
                    { key: 'pending', label: 'Pendientes', filter: (sale) => (!sale.delivery || sale.delivery.status === 'pending') && sale.status !== 'completed' && sale.status !== 'cancelled' },
                    { key: 'assigned', label: 'Asignados', filter: (sale) => sale.delivery?.status === 'assigned' },
                    { key: 'in_transit', label: 'En Camino', filter: (sale) => sale.delivery?.status === 'in_transit' },
                    { key: 'completed', label: 'Entregadas', filterKey: 'status', filterValue: 'completed' },
                    { key: 'web', label: 'Web', filter: (sale) => sale.internal_ref?.startsWith('WEB-') },
                    { key: 'ml', label: 'Mercado Libre', filter: (sale) => sale.internal_ref?.startsWith('ML-') },
                    { key: 'ext', label: 'Fuera de Web', filter: (sale) => sale.internal_ref?.startsWith('EXT-') }
                ]}
                data={sales}
                onFilterChange={setFilteredSales}
            />

            <div style={{ marginTop: '2rem' }}>
                <DataTable
                    page={currentPage}
                    onPageChange={setCurrentPage}
                    columns={[
                        { accessor: 'ref', header: 'REF' },
                        { accessor: 'cliente', header: 'Cliente' },
                        { accessor: 'total', header: 'Total' },
                        { accessor: 'estadoVenta', header: 'Estado Venta' },
                        { accessor: 'repartidor', header: 'Repartidor' },
                        { accessor: 'estadoEntrega', header: 'Estado Entrega' },
                        { accessor: 'acciones', header: 'Acción' }
                    ]}
                    data={filteredSales.map(sale => {
                        const getCourierName = () => {
                            if (!sale.delivery?.courier_id) return null;
                            const courier = couriers.find(c => c.id === sale.delivery.courier_id);
                            return courier?.full_name || 'Repartidor no encontrado';
                        };

                        const courierName = getCourierName();
                        const deliveryStatus = sale.delivery?.status;
                        const deliveryConfig = deliveryStatus ? deliveryStatusConfig[deliveryStatus] : null;

                        return {
                            id: sale.id,
                            ref: <strong>{sale.internal_ref || sale.id.slice(0, 8).toUpperCase()}</strong>,
                            cliente: (
                                <div>
                                    <div><strong>{sale.customer_name}</strong></div>
                                    <small style={{ color: '#888' }}>{sale.customer_address}</small>
                                </div>
                            ),
                            total: <strong>${Number(sale.total).toLocaleString('es-CL')}</strong>,
                            estadoVenta: (
                                <span className={`status - badge status - ${sale.status} `}>
                                    {saleStatusLabels[sale.status] || sale.status}
                                </span>
                            ),
                            repartidor: (sale.internal_ref?.startsWith('ML-') || sale.internal_ref?.startsWith('EXT-')) ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '1.1rem' }}>📦</span>
                                    <span style={{ fontWeight: '600', color: '#f59e0b' }}>
                                        {sale.internal_ref.startsWith('ML-') ? 'Mercado Envío' : 'Externo'}
                                    </span>
                                </div>
                            ) : courierName ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span>👤</span>
                                    <span style={{ fontWeight: '500' }}>{courierName}</span>
                                </div>
                            ) : (
                                <span style={{ color: '#999', fontStyle: 'italic' }}>Sin asignar</span>
                            ),
                            estadoEntrega: (sale.internal_ref?.startsWith('ML-') || sale.internal_ref?.startsWith('EXT-')) ? (
                                <select
                                    value={deliveryStatus || 'pending'}
                                    onChange={(e) => handleManualStatus(sale.id, sale.delivery?.id, e.target.value)}
                                    className="manual-status-selector"
                                    style={{
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '4px',
                                        fontSize: '0.85rem',
                                        border: '1px solid #ddd',
                                        backgroundColor: deliveryConfig?.color ? `${deliveryConfig.color}15` : '#fff',
                                        color: deliveryConfig?.color || '#333',
                                        fontWeight: '500'
                                    }}
                                >
                                    <option value="pending">⏱️ Pendiente</option>
                                    <option value="assigned">👤 Asignado</option>
                                    <option value="in_transit">🚚 En camino</option>
                                    <option value="delivered">✅ Entregado</option>
                                    <option value="failed">❌ Fallido</option>
                                </select>
                            ) : deliveryConfig ? (
                                <span
                                    className={deliveryConfig.trackable ? "clickable-status" : ""}
                                    onClick={() => {
                                        if (deliveryConfig.trackable && sale.delivery_lat && sale.delivery_lng) {
                                            window.open(`https://www.google.com/maps/search/?api=1&query=${sale.delivery_lat},${sale.delivery_lng}`, '_blank');
                                        } else if (deliveryConfig.trackable && sale.customer_address) {
                                            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(sale.customer_address)}`, '_blank');
                                        } else {
                                            showNotification('info', deliveryConfig.description);
                                        }
                                    }}
                                    style={{
                                        display: 'inline-block',
                                        padding: '0.25rem 0.75rem',
                                        background: `${deliveryConfig.color}15`,
                                        color: deliveryConfig.color,
                                        borderRadius: '4px',
                                        fontSize: '0.85rem',
                                        fontWeight: '500'
                                    }} title={deliveryConfig.description}>
                                    {deliveryConfig.label}
                                </span>
                            ) : (
                                <span style={{ color: '#999' }}>—</span>
                            ),
                            acciones: (
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {!sale.delivery ? (
                                        (sale.internal_ref?.startsWith('ML-') || sale.internal_ref?.startsWith('EXT-')) ? (
                                            <span style={{ color: '#10b981', fontStyle: 'italic', fontWeight: '500', marginRight: '0.5rem' }}>
                                                ✨ {sale.internal_ref.startsWith('ML-') ? 'MercadoEnvíos' : 'Externo'}
                                            </span>
                                        ) : assigningId === sale.id ? (
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <select
                                                    value={selectedCourier}
                                                    onChange={e => setSelectedCourier(e.target.value)}
                                                    style={{
                                                        padding: '0.4rem',
                                                        borderRadius: '4px',
                                                        border: '1px solid #ddd',
                                                        fontSize: '0.9rem'
                                                    }}
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {couriers.map(c => (
                                                        <option key={c.id} value={c.id}>{c.full_name}</option>
                                                    ))}
                                                </select>
                                                <Button size="sm" onClick={() => handleAssign(sale.id)}>✓</Button>
                                                <Button size="sm" variant="secondary" onClick={() => setAssigningId(null)}>✕</Button>
                                            </div>
                                        ) : (
                                            <Button size="sm" onClick={() => handleAssignClick(sale.id)}>
                                                Asignar Repartidor
                                            </Button>
                                        )
                                    ) : null}
                                    {/* <Button size="sm" variant="secondary" onClick={() => setSelectedSaleDetails(sale)}>
                                        👁️ Detalles
                                    </Button> */}
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <button className="btn-action btn-edit" onClick={() => setSelectedSaleDetails(sale)}>
                                            Detalles
                                        </button>
                                        {/* {canDeleteProducts && product.is_active !== false && (
                                            <button className="btn-action btn-delete" onClick={() => handleDelete(product.id)}>
                                                Eliminar
                                            </button>
                                        )}
                                        {product.is_active === false && (
                                            <span style={{ fontSize: '0.75rem', color: '#c62828', fontWeight: 'bold' }}>
                                                ELIMINADO
                                            </span>
                                        )} */}
                                    </div>
                                </div>
                            )
                        };
                    })}
                />
            </div>


            <HelpModal
                isOpen={!!pendingAssignmentId}
                title="Atención: Asignar Repartidor"
                type="warning"
                storageKey="hide_assign_courier_warning"
                message="Al asignar un repartidor, se asume que la compra ha sido comprobada vía WhatsApp de manera manual (recibiendo el comprobante de transferencia y revisando que el abono esté reflejado en tu cuenta bancaria). ¿Deseas continuar?"
                onConfirm={handleConfirmWarning}
                onCancel={handleCancelWarning}
                confirmText="Sí, continuar"
            />

            {/* Modal Panel for Sale Details */}
            {selectedSaleDetails && (
                <div className="modal-overlay" onClick={() => setSelectedSaleDetails(null)}>
                    <div className="modal-content-column" onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                            <div>
                                <h2>Detalles de Venta</h2>
                                <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                                    REF: {selectedSaleDetails.internal_ref} • {new Date(selectedSaleDetails.created_at + (selectedSaleDetails.created_at?.endsWith('Z') ? '' : 'Z')).toLocaleString('es-CL')}
                                </p>
                            </div>
                            <button className="btn-close" onClick={() => setSelectedSaleDetails(null)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
                            <div className="sale-details-responsive-grid">
                                <div className="sale-details-info-card">
                                    <h3 className="sale-details-card-title">Información del Cliente</h3>
                                    <p style={{ margin: '0 0 0.4rem 0' }}><strong>Nombre:</strong> {selectedSaleDetails.customer_name}</p>
                                    <p style={{ margin: '0 0 0.4rem 0' }}><strong>Teléfono:</strong> {selectedSaleDetails.customer_phone || 'No especificado'}</p>
                                    <p style={{ margin: '0 0 0.4rem 0' }}>
                                        <strong>Dirección:</strong> {selectedSaleDetails.customer_address}
                                        {selectedSaleDetails.delivery_lat && selectedSaleDetails.delivery_lng && (
                                            <a 
                                                href={`https://www.google.com/maps/search/?api=1&query=${selectedSaleDetails.delivery_lat},${selectedSaleDetails.delivery_lng}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                style={{ marginLeft: '0.5rem', fontSize: '0.85rem', color: '#3b82f6', textDecoration: 'none', fontWeight: '500' }}
                                                title="Ver ubicación exacta marcada por el cliente"
                                            >
                                                🗺️ (Ver en mapa)
                                            </a>
                                        )}
                                    </p>
                                    {selectedSaleDetails.notes && (
                                        <p style={{ margin: '0', fontStyle: 'italic', color: '#64748b' }}>"{selectedSaleDetails.notes}"</p>
                                    )}
                                </div>
                                <div className="sale-details-info-card">
                                    <h3 className="sale-details-card-title">Resumen de la Transacción</h3>
                                    <p style={{ margin: '0 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <strong>Estado Venta:</strong>
                                        <span className={`status-badge status-${selectedSaleDetails.status}`} style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem' }}>
                                            {saleStatusLabels[selectedSaleDetails.status] || selectedSaleDetails.status}
                                        </span>
                                    </p>
                                    <p style={{ margin: '0 0 0.8rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <strong>Despacho:</strong>
                                        {selectedSaleDetails.delivery && deliveryStatusConfig[selectedSaleDetails.delivery.status] ? (
                                            <span style={{
                                                display: 'inline-block',
                                                padding: '0.2rem 0.6rem',
                                                background: `${deliveryStatusConfig[selectedSaleDetails.delivery.status].color}15`,
                                                color: deliveryStatusConfig[selectedSaleDetails.delivery.status].color,
                                                borderRadius: '4px',
                                                fontSize: '0.8rem',
                                                fontWeight: '500'
                                            }}>
                                                {deliveryStatusConfig[selectedSaleDetails.delivery.status].label}
                                            </span>
                                        ) : (selectedSaleDetails.internal_ref?.startsWith('ML-') || selectedSaleDetails.internal_ref?.startsWith('EXT-')) ? (
                                            <span style={{ color: '#10b981', fontStyle: 'italic', fontWeight: '500' }}>
                                                ✨ {selectedSaleDetails.internal_ref.startsWith('ML-') ? 'MercadoEnvíos' : 'Externo'}
                                            </span>
                                        ) : (
                                            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>No asignado</span>
                                        )}
                                    </p>
                                    
                                    {selectedSaleDetails.delivery?.events?.some(e => e.photo_url) && (
                                        <div style={{ marginBottom: '1rem' }}>
                                            <button 
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setEvidenceImageModal(`${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '')}${selectedSaleDetails.delivery.events.find(e => e.photo_url).photo_url}`);
                                                }}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem',
                                                    fontSize: '0.85rem',
                                                    color: '#3b82f6',
                                                    textDecoration: 'none',
                                                    fontWeight: '500',
                                                    padding: '0.4rem 0.8rem',
                                                    backgroundColor: '#eff6ff',
                                                    borderRadius: '6px',
                                                    border: '1px solid #bfdbfe',
                                                    transition: 'all 0.2s ease',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                📸 Ver evidencia del repartidor
                                            </button>
                                        </div>
                                    )}

                                    <div style={{ margin: '0.5rem 0 0.8rem 0', padding: '0.8rem', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', color: '#64748b' }}>
                                            <span>Subtotal Productos:</span>
                                            <span>${Number(selectedSaleDetails.total - (selectedSaleDetails.delivery_cost || 0)).toLocaleString('es-CL')}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                                            <span>Costo de Envío:</span>
                                            {selectedSaleDetails.delivery_cost === 0 ? (
                                                <span style={{ color: '#10b981', fontWeight: 'bold' }}>¡Gratis!</span>
                                            ) : (
                                                <span>${Number(selectedSaleDetails.delivery_cost || 0).toLocaleString('es-CL')}</span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem' }}>
                                            <strong>Total a Pagar:</strong>
                                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>${Number(selectedSaleDetails.total).toLocaleString('es-CL')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <h3 style={{ fontSize: '1.1rem', color: '#1e293b', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>Productos Comprados</h3>
                            <div className="sale-products-summary-container">
                                <div>
                                    <p className="sale-products-summary-total">
                                        {selectedSaleDetails.items?.reduce((acc, item) => acc + item.quantity, 0) || 0} artículos en total
                                    </p>
                                    <p className="sale-products-summary-unique">
                                        {selectedSaleDetails.items?.length || 0} diferentes tipos de productos
                                    </p>
                                </div>
                                <Button variant="primary" className="btn-full-width" onClick={() => setIsProductListModalOpen(true)}>
                                    Ver Listado Completo
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sub-Modal Panel for Full Product List */}
            {isProductListModalOpen && selectedSaleDetails && (
                <div className="modal-overlay" onClick={() => setIsProductListModalOpen(false)} style={{ zIndex: 10001 }}>
                    <div className="modal-content-column" style={{ maxWidth: '600px', margin: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                            <div>
                                <h2>Listado de Productos</h2>
                                <p style={{ margin: '0.2rem 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>
                                    REF: {selectedSaleDetails.internal_ref}
                                </p>
                            </div>
                            <button className="btn-close" onClick={() => setIsProductListModalOpen(false)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
                            <div className="sale-products-list">
                                {selectedSaleDetails.items?.length > 0 ? (
                                    selectedSaleDetails.items.map((item, index) => {
                                        const productInfo = products.find(p => p.id === item.product_id);
                                        const productName = productInfo ? productInfo.name : `Producto ID: ${item.product_id?.slice(0, 8)}...`;
                                        const productImagePath = productInfo && productInfo.images && productInfo.images.length > 0
                                            ? productInfo.images[0]
                                            : null;

                                        const productImage = productImagePath
                                            ? `${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '')}/static/${productImagePath}`
                                            : null;

                                        return (
                                            <div key={index} className="sale-product-item">
                                                <div className="sale-product-image-container">
                                                    {productImage ? (
                                                        <img src={productImage} alt={productName} className="sale-product-image" />
                                                    ) : (
                                                        <div className="sale-product-image-placeholder">🎨</div>
                                                    )}
                                                    <span className="sale-product-quantity-badge">{item.quantity}</span>
                                                </div>
                                                <div className="sale-product-details">
                                                    <p className="sale-product-name">{productName}</p>
                                                    <p className="sale-product-price-unit">${Number(item.unit_price).toLocaleString('es-CL')} c/u</p>
                                                </div>
                                                <div className="sale-product-subtotal">
                                                    ${Number(item.subtotal).toLocaleString('es-CL')}
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <p style={{ color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '1rem' }}>No hay detalles de productos disponibles.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
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

            {/* Evidence Image Modal */}
            {evidenceImageModal && (
                <div className="modal-overlay" onClick={() => setEvidenceImageModal(null)} style={{ zIndex: 10002 }}>
                    <div className="modal-content-column" style={{ maxWidth: '800px', margin: 'auto', background: 'transparent', boxShadow: 'none', padding: 0 }} onClick={e => e.stopPropagation()}>
                        <div style={{ position: 'relative' }}>
                            <button 
                                className="btn-close" 
                                onClick={() => setEvidenceImageModal(null)} 
                                style={{ position: 'absolute', right: '0%', background: 'white', borderBottomLeftRadius: '50%', padding: '5px', zIndex: 10003, boxShadow: '0 2px 10px rgba(0,0,0,0.2)' }}
                            >
                                ✕
                            </button>
                            <img src={evidenceImageModal} alt="Evidencia de entrega" style={{ width: '100%', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px', backgroundColor: 'rgba(0,0,0,0.5)' }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
