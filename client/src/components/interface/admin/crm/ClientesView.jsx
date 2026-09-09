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
import { formatearTelefono } from '../../../../utils/telefono';

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

    // `confirm` recibe un TEXTO y devuelve una promesa con la respuesta.
    // Pasarle un objeto lo renderiza como hijo de React y deja la pantalla en
    // blanco (error #31), que es lo que pasaba al pulsar Eliminar.
    const handleDelete = async (cliente) => {
        if (!await confirm(`¿Estás seguro de eliminar a ${cliente.nombres}?`)) return;
        try {
            const res = await fetch(`/api/v1/crm/clientes/${cliente.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success("Cliente eliminado");
                fetchClientes();
            } else {
                toast.error("Error al eliminar cliente");
            }
        } catch (error) {
            toast.error("Error de conexión");
        }
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
                <div className="adm-celda">
                    <span className="adm-celda-principal adm-celda-principal--nombre">
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
                <div className="adm-celda-con-icono--junta">
                    <Mail size={14} /> {row.email_personal}
                </div>
            ) : <span className="adm-celda-apagada">--</span>
        },
        {
            key: 'telefono',
            label: 'Teléfono',
            // Se muestra siempre igual, venga como venga guardado: en la base
            // conviven numeros con +56 y sin el, y la columna quedaba con dos
            // formatos distintos segun la fila.
            render: (_, row) => row.telefono ? (
                <div className="adm-celda-con-icono--junta">
                    <Phone size={14} /> {formatearTelefono(row.telefono)}
                </div>
            ) : <span className="adm-celda-apagada">--</span>
        },
        {
            key: 'created_at',
            label: 'Registro',
            render: (value) => {
                if (!value) return <span className="adm-celda-apagada">--</span>;
                const date = new Date(value);
                return isNaN(date.getTime()) ? (
                    <span className="adm-celda-apagada">--</span>
                ) : (
                    <span className="adm-celda-secundaria">
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
                        <div className="adm-celda adm-celda--pegada">
                            <span className="adm-celda-texto">{row.comuna_nombre}</span>
                            <span className="adm-celda-menor">{row.region_nombre}</span>
                        </div>
                    );
                }
                return <span className="adm-celda-apagada">No registrada</span>;
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
                <div className="adm-vista-fondo">
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
        <div className="fade-in">
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
                    <div className="adm-celda-con-icono">
                        <button
                            type="button"
                            onClick={() => { setTargetCliente(row); setShowCreateModal(true); }}
                            title="Armar Cotización para este Cliente"
                            className="adm-etiqueta-marca"
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
