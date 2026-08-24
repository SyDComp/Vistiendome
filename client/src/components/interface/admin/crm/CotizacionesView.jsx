import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SectionHeader from '../../../ui/admin/SectionHeader';
import DataTable from '../../../ui/admin/DataTable';
import FilterBar from '../../../ui/admin/FilterBar';
import RowActions from '../../../ui/admin/RowActions';
import DetailDrawer from '../../../ui/admin/DetailDrawer';
import { useNotification } from '../../../../context/NotificationContext';
import { useSettings } from '../../../../context/SettingsContext';
import { getShippingColor } from '../../../../utils/shippingColors';
import { FileText, Calendar, MessageCircle, MapPin, Info, Printer, Plus } from 'lucide-react';
import AdminCotizacionModal from './AdminCotizacionModal';

const StateSelector = ({ cotizacion, onUpdate }) => {
    const { toast } = useNotification();
    const [loading, setLoading] = useState(false);

    const states = [
        { value: 'NUEVA', label: 'NUEVA', color: '#10b981', bg: '#ecfdf5' },
        { value: 'EN_PROCESO', label: 'EN PROCESO', color: '#f59e0b', bg: '#fef3c7' },
        { value: 'CERRADA_EXITO', label: 'ÉXITO', color: '#3b82f6', bg: '#eff6ff' },
        { value: 'CERRADA_PERDIDA', label: 'PERDIDA', color: '#ef4444', bg: '#fef2f2' }
    ];

    const currentStyle = states.find(s => s.value === cotizacion.estado) || states[0];

    const handleChange = async (e) => {
        const newState = e.target.value;
        setLoading(true);
        try {
            const response = await fetch(`/api/v1/crm/cotizaciones/${cotizacion.id}/estado`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ estado: newState })
            });
            if (response.ok) {
                const updated = await response.json();
                onUpdate(updated);
                toast.success('Estado actualizado exitosamente');
            } else {
                toast.error("Error al actualizar estado");
            }
        } catch(err) {
            toast.error("Error de red");
        } finally {
            setLoading(false);
        }
    };

    return (
        <select 
            value={cotizacion.estado}
            onChange={handleChange}
            disabled={loading}
            style={{
                padding: '4px 10px',
                borderRadius: '6px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
                backgroundColor: currentStyle.bg,
                color: currentStyle.color,
                border: '1px solid transparent',
                cursor: 'pointer',
                outline: 'none',
                opacity: loading ? 0.5 : 1
            }}
        >
            {states.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
    );
};

