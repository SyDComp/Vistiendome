import React, { useState, useEffect } from 'react';
import { useNotification } from '../../../context/NotificationContext';
import { useModal } from '../../../context/ModalContext';
import { useAuth } from '../../../context/AuthContext';
import DataTable from '../../../components/organisms/DataTable';
import Input from '../../../components/atoms/Input';
import Button from '../../../components/atoms/Button';
import TableFilter from '../../../components/templates/TableFilter';
import LoginHistoryModal from './LoginHistoryModal';
import api from '../../../services/api';
import './Invitations.css';

export default function Invitations() {
    const { user: currentUser } = useAuth();
    const [stats, setStats] = useState(null);
    const [invitations, setInvitations] = useState([]);
    const [users, setUsers] = useState([]);
    const [availableRoles, setAvailableRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [usersLoading, setUsersLoading] = useState(true);
    const [formData, setFormData] = useState({
        email: '',
        role_id: ''
    });
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Filters State
    const [filteredUsers, setFilteredUsers] = useState([]);

    // User Editing State
    const [editingUser, setEditingUser] = useState(null);
    const [editFormData, setEditFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        role_id: '',
        current_password: ''
    });
    const [isSavingUser, setIsSavingUser] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isRolesInfoExpanded, setIsRolesInfoExpanded] = useState(false);

    // History Modal State
    const [historyUser, setHistoryUser] = useState(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const { showNotification } = useNotification();
    const { confirm } = useModal();

    // const roles = [
    //     { id: 8, name: 'Vendedor' },
    //     { id: 9, name: 'Repartidor' },
    //     { id: 22, name: 'Soporte' }
    // ];

    useEffect(() => {
        fetchStats();
        fetchInvitations();
        fetchUsers();
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const response = await api.get('/auth/roles');
            setAvailableRoles(response.data);
        } catch (err) {
            console.error('Error fetching roles:', err);
            showNotification('error', 'No se pudieron cargar los roles');
        }
    };

    const fetchStats = async () => {
        try {
            const response = await api.get('/invitations/stats');
            setStats(response.data);
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    const fetchInvitations = async () => {
        setLoading(true);
        try {
            const response = await api.get('/invitations', { params: { pending_only: true } });
            setInvitations(response.data);
        } catch (err) {
            console.error('Error fetching invitations:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        setUsersLoading(true);
        try {
            const response = await api.get('/users');
            // Filter out default Admin to prevent accidental deletions
            const nonAdminUsers = response.data.filter(u => u.role.name !== 'Administrador');
            setUsers(nonAdminUsers);
            setFilteredUsers(nonAdminUsers);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setUsersLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!formData.role_id) {
            setError('Por favor selecciona un rol');
            return;
        }

        try {
            const response = await api.post('/invitations', {
                email: formData.email,
                role_id: parseInt(formData.role_id)
            });

            setSuccess(`Invitación creada exitosamente`);
            setFormData({ email: '', role_id: '' });
            fetchStats();
            fetchInvitations();

            // Copy invitation link to clipboard
            const token = response.data.token || response.data; // Sometimes Fastapi returns the full model, sometimes just token
            let inviteToken = typeof token === 'string' ? token : token.token;

            const inviteLink = `${window.location.origin}/register?token=${inviteToken}`;
            navigator.clipboard.writeText(inviteLink);
            showNotification('success', 'Link de invitación copiado al portapapeles');
            setIsCreateModalOpen(false); // Close modal on success
        } catch (err) {
            if (err.response && err.response.data && err.response.data.detail) {
                setError(err.response.data.detail);
            } else {
                setError('Error de conexión. Intenta nuevamente.');
            }
        }
    };

    const cancelInvitation = async (id) => {
        const confirmed = await confirm({
            title: 'Cancelar Invitación',
            message: '¿Deseas cancelar esta invitación? El enlace dejará de ser válido.',
            confirmText: 'Confirmar',
            variant: 'danger'
        });

        if (!confirmed) return;

        try {
            await api.delete(`/invitations/${id}`);
            fetchStats();
            fetchInvitations();
        } catch (err) {
            console.error('Error cancelling invitation:', err);
        }
    };

    const copyInviteLink = (token) => {
        const inviteLink = `${window.location.origin}/register?token=${token}`;
        navigator.clipboard.writeText(inviteLink);
        showNotification('info', 'Link copiado al portapapeles');
    };

    // Removed handleDeleteUser to prevent risky hard deletions. 
    // Suspension is handled by handleToggleActive.

    const handleToggleActive = async (user) => {
        try {
            await api.patch(`/users/${user.id}`, { is_active: !user.is_active });
            showNotification('success', `Usuario ${user.is_active ? 'suspendido' : 'activado'} correctamente`);
            fetchUsers();
            fetchStats();
        } catch (err) {
            console.error(err);
            showNotification('error', 'Error al modificar estado del usuario');
        }
    };

    const handleEditUserClick = (user) => {
        setEditingUser(user);
        setEditFormData({
            full_name: user.full_name,
            email: user.email,
            phone: user.phone || '',
            role_id: user.role.id.toString(),
            current_password: ''
        });
    };

    const handleCloseEditModal = () => {
        setEditingUser(null);
    };

    const handleSaveUserEdit = async (e) => {
        e.preventDefault();
        setIsSavingUser(true);
        try {
            const payload = {
                full_name: editFormData.full_name,
                email: editFormData.email,
                phone: editFormData.phone,
                role_id: parseInt(editFormData.role_id)
            };

            if (editingUser.role.name === 'Administrador') {
                payload.current_password = editFormData.current_password;
            }

            await api.patch(`/users/${editingUser.id}`, payload);
            showNotification('success', 'Usuario actualizado exitosamente');
            setEditingUser(null);
            fetchUsers();
            fetchStats();
        } catch (err) {
            console.error(err);
            showNotification('error', err.response?.data?.detail || 'Error al actualizar usuario');
        } finally {
            setIsSavingUser(false);
        }
    };

    const handleResetUserPassword = async (user) => {
        const confirmed = await confirm({
            title: 'Restablecer Contraseña',
            message: `¿Estás seguro que deseas enviar un enlace de restablecimiento a ${user.email}?`,
            confirmText: 'Enviar Enlace',
            variant: 'info'
        });

        if (!confirmed) return;

        try {
            await api.post('/auth/request-password-reset', { email: user.email });
            showNotification('success', `Enlace de restablecimiento enviado a ${user.email}`);
        } catch (err) {
            console.error(err);
            showNotification('error', 'Error enviando enlace de restablecimiento');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('es-CL', {
            timeZone: 'America/Santiago',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const canInviteRole = (roleId, roleName) => {
        if (!stats) return true;
        
        // Use role name for limits instead of hardcoded IDs
        const nameUpper = (roleName || '').toUpperCase();
        
        if (nameUpper === 'VENDEDOR') {
            return stats.vendedor_count < stats.vendedor_max;
        }
        if (nameUpper === 'REPARTIDOR') {
            return stats.repartidor_count < stats.repartidor_max;
        }
        if (nameUpper === 'SOPORTE') {
            return stats.soporte_count < stats.soporte_max;
        }
        return true;
    };



    return (
        <div className="invitations-page">
            {/* <div className="invitations-header">
                <h1>Gestionar Invitaciones</h1>
            </div> */}

            <div
                className="page-header"
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '3rem',
                    marginBottom: '2rem',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                    textAlign: 'center',
                }}
            >
                <h2>Gestión de Invitaciones</h2>

                <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
                    + Crear Nueva Invitación
                </Button>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-label">Vendedores</div>
                        <div className="stat-value">{stats.vendedor_count} / {stats.vendedor_max}</div>
                        <div className={`stat-status ${stats.vendedor_count >= stats.vendedor_max ? 'limit-reached' : ''}`}>
                            {stats.vendedor_count >= stats.vendedor_max ? 'Límite alcanzado' : 'Disponible'}
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Repartidores</div>
                        <div className="stat-value">{stats.repartidor_count} / {stats.repartidor_max}</div>
                        <div className={`stat-status ${stats.repartidor_count >= stats.repartidor_max ? 'limit-reached' : ''}`}>
                            {stats.repartidor_count >= stats.repartidor_max ? 'Límite alcanzado' : 'Disponible'}
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Soporte</div>
                        <div className="stat-value">{stats.soporte_count} / {stats.soporte_max}</div>
                        <div className={`stat-status ${stats.soporte_count >= stats.soporte_max ? 'limit-reached' : ''}`}>
                            {stats.soporte_count >= stats.soporte_max ? 'Límite alcanzado' : 'Disponible'}
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Invitaciones Pendientes</div>
                        <div className="stat-value">{stats.pending_invitations}</div>
                    </div>
                </div>
            )}

            {/* Roles Information Card */}
            <div className="roles-info-section">
                <div
                    className={`roles-info-header ${isRolesInfoExpanded ? 'expanded' : ''}`}
                    onClick={() => setIsRolesInfoExpanded(!isRolesInfoExpanded)}
                >
                    <div className="header-left">
                        <span className="info-icon">ℹ️</span>
                        <h3>Información de Roles y Permisos</h3>
                    </div>
                    <span className="toggle-icon">{isRolesInfoExpanded ? '▲' : '▼'}</span>
                </div>

                {isRolesInfoExpanded && (
                    <div className="roles-info-content">
                        <div className="role-info-card">
                            <h4><span className="role-badge">Vendedor</span></h4>
                            <p>Administra el catálogo. Puede <strong>gestionar productos</strong>, <strong>registrar ventas</strong>, ver el historial y acceder a reportes básicos.</p>
                        </div>
                        <div className="role-info-card">
                            <h4><span className="role-badge">Repartidor</span></h4>
                            <p>Gestiona entregas. Puede <strong>actualizar el estado</strong> de los despachos y <strong>subir fotos</strong> como comprobante de entrega.</p>
                        </div>
                        <div className="role-info-card">
                            <h4><span className="role-badge">Soporte</span></h4>
                            <p>Atención al cliente. Tiene acceso para <strong>resolver consultas e incidencias</strong> de los usuarios y <strong>gestionar mensajería</strong> de forma limitada.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Create Invitation Actions */}
            {/* <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center' }}>
                <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
                    + Crear Nueva Invitación
                </Button>
            </div> */}

            {/* Create Invitation Modal */}
            {isCreateModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content-column" style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h2>Crear Nueva Invitación</h2>
                            <button className="btn-close" onClick={() => setIsCreateModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body" style={{ padding: '1.5rem' }}>
                            {error && <div className="alert alert-error">{error}</div>}
                            {success && <div className="alert alert-success">{success}</div>}

                            <form onSubmit={handleSubmit} className="invitation-form" style={{ maxWidth: '100%' }}>
                                <div className="form-row" style={{ flexDirection: 'column', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label>Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label>Rol</label>
                                        <select
                                            value={formData.role_id}
                                            onChange={(e) => setFormData({ ...formData, role_id: e.target.value })}
                                            required
                                        >
                                            <option value="">Seleccionar rol</option>
                                            {availableRoles.map(role => (
                                                <option
                                                    key={role.id}
                                                    value={role.id}
                                                    disabled={!canInviteRole(role.id, role.name)}
                                                >
                                                    {role.name} {!canInviteRole(role.id, role.name) && '(Límite alcanzado)'}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="modal-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                    <Button type="button" variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" variant="primary">
                                        Enviar Invitación
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Pending Invitations List */}
            <div className="invitations-list-section">
                <h2>Invitaciones Pendientes</h2>

                {loading ? (
                    <div className="loading-state">Cargando...</div>
                ) : (
                    <div className="invitations-table">
                        <DataTable
                            columns={[
                                { header: 'Email', accessor: 'email' },
                                { header: 'Rol', cell: (inv) => <span className="role-badge">{inv.role_name}</span> },
                                { header: 'Creado', cell: (inv) => formatDate(inv.created_at) },
                                { header: 'Expira', cell: (inv) => formatDate(inv.expires_at) },
                                {
                                    header: 'Acciones',
                                    cell: (inv) => (
                                        <div className="action-buttons">
                                            <button
                                                className="btn-action btn-copy"
                                                onClick={() => copyInviteLink(inv.token)}
                                                title="Copiar link"
                                            >
                                                📋
                                            </button>
                                            <button
                                                className="btn-action btn-cancel"
                                                onClick={() => cancelInvitation(inv.id)}
                                                title="Cancelar"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    )
                                }
                            ]}
                            data={invitations}
                            emptyMessage="No hay invitaciones pendientes"
                        />
                    </div>
                )}
            </div>

            {/* System Users List */}
            <div className="invitations-list-section" style={{ marginTop: '3rem' }}>
                <h2>Usuarios del Sistema</h2>

                <TableFilter
                    searchPlaceholder="Buscar por nombre o email..."
                    searchFields={['full_name', 'email']}
                    filters={[
                        {
                            key: 'role.name',
                            label: 'Rol',
                            options: [
                                { value: 'Administrador', label: 'Administrador' },
                                { value: 'Vendedor', label: 'Vendedor' },
                                { value: 'Repartidor', label: 'Repartidor' },
                                { value: 'Soporte', label: 'Soporte' }
                            ]
                        }
                    ]}
                    quickFilters={[
                        { key: 'all', label: 'Todos' },
                        { key: 'active', label: 'Activos', filterKey: 'is_active', filterValue: true },
                        { key: 'inactive', label: 'Suspendidos', filterKey: 'is_active', filterValue: false }
                    ]}
                    defaultQuickFilter="all"
                    data={users}
                    onFilterChange={setFilteredUsers}
                />

                {usersLoading ? (
                    <div className="loading-state">Cargando usuarios...</div>
                ) : (
                    <div className="invitations-table">
                        <DataTable
                            columns={[
                                { header: 'Nombre', accessor: 'full_name' },
                                { header: 'Email', accessor: 'email' },
                                { header: 'Rol', cell: (u) => <span className="role-badge">{u.role.name}</span> },
                                {
                                    header: 'Estado',
                                    cell: (u) => (
                                        <span className={`status-badge ${u.is_active ? 'status-active' : 'status-inactive'}`}>
                                            {u.is_active ? 'Activo' : 'Suspendido'}
                                        </span>
                                    )
                                },
                                { header: 'Creado', cell: (u) => formatDate(u.created_at) },
                                {
                                    header: 'Acciones',
                                    cell: (u) => (
                                        <div className="action-buttons">
                                            <button
                                                className="btn-action"
                                                onClick={() => handleEditUserClick(u)}
                                                title="Editar Usuario"
                                            >
                                                ✏️
                                            </button>
                                            <button
                                                className="btn-action"
                                                onClick={() => {
                                                    setHistoryUser(u);
                                                    setIsHistoryModalOpen(true);
                                                }}
                                                title="Ver Historial de Accesos"
                                            >
                                                🕒
                                            </button>
                                            <button
                                                className="btn-action"
                                                onClick={() => handleResetUserPassword(u)}
                                                title="Restablecer Contraseña"
                                            >
                                                🔑
                                            </button>
                                            <button
                                                className="btn-action"
                                                onClick={() => handleToggleActive(u)}
                                                title={u.id === currentUser?.id ? 'No puedes suspenderte a ti mismo' : (u.is_active ? 'Suspender Acceso' : 'Reanudar Acceso')}
                                                disabled={u.id === currentUser?.id}
                                                style={{ opacity: u.id === currentUser?.id ? 0.3 : 1, cursor: u.id === currentUser?.id ? 'not-allowed' : 'pointer' }}
                                            >
                                                {u.is_active ? '🔒' : '🔓'}
                                            </button>
                                        </div>
                                    )
                                }
                            ]}
                            data={filteredUsers}
                            emptyMessage="No hay usuarios registrados en el sistema"
                        />
                    </div>
                )}
            </div>

            {/* Edit User Modal */}
            {editingUser && (
                <div className="modal-overlay">
                    <div className="modal-content-column" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h2>Editar Usuario</h2>
                            <button className="btn-close" onClick={handleCloseEditModal}>×</button>
                        </div>
                        <form onSubmit={handleSaveUserEdit} className="modal-body">
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <Input
                                    label="Correo Electrónico"
                                    type="email"
                                    value={editFormData.email}
                                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                    required
                                    fullWidth
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <Input
                                    label="Nombre Completo"
                                    type="text"
                                    value={editFormData.full_name}
                                    onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
                                    required
                                    fullWidth
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <Input
                                    label="Teléfono"
                                    type="tel"
                                    value={editFormData.phone}
                                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                    fullWidth
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '2rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', fontSize: '0.9rem', color: '#4a5568' }}>Rol</label>
                                <select
                                    value={editFormData.role_id}
                                    onChange={(e) => setEditFormData({ ...editFormData, role_id: e.target.value })}
                                    required
                                    disabled={editingUser.role.name === 'Administrador'}
                                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s' }}
                                    onFocus={(e) => e.target.style.borderColor = '#6C63FF'}
                                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                >
                                    <option value="" disabled>Seleccione un rol</option>
                                    {availableRoles.map(role => (
                                        <option key={role.id} value={role.id}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {editingUser.role.name === 'Administrador' && (
                                <div className="form-group" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '8px', border: '1px solid #ffeeba' }}>
                                    <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: '#856404' }}>
                                        <strong>⚠️ Por seguridad:</strong> Para guardar cambios en una cuenta de Administrador, debes confirmar con tu contraseña actual para autorizar los cambios.
                                    </p>
                                    <Input
                                        label="Tu contraseña actual"
                                        type="password"
                                        value={editFormData.current_password}
                                        onChange={(e) => setEditFormData({ ...editFormData, current_password: e.target.value })}
                                        required
                                        fullWidth
                                    />
                                </div>
                            )}
                            <div className="modal-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                <Button type="button" variant="secondary" onClick={handleCloseEditModal} disabled={isSavingUser}>
                                    Cancelar
                                </Button>
                                <Button type="submit" variant="primary" disabled={isSavingUser}>
                                    {isSavingUser ? 'Guardando...' : 'Guardar Cambios'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            <LoginHistoryModal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                user={historyUser}
            />
        </div>
    );
}
