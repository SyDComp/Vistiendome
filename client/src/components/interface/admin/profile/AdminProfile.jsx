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
            const res = await fetch('/api/v1/auth/me', {
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
            const res = await fetch('/api/v1/auth/me', {
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

    if (loading) return <div className="adm-vacio-centrado">Cargando perfil...</div>;

    return (
        <div className="fade-in">
            {message && (
                <div className={`adm-resultado ${message.type === 'success' ? 'adm-resultado--bien' : 'adm-resultado--mal'}`}>
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
                        <div className="adm-fila-amplia">
                            <div className="adm-flexible">
                                <Input
                                    label="Nombres"
                                    name="nombres"
                                    type="text"
                                    value={profile.nombres}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                            <div className="adm-flexible">
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
                        <div className="adm-separacion--seccion">
                            <Input
                                label={<span><Mail size={14} className="adm-en-linea"/> Email Corporativo</span>}
                                type="email"
                                name="email_corporativo"
                                value={profile.email_corporativo}
                                onChange={handleChange}
                                required
                            />
                        </div>

                        <div>
                            <Input
                                label={<span><User size={14} className="adm-en-linea"/> Apodo (Nombre de usuario)</span>}
                                type="text"
                                name="apodo"
                                value={profile.apodo || ''}
                                onChange={handleChange}
                                placeholder="Ej: paola123"
                            />
                            <span className="adm-pie-ayuda">
                                Puedes usar este apodo para iniciar sesión más rápido en lugar de tu correo.
                            </span>
                        </div>
                    </AdminFormSection>

                    <AdminFormSubmit>
                        <Button
                            variant="primary"
                            type="submit"
                            disabled={saving}
                            className="adm-boton-ancho"
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