const CotizacionesView = () => {
    const { settings } = useSettings();
    const shippingColors = settings?.shipping_colors || {};
    const navigate = useNavigate();
    const { toast, confirm } = useNotification();
    const [cotizaciones, setCotizaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilters, setActiveFilters] = useState({});
    const [showDetail, setShowDetail] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [showLegend, setShowLegend] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        const fetchCotizaciones = async () => {
            setLoading(true);
            try {
                const response = await fetch('/api/v1/crm/');
                if (response.ok) {
                    const data = await response.json();
                    setCotizaciones(data);
                }
            } catch (error) {
                console.error("Error fetching cotizaciones:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchCotizaciones();
    }, []);

    const filteredCotizaciones = cotizaciones.filter(coti => {
        const term = searchTerm.toLowerCase();
        return (
            (coti.id?.toLowerCase() || '').includes(term) ||
            (coti.origen?.toLowerCase() || '').includes(term) ||
            (coti.estado?.toLowerCase() || '').includes(term)
        );
    });

    const columns = [
        { 
            key: 'id', 
            label: 'ID',
            render: (value) => <span className="font-mono text-xs text-slate-500 uppercase">{value?.substring(0, 8)}</span>
        },
        { 
            key: 'fecha', 
            label: 'Fecha',
            render: (_, row) => (
                <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
                    {new Date(row.created_at).toLocaleDateString()}
                </span>
            )
        },
        {
            key: 'origen',
            label: 'Origen',
            render: (value) => (
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#64748b', letterSpacing: '0.5px' }}>
                    {value}
                </span>
            )
        },
        {
            key: 'estado',
            label: 'Estado',
            render: (value, row) => (
                <StateSelector 
                    cotizacion={row} 
                    onUpdate={(updatedCotizacion) => {
                        setCotizaciones(prev => prev.map(c => c.id === updatedCotizacion.id ? updatedCotizacion : c));
                        if (detailData?.id === updatedCotizacion.id) setDetailData(updatedCotizacion);
                    }} 
                />
            )
        },
        {
            key: 'detalles',
            label: 'Detalles Solicitud',
            render: (_, row) => {
                const transColor = getShippingColor(row.transporte || 'STARKEN', shippingColors);
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '13px' }}>
                            <MapPin size={14} /> 
                            <span>{row.comuna}, {row.region}</span>
                        </div>
                        {row.transporte && (
                            <span style={{ fontSize: '10px', fontWeight: '800', color: transColor, background: `${transColor}15`, border: `1px solid ${transColor}40`, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                                🚚 {row.transporte}
                            </span>
                        )}
                    </div>
                );
            }
        }
    ];

    return (
        <div className="admin-module fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
                <SectionHeader 
                    title="Cotizaciones Recibidas" 
                    subtitle={`${cotizaciones.length} solicitudes de cotización`}
                    icon={FileText}
                />
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', width: '100%', justifyContent: 'flex-start' }}>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        style={{
                            background: 'linear-gradient(135deg, #8f0653 0%, #d946ef 100%)',
                            border: 'none',
                            borderRadius: '10px',
                            padding: '10px 18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: '#ffffff',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '800',
                            boxShadow: '0 4px 12px rgba(143, 6, 83, 0.25)',
                            flex: '1 1 200px'
                        }}
                    >
                        <Plus size={18} strokeWidth={3} /> + Nueva Cotización Manual
                    </button>
                    <button
                        onClick={() => navigate('/admin/dashboard/crm/shipping-labels')}
                        style={{
                            background: '#fdf2f8',
                            border: '1px solid #fbcfe8',
                            borderRadius: '10px',
                            padding: '10px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: '#8f0653',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '800',
                            boxShadow: '0 2px 6px rgba(143, 6, 83, 0.1)',
                            flex: '1 1 240px'
                        }}
                    >
                        <Printer size={16} /> 📦 Etiquetas de Envío (Ahorro Papel y Tinta)
                    </button>
                    <button 
                        onClick={() => setShowLegend(!showLegend)}
                        style={{ 
                            background: showLegend ? '#f1f5f9' : 'transparent', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '10px', 
                            padding: '10px 14px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: '8px', 
                            color: '#475569', 
                            cursor: 'pointer', 
                            fontSize: '13px', 
                            fontWeight: '600',
                            flex: '1 1 200px'
                        }}
                    >
                        <Info size={15} /> {showLegend ? 'Ocultar Glosario' : '¿Qué significan los estados?'}
                    </button>
                </div>
            </div>

            {showLegend && (
                <div style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px 20px',
                    marginBottom: '20px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '20px',
                    fontSize: '12px',
                    animation: 'fadeIn 0.2s ease-in-out'
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', flexShrink: 0, marginTop: '4px' }}></span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: '700', color: '#1e293b', letterSpacing: '0.5px' }}>NUEVA</span>
                            <span style={{ color: '#64748b', lineHeight: '1.4' }}>Recién recibida, pendiente de revisión.</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b', flexShrink: 0, marginTop: '4px' }}></span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: '700', color: '#1e293b', letterSpacing: '0.5px' }}>EN PROCESO</span>
                            <span style={{ color: '#64748b', lineHeight: '1.4' }}>Contactando al cliente o armando pedido.</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#3b82f6', flexShrink: 0, marginTop: '4px' }}></span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: '700', color: '#1e293b', letterSpacing: '0.5px' }}>ÉXITO</span>
                            <span style={{ color: '#64748b', lineHeight: '1.4' }}>El cliente aceptó la cotización.</span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0, marginTop: '4px' }}></span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: '700', color: '#1e293b', letterSpacing: '0.5px' }}>PERDIDA</span>
                            <span style={{ color: '#64748b', lineHeight: '1.4' }}>Cliente rechazó o no contestó.</span>
                        </div>
                    </div>
                </div>
            )}
            
            <FilterBar 
                onSearch={setSearchTerm} 
                placeholder="Buscar por ID, origen o estado..."
            />

            <DataTable 
                columns={columns}
                data={filteredCotizaciones}
                loading={loading}
                emptyMessage="No se encontraron cotizaciones"
                rowActions={(row) => (
                    <RowActions
                        onView={() => { setDetailData(row); setShowDetail(true); }}
                        onDelete={async () => {
                            // confirm() toma un texto y devuelve la respuesta;
                            // con un objeto la pantalla quedaba en blanco.
                            if (!await confirm(`¿Seguro que deseas eliminar la cotización #${row.numero ?? row.id}?`)) return;
                            toast.success("Simulación: Cotización eliminada");
                        }}
                        extra={
                            <button
                                onClick={() => window.open(`/admin/print/pedido/${row.id}`, '_blank')}
                                title="Imprimir planilla de pedido"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 10px',
                                    background: 'transparent', border: '1px solid transparent', borderRadius: '8px',
                                    cursor: 'pointer', color: '#8f0653', fontSize: '12px', fontWeight: '600'
                                }}
                            >
                                <Printer size={14} />
                            </button>
                        }
                    />
                )}
            />

            <DetailDrawer 
                isOpen={showDetail}
                onClose={() => setShowDetail(false)}
                data={detailData}
                type="cotizacion"
                title={detailData ? `Cotización #${detailData.id}` : ''}
            />

            <AdminCotizacionModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreated={(newCoti) => {
                    setCotizaciones(prev => [newCoti, ...prev]);
                }}
            />
        </div>
    );
};

export default CotizacionesView;
