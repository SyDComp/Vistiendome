import React, { useState } from 'react';
import { useNotification } from '../../../../context/NotificationContext';
import Button from '../../../ui/Button';
import { Users } from 'lucide-react';
import AdminFormLayout, { AdminFormSubmit } from '../../../ui/admin/AdminFormLayout';
import PersonaFields from './PersonaFields';

const API_BASE = `/api/v1/crm`;

const ClienteForm = ({ initialData, onSuccess, onCancel }) => {
    const { toast } = useNotification();
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
                        style={{ padding: '0 60px', height: '56px', fontSize: '16px', borderRadius: '18px', fontWeight: '900', boxShadow: '0 10px 15px -3px rgba(143, 6, 83, 0.3)' }}
                    >
                        {loading ? 'GUARDANDO...' : 'CONFIRMAR Y GUARDAR REGISTRO'}
                    </Button>
                </AdminFormSubmit>
            </form>
        </AdminFormLayout>
    );
};

export default ClienteForm;
