import React, { useState, useEffect } from 'react';
import Input from '../../../ui/Input';
import { formatRUT } from '../../../../utils/formatters';
import { AdminFormRow, AdminFormSection } from '../../../ui/admin/AdminFormLayout';

const API_GEO = `/api/v1/geo`;

const PersonaFields = ({ formData, handleChange, isLead = false }) => {
    const [regiones, setRegiones] = useState([]);
    const [comunas, setComunas] = useState([]);

    useEffect(() => {
        fetch(`${API_GEO}/regiones`)
            .then(res => res.json())
            .then(data => setRegiones(data))
            .catch(err => console.error("Error loading regions:", err));
    }, []);

    useEffect(() => {
        if (formData.region_id) {
            fetch(`${API_GEO}/regiones/${formData.region_id}/comunas`)
                .then(res => res.json())
                .then(data => setComunas(data))
                .catch(err => console.error("Error loading comunas:", err));
        } else {
            setComunas([]);
        }
    }, [formData.region_id]);
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
                    onBlur={(e) => handleChange({ target: { name: 'rut', value: formatRUT(e.target.value) } })}
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

            <AdminFormSection 
                title="Logística (Dirección y Despacho)" 
                badge="OPCIONAL" 
                description="Información de envío y preferencia de transporte."
            >
                <AdminFormRow balanced>
                    <div style={{ width: '100%' }}>
                        <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>Región</label>
                        <select 
                            name="region_id" 
                            value={formData.region_id || ''}
                            onChange={(e) => {
                                handleChange(e);
                                handleChange({ target: { name: 'comuna_id', value: '' } });
                            }}
                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: '600', outline: 'none' }}
                        >
                            <option value="">Seleccione una región</option>
                            {regiones.map(r => (
                                <option key={r.id} value={r.id}>{r.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div style={{ width: '100%' }}>
                        <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>Comuna</label>
                        <select 
                            name="comuna_id" 
                            value={formData.comuna_id || ''}
                            onChange={handleChange}
                            disabled={!formData.region_id}
                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: formData.region_id ? '#f8fafc' : '#f1f5f9', fontWeight: '600', outline: 'none' }}
                        >
                            <option value="">Seleccione una comuna</option>
                            {comunas.map(c => (
                                <option key={c.id} value={c.id}>{c.nombre}</option>
                            ))}
                        </select>
                    </div>
                </AdminFormRow>
                <AdminFormRow balanced>
                    <Input 
                        label="Dirección Completa (Calle, N°)" 
                        name="direccion"
                        value={formData.direccion || ''}
                        onChange={handleChange}
                        placeholder="Ej: Av. Providencia 1234, Depto 5"
                    />
                    <div style={{ width: '100%' }}>
                        <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>Transporte Preferido</label>
                        <select 
                            name="transporte_preferido" 
                            value={formData.transporte_preferido || ''}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: '600', outline: 'none' }}
                        >
                            <option value="">No especificado (Retiro, Por coordinar...)</option>
                            <option value="STARKEN">Starken</option>
                            <option value="CORREOS DE CHILE">Correos de Chile</option>
                            <option value="RETIRO EN LOCAL">Retiro en local</option>
                            <option value="OTRO">Otro / Múltiple</option>
                        </select>
                    </div>
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
