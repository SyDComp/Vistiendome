import React, { useState } from 'react';
import { useNotification } from '../../../../context/NotificationContext';
import Button from '../../../ui/Button';
import { Users } from 'lucide-react';
import AdminFormLayout, { AdminFormSubmit } from '../../../ui/admin/AdminFormLayout';
import PersonaFields from './PersonaFields';
import { pedidosPorDespachar, destinoAPedidos } from '../../../../lib/api/endpoints';
import { cantidad } from '../../../../utils/cantidad';

const API_BASE = `/api/v1/crm`;

const ClienteForm = ({ initialData, onSuccess, onCancel }) => {
    const { toast, confirm } = useNotification();
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState(initialData || {
        rut: '',
        nombres: '',
        apellidos: '',
        email_personal: '',
        telefono: '',
        tipo_persona: 'CLIENTE',
        transporte_preferido: '',
        direccion: '',
        region_id: '',
        comuna_id: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Cada pedido guarda su destino; cambiar a la clienta no lo cambia. Si tiene
    // pedidos que todavía no salen, se ofrece pasarles la ubicación nueva.
    const ofrecerASusPedidos = async (clienteId) => {
        try {
            const pendientes = await pedidosPorDespachar(clienteId);
            if (!pendientes.length) return;
            const numeros = pendientes.map(p => `N° ${p.numero}`).join(', ');
            if (!await confirm(`¿Usar esta dirección también en sus ${cantidad(pendientes.length, 'pedido', 'pedidos')} por despachar (${numeros})?`)) return;
            const { cambiados, omitidos } = await destinoAPedidos(clienteId);
            if (cambiados.length) toast.success(`Destino actualizado en ${cambiados.map(n => `N° ${n}`).join(', ')}`);
            omitidos.forEach(o => toast.error(`N° ${o.numero}: ${o.motivo}`));
        } catch (err) {
            toast.error(err?.message || 'No se pudo pasar la dirección a sus pedidos');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.rut || !formData.nombres || !formData.apellidos) {
            toast.error("RUT, Nombres y Apellidos son obligatorios");
            return;
        }

        setLoading(true);
        try {
            const url = initialData ? `${API_BASE}/clientes/${initialData.id}` : `${API_BASE}/clientes`;
            const method = initialData ? 'PUT' : 'POST';

            const payload = { ...formData };
            if (!payload.comuna_id) delete payload.comuna_id;
            if (!payload.region_id) delete payload.region_id;
            if (!payload.transporte_preferido) delete payload.transporte_preferido;
            if (!payload.direccion) delete payload.direccion;

            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || `Error al ${initialData ? 'actualizar' : 'crear'} cliente`);
            }

            toast.success(initialData ? "Cliente actualizado exitosamente" : "Cliente creado exitosamente");
            if (initialData && formData.comuna_id) await ofrecerASusPedidos(initialData.id);
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Error creating cliente:", error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AdminFormLayout
            title={initialData ? "Editar Registro" : "Crear Nuevo Registro (Cliente/Prospecto)"}
            icon={Users}
            onBack={onCancel}
        >
            <form onSubmit={handleSubmit}>
                <PersonaFields 
                    formData={formData} 
                    handleChange={handleChange} 
                    isLead={true} 
                />

                <AdminFormSubmit>
                    <Button 
                        variant="primary" 
                        type="submit" 
                        disabled={loading}
                        className="adm-boton-ancho"
                    >
                        {loading ? 'GUARDANDO...' : 'CONFIRMAR Y GUARDAR REGISTRO'}
                    </Button>
                </AdminFormSubmit>
            </form>
        </AdminFormLayout>
    );
};

export default ClienteForm;
