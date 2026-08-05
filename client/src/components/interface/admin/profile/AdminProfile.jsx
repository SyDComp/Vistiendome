import React, { useState, useEffect } from 'react';
import { User, Mail, AlertCircle } from 'lucide-react';
import Button from '../../../ui/Button';
import Input from '../../../ui/Input';
import AdminFormLayout, { AdminFormSubmit, AdminFormSection } from '../../../ui/admin/AdminFormLayout';

const AdminProfile = () => {
    const [profile, setProfile] = useState({
        email_corporativo: '',
        apodo: '',
        nombres: '',
        apellidos: '',
        estado: ''
    });
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || ``);
            const res = await fetch(`${API_URL}/api/v1/auth/me`, {
                headers: { 
                    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
            }
        } catch (err) {
            console.error('Error loading profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        
        try {
            const API_URL = import.meta.env.PROD ? '' : (import.meta.env.VITE_API_URL || ``);
            const res = await fetch(`${API_URL}/api/v1/auth/me`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
                },
                body: JSON.stringify({
                    nombres: profile.nombres,
                    apellidos: profile.apellidos,
                    email_corporativo: profile.email_corporativo,
                    apodo: profile.apodo || null
                })
            });
            
            const data = await res.json();
            
            if (res.ok) {
                setMessage({ type: 'success', text: data.msg || 'Perfil actualizado correctamente.' });
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: data.detail || 'Error al actualizar.' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Fallo de red al actualizar perfil.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando perfil...</div>;

    return (
        <div className="admin-module fade-in">
            {message && (
                <div style={{ 
                    padding: '16px 24px', 
                    borderRadius: '16px', 
                    background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
                    color: message.type === 'success' ? '#059669' : '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontWeight: '700',
                    fontSize: '14px',
                    marginBottom: '20px'
                }}>
                    <AlertCircle size={20} />
                    {message.text}
                </div>
            )}
            
            <AdminFormLayout
                title="Configuración de Credenciales de Acceso"
                icon={User}
            >
                <form onSubmit={handleSave}>
                    <AdminFormSection title="Datos Personales" description="Estos datos se reflejarán en tu perfil de la plataforma.">
                        <div style={{ display: 'flex', gap: '24px' }}>
                            <div style={{ flex: 1 }}>
                                <Input 
                                    label="Nombres"
                                    name="nombres"
                                    type="text" 
                                    value={profile.nombres} 
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <Input 
                                    label="Apellidos"
                                    name="apellidos"
                                    type="text" 
                                    value={profile.apellidos} 
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>
                    </AdminFormSection>

                    <AdminFormSection title="Credenciales de Acceso" description="Esta información te permitirá iniciar sesión de forma segura en la consola.">
                        <div style={{ marginBottom: '24px' }}>
                            <Input 
                                label={<span><Mail size={14} style={{display:'inline', verticalAlign:'middle'}}/> Email Corporativo</span>}
                                type="email" 
                                name="email_corporativo" 
                                value={profile.email_corporativo} 
                                onChange={handleChange} 
                                required
                            />
                        </div>

                        <div>
                            <Input 
                                label={<span><User size={14} style={{display:'inline', verticalAlign:'middle'}}/> Apodo (Nombre de usuario)</span>}
                                type="text" 
                                name="apodo" 
                                value={profile.apodo || ''} 
                                onChange={handleChange} 
                                placeholder="Ej: paola123"
                            />
                            <span style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', display: 'block', fontWeight: '500' }}>
                                Puedes usar este apodo para iniciar sesión más rápido en lugar de tu correo.
                            </span>
                        </div>
                    </AdminFormSection>

                    <AdminFormSubmit>
                        <Button 
                            variant="primary" 
                            type="submit" 
                            disabled={saving}
                            style={{ padding: '0 60px', height: '56px', fontSize: '16px', borderRadius: '18px', fontWeight: '900', boxShadow: '0 10px 15px -3px rgba(143, 6, 83, 0.3)' }}
                        >
                            {saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS DEL PERFIL'}
                        </Button>
                    </AdminFormSubmit>
                </form>
            </AdminFormLayout>
        </div>
    );
};

export default AdminProfile;
