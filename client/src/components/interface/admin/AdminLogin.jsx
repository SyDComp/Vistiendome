import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code'; 
import { useForm } from '../../../hooks/useForm';
import Input from '../../ui/Input';
import Button from '../../ui/Button';

const validateAdminAuth = (values) => {
    const errors = {};
    if (!values.email) errors.email = "Requerido";
    if (!values.password) errors.password = "Requerido";
    return errors;
};

const AdminLogin = () => {
    const navigate = useNavigate();
    const [authStatus, setAuthStatus] = useState(null);

    const { values, errors, isSubmitting, handleChange, handleSubmit } = useForm({
        email: '', password: ''
    }, validateAdminAuth);

    const performLogin = async (payload) => {
        setAuthStatus(null);
        console.log("Iniciando Acceso Administrador para:", payload.email);

        try {
            const res = await fetch('http://localhost:8000/api/v1/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                setAuthStatus({ type: 'error', text: data.detail || "Error de autenticación." });
                return;
            }

            setAuthStatus({ type: 'success', text: "Autorización concedida. Redirigiendo..." });
            localStorage.setItem('admin_token', data.access_token);
            
            setTimeout(() => {
                navigate('/admin/dashboard');
            }, 1000);

        } catch (err) {
            console.error("Fallo de Red en Auth:", err);
            setAuthStatus({ type: 'error', text: "Error de red. El servidor backend podría estar inalcanzable." });
        }
    };

    return (
        <div style={{ maxWidth: '400px', margin: '50px auto', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', borderRadius: '12px' }}>
            <h2 style={{ color: '#333', textAlign: 'center', marginBottom: '20px' }}>
                <span style={{color: '#8f0653'}}>Vistiéndome</span> Access
            </h2>

            {authStatus && (
                <div style={{
                    padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px',
                    backgroundColor: authStatus.type === 'error' ? '#ffebee' : '#e8f5e9',
                    color: authStatus.type === 'error' ? '#c62828' : '#2e7d32',
                }}>
                    {authStatus.text}
                </div>
            )}

            <form onSubmit={handleSubmit(performLogin)}>
                <Input 
                    label="Correo Corporativo" name="email" type="email"
                    value={values.email} onChange={handleChange} error={errors.email}
                />
                
                <Input 
                    label="Contraseña" name="password" type="password" 
                    value={values.password} onChange={handleChange} error={errors.password}
                />

                <Button type="submit" variant="primary" style={{ width: '100%', marginTop: '15px' }} isLoading={isSubmitting}>
                    Acceder al Panel
                </Button>
            </form>
        </div>
    );
};

export default AdminLogin;
