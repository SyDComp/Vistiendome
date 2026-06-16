import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import DataTable from '../../../components/organisms/DataTable';
import '../../../components/molecules/Modal.css';

export default function LoginHistoryModal({ isOpen, onClose, user }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen && user) {
            fetchHistory();
        }
    }, [isOpen, user]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/logs?user_id=${user.id}`);
            // Filter LOGIN & LOGOUT, keep newest-first order
            const filteredLogs = response.data
                .filter(log => ['LOGIN', 'LOGOUT'].includes(log.action))
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            setLogs(filteredLogs);
        } catch (error) {
            console.error('Error fetching login history:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatAction = (action) => {
        if (action === 'LOGIN') return <span className="badge badge-info" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>ENTRADA</span>;
        if (action === 'LOGOUT') return <span className="badge badge-default" style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>SALIDA</span>;
        return <span className="badge">{action}</span>;
    };

    const formatTime = (dateString) => {
        if (!dateString) return 'No disponible';
        const date = new Date(dateString.endsWith('Z') || dateString.match(/([+-]\d{2}:\d{2})$/) ? dateString : `${dateString}Z`);
        return new Intl.DateTimeFormat('es-CL', {
            timeZone: 'America/Santiago',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content-column" style={{ maxWidth: '700px', width: '90%' }}>
                <div className="modal-header">
                    <h2>Historial de Accesos - {user?.full_name}</h2>
                    <button className="btn-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Cargando historial...</div>
                    ) : (
                        <DataTable
                            columns={[
                                { header: 'Acción', cell: (row) => formatAction(row.action) },
                                { header: 'Fecha y Hora', cell: (row) => formatTime(row.created_at) },
                            ]}
                            data={logs}
                            pageSize={8}
                            emptyMessage="No hay registros de acceso para este usuario."
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
