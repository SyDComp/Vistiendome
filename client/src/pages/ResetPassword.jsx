import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Button from '../components/atoms/Button';
import api from '../services/api';
import './Login.css';

export default function ResetPassword() {
    const navigate = useNavigate();
    const location = useLocation();
    const [token, setToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        // Extract token from URL
        const queryParams = new URLSearchParams(location.search);
        const tokenParam = queryParams.get('token');
        if (tokenParam) {
            setToken(tokenParam);
        } else {
            setError('Enlace inválido o incompleto. Faltan credenciales clave.');
        }
    }, [location]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden. Intenta de nuevo.');
            setLoading(false);
            return;
        }

        try {
            await api.post('/auth/reset-password', {
                token: token,
                new_password: newPassword
            });
            setMessage('Contraseña actualizada exitosamente. Puedes iniciar sesión ahora.');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || 'El enlace ha expirado o es inválido.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-page__content">
                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="login-form__header">
                        <h1 className="login-form__title">Nueva Contraseña</h1>
                        <p className="login-form__subtitle">Crea una nueva contraseña para tu cuenta</p>
                    </div>

                    {message && (
                        <div className="login-form__error" style={{ backgroundColor: '#d4edda', color: '#155724', border: '1px solid #c3e6cb' }}>
                            {message}
                        </div>
                    )}
                    {error && (
                        <div className="login-form__error">
                            {error}
                        </div>
                    )}

                    <div className="input-group" style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Nueva Contraseña</label>
                        <input
                            type="password"
                            placeholder="Mínimo 8 caracteres"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            disabled={loading || !token || message !== ''}
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                fontSize: '1rem',
                                backgroundColor: '#fff'
                            }}
                        />
                    </div>

                    <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Confirmar Contraseña</label>
                        <input
                            type="password"
                            placeholder="Mínimo 8 caracteres"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={loading || !token || message !== ''}
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                fontSize: '1rem',
                                backgroundColor: '#fff'
                            }}
                        />
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        fullWidth
                        disabled={loading || !token || !newPassword || !confirmPassword || message !== ''}
                    >
                        {loading ? 'Guardando...' : 'Establecer Contraseña'}
                    </Button>

                    <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                        <Link to="/login" style={{ fontSize: '0.85rem', color: '#6C63FF', textDecoration: 'none' }}>
                            Cancelar
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
