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
import { FileText, Calendar, MessageCircle, MapPin, Printer, Plus } from 'lucide-react';
import AdminCotizacionModal from './AdminCotizacionModal';

/**
 * Los estados de un pedido, con su significado, en un solo lugar.
 *
 * El `significa` no es documentación suelta: se pinta en el glosario de la
 * pantalla. Antes el glosario estaba escrito aparte y decía de EN PROCESO
 * "contactando al cliente O armando pedido" — dos cosas en una línea. Teniendo
 * el texto acá, el que cambia un estado ve lo que va a leer la clienta.
 *
 * Regla con la que se eligieron: un estado existe sólo si alguien tiene que
 * declararlo Y algo depende de él. Por eso no hay "en corte": eso lo sabe el
 * sistema solo, y se muestra derivado.
 */
export const ESTADOS = [
    { value: 'NUEVA', label: 'NUEVA', color: '#10b981', bg: '#ecfdf5',
      significa: 'Llegó y todavía nadie la revisó.' },
    { value: 'EN_CONVERSACION', label: 'EN CONVERSACIÓN', color: '#f59e0b', bg: '#fef3c7',
      significa: 'Hablando con la clienta: tallas, precio, plazos.' },
    { value: 'CONFIRMADA', label: 'CONFIRMADA', color: '#3b82f6', bg: '#eff6ff',
      significa: 'La clienta aceptó. Recién acá las piezas entran a la orden de corte.' },
    { value: 'DESPACHADA', label: 'DESPACHADA', color: '#7c3aed', bg: '#f5f3ff',
      significa: 'Salió del taller. Acá se descuenta del stock, no antes.' },
    { value: 'CANCELADA', label: 'CANCELADA', color: '#ef4444', bg: '#fef2f2',
      significa: 'No se concretó, o un pedido confirmado se cayó.' },
];

const StateSelector = ({ cotizacion, onUpdate }) => {
    const { toast } = useNotification();
    const [loading, setLoading] = useState(false);

    const states = ESTADOS;

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
                </div>
            </div>

            {/* Siempre visible, no detrás de un botón: un glosario que hay que
                ir a buscar no cumple su función. La prueba es que la
                ambigüedad de "EN PROCESO" estaba escrita ahí y nadie la vio. */}
            <div className="cot-glosario">
                {ESTADOS.map(e => (
                    <div key={e.value} className="cot-glosario-item">
                        <span className="cot-glosario-punto" style={{ backgroundColor: e.color }} />
                        <div>
                            <span className="cot-glosario-nombre">{e.label}</span>
                            <span className="cot-glosario-texto">{e.significa}</span>
                        </div>
                    </div>
                ))}
            </div>
            <style>{`
                .cot-glosario { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:14px 20px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px 18px; margin-bottom:18px; }
                .cot-glosario-item { display:flex; align-items:flex-start; gap:9px; }
                .cot-glosario-punto { width:9px; height:9px; border-radius:50%; flex-shrink:0; margin-top:5px; }
                .cot-glosario-nombre { display:block; font-size:11px; font-weight:800; letter-spacing:.4px; color:#1e293b; }
                .cot-glosario-texto { display:block; font-size:12px; color:#64748b; line-height:1.4; margin-top:1px; }
            `}</style>

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
