import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Input from '../atoms/Input';
import Button from '../atoms/Button';
import './LoginForm.css';

export default function LoginForm() {
    const navigate = useNavigate();
    const { login } = useAuth(); // Use context login
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [generalError, setGeneralError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
        // Clear error when user starts typing
        if (errors[e.target.name]) {
            setErrors({ ...errors, [e.target.name]: '' });
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.email) {
            newErrors.email = 'El email es requerido';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Email inválido';
        }

        if (!formData.password) {
            newErrors.password = 'La contraseña es requerida';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setGeneralError('');

        if (!validate()) return;

        setLoading(true);

        try {
            const response = await login(formData.email, formData.password);

            // Redirect based on role
            const user = response.user;
            switch (user.role.name) {
                case 'Admin':
                    navigate('/admin');
                    break;
                case 'Vendedor':
                    navigate('/vendedor');
                    break;
                case 'Repartidor':
                    navigate('/repartidor');
                    break;
                default:
                    navigate('/');
            }
        } catch (error) {
            console.error('Login error:', error);
            setLoading(false); // Explicit reset on error
            setGeneralError(
                error.response?.data?.detail || 'Error al iniciar sesión. Verifica tus credenciales.'
            );
        }
    };

    return (
        <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-form__header">
                <h1 className="login-form__title">Bienvenido</h1>
                <p className="login-form__subtitle">Ingresa a ZonaArtistica</p>
            </div>

            {generalError && (
                <div className="login-form__error">{generalError}</div>
            )}

            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Email</label>
                <input
                    type="email"
                    name="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
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
                {errors.email && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.email}</span>}
            </div>

            <div className="input-group" style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Contraseña</label>
                <input
                    type="password"
                    name="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    required
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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                    {errors.password && <span style={{ color: 'red', fontSize: '0.8rem' }}>{errors.password}</span>}
                    <Link to="/forgot-password" style={{ fontSize: '0.85rem', color: '#6C63FF', textDecoration: 'none', marginLeft: 'auto' }}>
                        ¿Olvidaste tu contraseña?
                    </Link>
                </div>
            </div>

            <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={loading}
            >
                {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
        </form>
    );
}
