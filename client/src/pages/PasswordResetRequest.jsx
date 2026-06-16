import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Button from '../components/atoms/Button';
import api from '../services/api';
import './Login.css';

export default function PasswordResetRequest() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await api.post('/auth/request-password-reset', { email: email.trim() });
            setMessage(response.data.message || 'Si el correo está registrado, recibirás un enlace.');
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.detail || 'Ha ocurrido un error al procesar tu solicitud.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-page__content">
                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="login-form__header">
                        <h1 className="login-form__title">Restablecer</h1>
                        <p className="login-form__subtitle">Ingresa tu correo asociado a la cuenta</p>
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

                    <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Email</label>
                        <input
                            type="email"
                            placeholder="tu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading || message !== ''}
                            style={{
                                width: '100%',
                                padding: '0.8rem',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                fontSize: '1rem',
                                color: '#000',
                                backgroundColor: '#fff'
                            }}
                        />
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        fullWidth
                        disabled={loading || !email || message !== ''}
                    >
                        {loading ? 'Enviando...' : 'Enviar Enlace'}
                    </Button>

                    <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                        <Link to="/login" style={{ fontSize: '0.85rem', color: '#6C63FF', textDecoration: 'none' }}>
                            Volver al inicio de sesión
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}
