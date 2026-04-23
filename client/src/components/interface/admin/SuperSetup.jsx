import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from '../../../hooks/useForm';
import Input from '../../ui/Input';
import Button from '../../ui/Button';

const validateSetup = (values) => {
    const errors = {};
    if (!values.rut) errors.rut = "Requerido legalmente";
    if (!values.nombres) errors.nombres = "Obligatorio";
    if (!values.apellidos) errors.apellidos = "Obligatorio";
    if (!values.password) errors.password = "Contraseña maestra requerida";
    if (!values.email_corporativo) errors.email_corporativo = "Requerido para login de Admin";
    if (!values.email_personal) errors.email_personal = "Contacto personal requerido";
    return errors;
};

const SuperSetup = () => {
    const [statusMessage, setStatusMessage] = useState(null);
    const navigate = useNavigate();

    const { values, errors, isSubmitting, handleChange, handleSubmit, resetForm } = useForm({
        rut: '', nombres: '', apellidos: '', email_personal: '', email_corporativo: '', password: ''
    }, validateSetup);

    const boostrapSystem = async (payload) => {
        setStatusMessage(null);
        try {
            const res = await fetch('http://localhost:8000/api/v1/auth/bootstrap/first-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            
            if (!res.ok) {
                setStatusMessage({ type: 'error', text: data.detail || 'Fallo de Bootstrap. El sistema podría estar ya configurado.' });
                return;
            }

            setStatusMessage({ type: 'success', text: "¡Súper Administrador Aprovisionado! El sistema se ha sellado." });
            resetForm();
            
            // Redirect to admin login after 3 seconds
            setTimeout(() => {
                navigate('/admin/login');
            }, 3000);

        } catch (err) {
            setStatusMessage({ type: 'error', text: "Fallo de conexión crítico. Valida que Uvicorn esté operando." });
        }
    };

    return (
        <div style={{ maxWidth: '450px', margin: '50px auto', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', borderRadius: '12px' }}>
            <h1 style={{ color: '#8f0653', margin: '0 0 10px 0' }}>God-Mode Setup</h1>
            <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                Este formulario es de un solo uso. Una vez se aprovisione la cuenta maestra, 
                esta ruta quedará bloqueada perpetuamente para proteger la PBAC.
            </p>

            {statusMessage && (
                <div style={{
                    padding: '12px', borderRadius: '8px', marginBottom: '20px',
                    backgroundColor: statusMessage.type === 'error' ? '#ffebee' : '#e8f5e9',
                    color: statusMessage.type === 'error' ? '#c62828' : '#2e7d32',
                    borderLeft: `4px solid ${statusMessage.type === 'error' ? '#c62828' : '#2e7d32'}`
                }}>
                    {statusMessage.text}
                </div>
            )}

            <form onSubmit={handleSubmit(boostrapSystem)}>
                <Input label="RUT Responsable" name="rut" placeholder="Ej: 11222333-4" value={values.rut} onChange={handleChange} error={errors.rut} />
                <Input label="Nombres" name="nombres" value={values.nombres} onChange={handleChange} error={errors.nombres} />
                <Input label="Apellidos" name="apellidos" value={values.apellidos} onChange={handleChange} error={errors.apellidos} />
                <Input label="Correo Personal" name="email_personal" type="email" value={values.email_personal} onChange={handleChange} error={errors.email_personal} />
                <Input label="Correo Institucional (Acceso)" name="email_corporativo" type="email" placeholder="admin@vistiendome.cl" value={values.email_corporativo} onChange={handleChange} error={errors.email_corporativo} />
                <Input label="Clave Administrativa" name="password" type="password" value={values.password} onChange={handleChange} error={errors.password} />
                
                <Button type="submit" variant="danger" style={{ width: '100%', marginTop: '10px' }} isLoading={isSubmitting}>
                    Sellar Sistema (Bootstrap)
                </Button>
            </form>
        </div>
    );
};

export default SuperSetup;
