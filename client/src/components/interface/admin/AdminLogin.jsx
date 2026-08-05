import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code'; 
import { useForm } from '../../../hooks/useForm';
import Input from '../../ui/Input';
import Button from '../../ui/Button';

const validateAdminAuth = (values) => {
    const errors = {};
    if (!values.identificador) errors.identificador = "Requerido";
    if (!values.password) errors.password = "Requerido";
    return errors;
};

const AdminLogin = () => {
    const navigate = useNavigate();
    const [authStatus, setAuthStatus] = useState(null);

    const { values, errors, isSubmitting, handleChange, handleSubmit } = useForm({
        identificador: '', password: ''
    }, validateAdminAuth);

    const performLogin = async (payload) => {
        setAuthStatus(null);
        console.log("Iniciando Acceso Administrador para:", payload.identificador);

        try {
            const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || ``);
            const res = await fetch(`${API_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
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
        <div className="admin-login-container">
            <h2 className="admin-login-title">
                <span className="admin-login-brand">Vistiendomé</span> Access
            </h2>

            {authStatus && (
                <div className={`admin-login-status ${authStatus.type}`}>
                    {authStatus.text}
                </div>
            )}

            <form onSubmit={handleSubmit(performLogin)}>
                <Input 
                    label="Email o Apodo" name="identificador" type="text"
                    value={values.identificador} onChange={handleChange} error={errors.identificador}
                />
                
                <Input 
                    label="Contraseña" name="password" type="password" 
                    value={values.password} onChange={handleChange} error={errors.password}
                />

                <Button type="submit" variant="primary" className="admin-login-btn" isLoading={isSubmitting}>
                    Acceder al Panel
                </Button>
            </form>
        </div>
    );
};

export default AdminLogin;
