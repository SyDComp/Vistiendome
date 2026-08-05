import React, { useState, useEffect } from 'react';
import SectionHeader from '../../../ui/admin/SectionHeader';
import DataTable from '../../../ui/admin/DataTable';
import FilterBar from '../../../ui/admin/FilterBar';
import ClienteForm from './ClienteForm';
import RowActions from '../../../ui/admin/RowActions';
import DetailDrawer from '../../../ui/admin/DetailDrawer';
import { useNotification } from '../../../../context/NotificationContext';
import { Users, Mail, Phone, Calendar, ArrowLeft, FileText, Plus } from 'lucide-react';
import AdminCotizacionModal from './AdminCotizacionModal';

const TypeBadge = ({ type }) => {
    const isLead = type === 'LEAD';
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', padding: '4px 10px',
            borderRadius: '12px', fontSize: '11px', fontWeight: '700', textTransform: 'uppercase',
            backgroundColor: isLead ? '#eff6ff' : '#ecfdf5',
            color: isLead ? '#3b82f6' : '#10b981'
        }}>
            {isLead ? 'Lead (Prospecto)' : 'Cliente'}
        </span>
    );
};

const ClientesView = () => {
    const { toast, confirm } = useNotification();
    const [showForm, setShowForm] = useState(false);
    const [editingCliente, setEditingCliente] = useState(null);
    const [showDetail, setShowDetail] = useState(false);
    const [detailData, setDetailData] = useState(null);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilters, setActiveFilters] = useState({});
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [targetCliente, setTargetCliente] = useState(null);

    const fetchClientes = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/v1/crm/clientes');
            if (response.ok) {
                const data = await response.json();
                setClientes(data);
            }
        } catch (error) {
            console.error("Error fetching clientes:", error);
            toast.error("Error al cargar clientes");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (cliente) => {
        confirm({
            title: 'Eliminar Cliente',
            message: `¿Estás seguro de eliminar a ${cliente.nombres}?`,
            confirmLabel: 'Eliminar',
            cancelLabel: 'Cancelar',
            variant: 'danger',
            onConfirm: async () => {
                try {
                    const res = await fetch(`/api/v1/crm/clientes/${cliente.id}`, {
                        method: 'DELETE'
                    });
                    if (res.ok) {
                        toast.success("Cliente eliminado");
                        fetchClientes();
                    } else {
                        toast.error("Error al eliminar cliente");
                    }
                } catch (error) {
                    toast.error("Error de conexión");
                }
            }
        });
    };

    useEffect(() => {
        fetchClientes();
    }, []);

    const filteredClientes = clientes.filter(cliente => {
        const term = searchTerm.toLowerCase();
        const matchSearch = (
            (cliente.nombres?.toLowerCase() || '').includes(term) ||
            (cliente.rut?.toLowerCase() || '').includes(term) ||
            (cliente.email_personal?.toLowerCase() || '').includes(term)
        );

        let matchFilters = true;
        if (activeFilters.tipo_persona) {
            matchFilters = cliente.tipo_persona === activeFilters.tipo_persona;
        }

        return matchSearch && matchFilters;
    });

    const columns = [
        { 
            key: 'rut', 
            label: 'RUT',
            render: (value) => value || 'Sin RUT'
        },
        { 
            key: 'nombres', 
            label: 'Cliente',
            render: (value, row) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '14px' }}>
                        {value} {row.apellidos}
                    </span>
                    <TypeBadge type={row.tipo_persona} />
                </div>
            )
        },
        {
            key: 'correo',
            label: 'Correo',
            render: (_, row) => row.email_personal ? (
                <div className="flex items-center gap-1 text-sm text-slate-600">
                    <Mail size={14} /> {row.email_personal}
                </div>
            ) : <span className="text-slate-400 text-sm">--</span>
        },
        {
            key: 'telefono',
            label: 'Teléfono',
            render: (_, row) => row.telefono ? (
                <div className="flex items-center gap-1 text-sm text-slate-600">
                    <Phone size={14} /> {row.telefono}
                </div>
            ) : <span className="text-slate-400 text-sm">--</span>
        },
        { 
            key: 'created_at', 
            label: 'Registro',
            render: (value) => {
                if (!value) return <span style={{ color: '#94a3b8', fontSize: '13px' }}>--</span>;
                const date = new Date(value);
                return isNaN(date.getTime()) ? (
                    <span style={{ color: '#94a3b8', fontSize: '13px' }}>--</span>
                ) : (
                    <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>
                        {date.toLocaleDateString('es-CL')}
                    </span>
                );
            }
        },
        {
            key: 'ubicacion',
            label: 'Ubicación',
            render: (_, row) => {
                if (row.comuna_nombre && row.region_nombre) {
                    return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '13px', color: '#334155', fontWeight: '500' }}>{row.comuna_nombre}</span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>{row.region_nombre}</span>
                        </div>
                    );
                }
                return <span style={{ color: '#94a3b8', fontSize: '13px' }}>No registrada</span>;
            }
        }
    ];

    if (showForm) {
        return (
            <div className="admin-inventory-form-container desktop">
                <button 
                    onClick={() => { setShowForm(false); setEditingCliente(null); }}
                    className="admin-back-btn desktop"
                >
                    ← Volver al Listado
                </button>
                <div style={{ paddingBottom: '40px' }}>
                    <ClienteForm 
                        initialData={editingCliente}
                        onSuccess={() => {
                            setShowForm(false);
                            setEditingCliente(null);
                            fetchClientes();
                        }}
                        onCancel={() => { setShowForm(false); setEditingCliente(null); }}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="admin-module fade-in">
            <SectionHeader 
                title="Directorio de Clientes" 
                subtitle={`${clientes.length} prospectos y clientes registrados`}
                icon={Users}
                action={[
                    { label: '＋ Cotización Manual', onClick: () => { setTargetCliente(null); setShowCreateModal(true); }, variant: 'secondary' },
                    { label: '＋ Nuevo Cliente', onClick: () => setShowForm(true), variant: 'primary' }
                ]}
            />
            
            <FilterBar 
                searchPlaceholder="Buscar por RUT, nombre o email..."
                onSearchChange={setSearchTerm}
                activeFilters={activeFilters}
                onFilterChange={setActiveFilters}
                filters={[
                    {
                        key: 'tipo_persona',
                        label: 'Tipo',
                        options: [
                            { value: 'CLIENTE', label: 'Cliente' },
                            { value: 'LEAD', label: 'Prospecto (Cotizador)' }
                        ]
                    }
                ]}
            />

            <DataTable 
                columns={columns}
                data={filteredClientes}
                loading={loading}
                emptyMessage="No se encontraron clientes"
                rowActions={(row) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            type="button"
                            onClick={() => { setTargetCliente(row); setShowCreateModal(true); }}
                            title="Armar Cotización para este Cliente"
                            style={{
                                background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: '8px',
                                padding: '6px 10px', color: '#8f0653', fontWeight: '800', fontSize: '11px',
                                display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#fce7f3'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#fdf2f8'}
                        >
                            <FileText size={13} /> Cotizar
                        </button>
                        <RowActions
                            onView={() => { setDetailData(row); setShowDetail(true); }}
                            onEdit={() => { setEditingCliente(row); setShowForm(true); }}
                            onDelete={() => handleDelete(row)}
                        />
                    </div>
                )}
            />

            <DetailDrawer 
                isOpen={showDetail}
                onClose={() => setShowDetail(false)}
                data={detailData}
                type="cliente"
                title={detailData ? `${detailData.nombres} ${detailData.apellidos || ''}` : ''}
            />

            <AdminCotizacionModal
                isOpen={showCreateModal}
                onClose={() => { setShowCreateModal(false); setTargetCliente(null); }}
                initialCliente={targetCliente}
                onCreated={() => {
                    setShowCreateModal(false);
                    setTargetCliente(null);
                    fetchClientes();
                }}
            />
        </div>
    );
};

export default ClientesView;
