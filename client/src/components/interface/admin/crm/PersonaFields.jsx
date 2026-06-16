import React from 'react';
import Input from '../../../ui/Input';
import { AdminFormRow, AdminFormSection } from '../../../ui/admin/AdminFormLayout';

const PersonaFields = ({ formData, handleChange, isLead = false }) => {
    return (
        <>
            <AdminFormRow>
                <Input 
                    label="Nombres" 
                    name="nombres"
                    value={formData.nombres}
                    onChange={handleChange}
                    placeholder="Nombres del cliente"
                />
                <Input 
                    label="Apellidos" 
                    name="apellidos"
                    value={formData.apellidos}
                    onChange={handleChange}
                    placeholder="Apellidos del cliente"
                />
            </AdminFormRow>

            <AdminFormRow>
                <Input 
                    label="RUT" 
                    name="rut"
                    value={formData.rut}
                    onChange={handleChange}
                    placeholder="Ej. 12.345.678-9"
                />
                <div /> {/* Spacer */}
            </AdminFormRow>

            <AdminFormSection 
                title="Datos de Contacto" 
                badge="OPCIONAL" 
                description="Información para envío de boletas o comunicación directa."
            >
                <AdminFormRow balanced>
                    <Input 
                        label="Email Personal" 
                        type="email"
                        name="email_personal"
                        value={formData.email_personal}
                        onChange={handleChange}
                        placeholder="ejemplo@correo.com"
                    />
                    <Input 
                        label="Teléfono / WhatsApp" 
                        name="telefono"
                        value={formData.telefono}
                        onChange={handleChange}
                        placeholder="+56 9 1234 5678"
                    />
                </AdminFormRow>
            </AdminFormSection>

            {isLead && (
                <div style={{ marginTop: '24px', marginBottom: '32px' }}>
                    <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>Tipo de Registro</label>
                    <select 
                        name="tipo_persona" 
                        value={formData.tipo_persona}
                        onChange={handleChange}
                        style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: '600', outline: 'none' }}
                    >
                        <option value="CLIENTE">Cliente (Comprador confirmado)</option>
                        <option value="LEAD">Prospecto (Cotizador / Interesado)</option>
                    </select>
                </div>
            )}
        </>
    );
};

export default PersonaFields;
