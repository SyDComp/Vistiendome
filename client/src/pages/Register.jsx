import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import './Register.css';

export default function Register() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login: authLogin } = useAuth();

    const [token, setToken] = useState(null);
    const [invitation, setInvitation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        // Get token from URL
        const tokenParam = searchParams.get('token');

        if (!tokenParam) {
            setError('Token de invitación no válido');
            setLoading(false);
            return;
        }

        setToken(tokenParam);

        // Validate token
        const validateToken = async () => {
            try {
                const response = await api.get(`/invitations/validate/${tokenParam}`);
                setInvitation(response.data);
            } catch (err) {
                if (err.response && err.response.data && err.response.data.detail) {
                    setError(err.response.data.detail);
                } else {
                    setError('Error al validar la invitación');
                }
            } finally {
                setLoading(false);
            }
        };

        validateToken();
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validations
        if (formData.password !== formData.confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (formData.password.length < 8) {
            setError('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        if (!formData.full_name || formData.full_name.length < 3) {
            setError('El nombre completo debe tener al menos 3 caracteres');
            return;
        }

        setSubmitting(true);

        try {
            const response = await api.post('/auth/register/invite', {
                token: token,
                full_name: formData.full_name,
                phone: formData.phone,
                password: formData.password
            });

            const data = response.data;

            // Auto-login with tokens
            authLogin(data);

            // Redirect based on role
            const roleRedirects = {
                'Vendedor': '/vendedor',
                'Repartidor': '/repartidor',
                'Soporte': '/admin',
                'Admin': '/admin'
            };

            const redirectPath = roleRedirects[data.user.role.name] || '/';
            navigate(redirectPath, { replace: true });

        } catch (err) {
            if (err.response && err.response.data && err.response.data.detail) {
                setError(err.response.data.detail);
            } else {
                setError('Error al registrar usuario');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="register-container">
                <div className="register-card">
                    <div className="loading-spinner">Verificando invitación...</div>
                </div>
            </div>
        );
    }

    if (error && !invitation) {
        return (
            <div className="register-container">
                <div className="register-card error-card">
                    <h1>❌ Error</h1>
                    <p className="error-message">{error}</p>
                    <button onClick={() => navigate('/login')} className="btn-secondary">
                        Ir a Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="register-container">
            <div className="register-card">
                <h1>Completar Registro</h1>

                <div className="invitation-info">
                    <p>Te han invitado a unirte como:</p>
                    <div className="role-badge">{invitation?.role_name}</div>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit} className="register-form">
                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={invitation?.email || ''}
                            disabled
                            className="input-readonly"
                        />
                        <small>🔒 Este campo se completó automáticamente</small>
                    </div>

                    <div className="form-group">
                        <label>Nombre Completo *</label>
                        <input
                            type="text"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            placeholder="Ej: Juan Pérez González"
                            required
                            minLength={3}
                        />
                    </div>

                    <div className="form-group">
                        <label>Teléfono</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="+56 9 1234 5678"
                        />
                    </div>

                    <div className="form-group">
                        <label>Contraseña *</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Mínimo 8 caracteres"
                            required
                            minLength={8}
                        />
                    </div>

                    <div className="form-group">
                        <label>Confirmar Contraseña *</label>
                        <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            placeholder="Repite tu contraseña"
                            required
                            minLength={8}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn-submit"
                        disabled={submitting}
                    >
                        {submitting ? 'Creando cuenta...' : 'Crear Cuenta'}
                    </button>
                </form>

                {invitation?.expires_at && (
                    <p className="expiry-notice">
                        ⏰ Esta invitación expira el {new Date(invitation.expires_at).toLocaleDateString('es-CL', { timeZone: 'America/Santiago' })}
                    </p>
                )}
            </div>
        </div>
    );
}
