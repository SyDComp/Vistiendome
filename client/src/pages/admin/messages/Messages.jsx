import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../services/api';
import { useNotification } from '../../../context/NotificationContext';
import { useModal } from '../../../context/ModalContext';
import { useWebSocket } from '../../../context/WebSocketContext';
import TableFilter from '../../../components/templates/TableFilter';
import DataTable from '../../../components/organisms/DataTable';
import EmailActionDialog from '../../../components/molecules/EmailActionDialog';
import './Messages.css';

export default function Messages() {
    const [messages, setMessages] = useState([]);
    const [filteredThreads, setFilteredThreads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [activeEmailDialog, setActiveEmailDialog] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [replyLoading, setReplyLoading] = useState(false);

    const { showNotification } = useNotification();
    const { confirm } = useModal();
    const wsMessage = useWebSocket();

    // ── Fetch ──────────────────────────────────────────────────────────────
    const fetchMessages = async () => {
        setLoading(true);
        try {
            // include_archived=true: el admin siempre ve todo; TableFilter filtra client-side
            const response = await api.get('/contact?include_archived=true');
            if (response.data) {
                setMessages(response.data);
                window.dispatchEvent(new Event('messages_updated'));
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
            showNotification('error', 'Error al cargar mensajes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchMessages(); }, []);

    useEffect(() => {
        if (wsMessage && wsMessage.event === 'MESSAGES_UPDATED') {
            fetchMessages();
        }
    }, [wsMessage]);

    // ── Thread grouping ────────────────────────────────────────────────────
    const allThreads = useMemo(() => {
        const grouped = messages.reduce((groups, msg) => {
            const email = msg.email;
            if (!groups[email]) {
                groups[email] = {
                    id: email,
                    email,
                    name: msg.name,
                    phone: msg.phone,
                    messages: [],
                    unreadCount: 0,
                    lastMessageTime: msg.created_at,
                    is_archived: msg.is_archived,
                };
            }
            groups[email].messages.push(msg);
            if (!msg.is_read) groups[email].unreadCount++;
            if (new Date(msg.created_at) > new Date(groups[email].lastMessageTime)) {
                groups[email].lastMessageTime = msg.created_at;
                groups[email].name = msg.name;
                if (msg.phone) groups[email].phone = msg.phone;
            }
            // Thread is archived only if ALL its messages are archived
            if (!msg.is_archived) groups[email].is_archived = false;
            return groups;
        }, {});

        Object.values(grouped).forEach(t => {
            t.messages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            // Campo plano para que TableFilter pueda buscar en el asunto sin acceso a arrays
            t.lastSubject = t.messages[0]?.subject || '';
        });

        return Object.values(grouped).sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));
    }, [messages]);

    // Keep filteredThreads in sync when allThreads changes (e.g. after WebSocket update)
    useEffect(() => {
        setFilteredThreads(allThreads);
    }, [allThreads]);

    const selectedThread = useMemo(() => {
        if (!selectedEmail) return null;
        return allThreads.find(t => t.email === selectedEmail);
    }, [selectedEmail, allThreads]);

    const unreadCount = messages.filter(m => !m.is_read && !m.is_archived).length;

    // ── Actions ────────────────────────────────────────────────────────────
    const markAsRead = async (messageId) => {
        try { await api.patch(`/contact/${messageId}/read`); return true; }
        catch { return false; }
    };

    const archiveThread = async (email, threadMessages) => {
        const isCurrentlyArchived = threadMessages[0].is_archived;
        const confirmed = await confirm({
            title: isCurrentlyArchived ? 'Desarchivar Conversación' : 'Archivar Conversación',
            message: `¿Estás seguro de ${isCurrentlyArchived ? 'desarchivar' : 'archivar'} los ${threadMessages.length} mensajes de este contacto?`,
            confirmText: isCurrentlyArchived ? 'Desarchivar' : 'Archivar',
            variant: isCurrentlyArchived ? 'info' : 'warning'
        });
        if (!confirmed) return;
        try {
            await Promise.all(threadMessages.map(m => api.patch(`/contact/${m.id}/archive`)));
            showNotification('success', `Conversación ${isCurrentlyArchived ? 'desarchivada' : 'archivada'}`);
            await fetchMessages();
            window.dispatchEvent(new Event('messages_updated'));
        } catch {
            showNotification('error', 'Error al procesar el archivo');
        }
    };

    const deleteThread = async (email, threadMessages) => {
        const confirmed = await confirm({
            title: 'Eliminar Conversación',
            message: `¿Estás seguro de eliminar permanentemente los ${threadMessages.length} mensaje(s) de ${email}? Esta acción no se puede deshacer.`,
            confirmText: 'Eliminar',
            variant: 'danger'
        });
        if (!confirmed) return;
        try {
            await Promise.all(threadMessages.map(m => api.delete(`/contact/${m.id}`)));
            setMessages(prev => prev.filter(m => m.email !== email));
            showNotification('success', 'Conversación eliminada correctamente');
            window.dispatchEvent(new Event('messages_updated'));
        } catch (error) {
            console.error('Error deleting thread:', error);
            showNotification('error', 'Error al eliminar la conversación');
        }
    };

    const openThreadModal = async (thread) => {
        setSelectedEmail(thread.email);
        if (thread.unreadCount > 0) {
            const unreadIds = thread.messages.filter(m => !m.is_read).map(m => m.id);
            await Promise.all(unreadIds.map(id => markAsRead(id)));
            setMessages(prev => prev.map(m => m.email === thread.email ? { ...m, is_read: true } : m));
            window.dispatchEvent(new Event('messages_updated'));
        }
    };

    const closeThreadModal = () => { setSelectedEmail(null); setReplyText(''); };

    const sendReply = async (email, thread) => {
        if (!replyText.trim()) return;
        const latestMessageId = thread.messages[0].id;
        setReplyLoading(true);
        try {
            await api.post(`/contact/${latestMessageId}/reply`, { message: replyText });
            showNotification('success', 'Respuesta enviada correctamente');
            setReplyText('');
            await fetchMessages();
        } catch {
            showNotification('error', 'Error al enviar respuesta');
        } finally {
            setReplyLoading(false);
        }
    };

    const openWhatsApp = (phone) => {
        if (!phone) return;
        window.open(`https://wa.me/${phone.replace(/\D/g, '')}`, '_blank');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Fecha desconocida';
        try {
            return new Intl.DateTimeFormat('es-CL', {
                timeZone: 'America/Santiago',
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            }).format(new Date(dateString));
        } catch { return '—'; }
    };

    // ── Columns ────────────────────────────────────────────────────────────
    const columns = [
        {
            header: 'Remitente',
            cell: (thread) => (
                <div className="sender-cell">
                    <div className="dt-name">{thread.name}</div>
                    <div className="dt-email">{thread.email}</div>
                    {thread.phone && <div className="dt-email">{thread.phone}</div>}
                </div>
            )
        },
        {
            header: 'Último Asunto',
            cell: (thread) => (
                <div className="subject-cell">
                    <span className="dt-subject">{thread.messages[0].subject}</span>
                    {thread.messages.length > 1 && (
                        <span className="thread-count-dt">({thread.messages.length})</span>
                    )}
                </div>
            )
        },
        {
            header: 'Fecha',
            cell: (thread) => (
                <span style={{ fontSize: '0.88rem', color: '#555' }}>
                    {formatDate(thread.lastMessageTime)}
                </span>
            )
        },
        {
            header: 'Estado',
            cell: (thread) => {
                const hasPending = thread.unreadCount > 0;
                const allReplied = thread.messages.every(m => m.is_replied === true);
                const isArchived = thread.is_archived;
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {isArchived ? (
                            <span className="status-badge-dt dt-archived">📥 Archivado</span>
                        ) : (
                            <span className={`status-badge-dt ${hasPending ? 'dt-unread' : 'dt-read'}`}>
                                {hasPending ? `${thread.unreadCount} Nuevo` : 'Visto'}
                            </span>
                        )}
                        {allReplied && (
                            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: '600' }}>
                                ✓ Respondido
                            </span>
                        )}
                    </div>
                );
            }
        },
        {
            header: 'Acciones',
            cell: (thread) => (
                <div className="action-buttons">
                    <button className="btn-action" onClick={() => openThreadModal(thread)} title="Ver y Responder">👁️</button>
                    <button className="btn-action" onClick={(e) => { e.stopPropagation(); activeEmailDialog !== thread.email && setActiveEmailDialog(thread.email); }} title="Enviar Email">📧</button>
                    {thread.phone && (
                        <button className="btn-action" onClick={(e) => { e.stopPropagation(); openWhatsApp(thread.phone); }} title="Abrir WhatsApp">📱</button>
                    )}
                    <button
                        className="btn-action btn-cancel"
                        onClick={(e) => { e.stopPropagation(); deleteThread(thread.email, thread.messages); }}
                        title="Eliminar Conversación"
                    >
                        🗑️
                    </button>
                </div>
            )
        }
    ];

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="messages-page">
            <div
                className="page-header"
                style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3rem', marginBottom: '1.5rem', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}
            >
                <h2>Mensajes de Contacto</h2>
                <div className="messages-stats">
                    <span className="stat-badge">{allThreads.filter(t => !t.is_archived).length} Conversaciones</span>
                    {unreadCount > 0 && (
                        <span className="stat-badge unread">{unreadCount} Sin Leer</span>
                    )}
                </div>
            </div>

            {/* TableFilter — misma experiencia que Productos y Ventas */}
            <TableFilter
                searchPlaceholder="Buscar por nombre, email o asunto..."
                searchFields={['name', 'email', 'lastSubject']}
                quickFilters={[
                    { key: 'all', label: 'Todos' },
                    { key: 'unread', label: 'Sin leer', filter: (t) => t.unreadCount > 0 && !t.is_archived },
                    { key: 'read', label: 'Leídos', filter: (t) => t.unreadCount === 0 && !t.is_archived },
                    { key: 'archived', label: 'Archivados', filter: (t) => t.is_archived },
                ]}
                defaultQuickFilter="all"
                data={allThreads}
                onFilterChange={setFilteredThreads}
            />

            {/* Messages Table */}
            {loading ? (
                <div className="loading-state">Cargando mensajes...</div>
            ) : (
                <div className="messages-table-container">
                    <DataTable
                        columns={columns}
                        data={filteredThreads}
                        emptyMessage="No hay mensajes en esta categoría"
                    />
                </div>
            )}

            {/* Thread Details Modal */}
            {selectedThread && (
                <div className="modal-overlay">
                    <div className="modal-content messages-modal-content">
                        <div className="modal-header">
                            <div>
                                <h2 style={{ marginBottom: '0.2rem' }}>Conversación con {selectedThread.name}</h2>
                                <span style={{ fontSize: '0.9rem', color: '#666' }}>{selectedThread.messages.length} mensaje(s)</span>
                            </div>
                            <button className="btn-close" onClick={closeThreadModal}>×</button>
                        </div>

                        <div className="modal-body message-details-container">
                            <div className="message-info-grid">
                                <div className="info-item">
                                    <span className="label">Email:</span>
                                    <span className="value copyable" onClick={() => {
                                        navigator.clipboard.writeText(selectedThread.email);
                                        showNotification('info', 'Email copiado');
                                    }}>{selectedThread.email} 📋</span>
                                </div>
                                {selectedThread.phone && (
                                    <>
                                        <div className="info-item">
                                            <span className="label">Teléfono:</span>
                                            <span className="value">{selectedThread.phone}</span>
                                        </div>
                                        <button
                                            className="btn-action btn-whatsapp"
                                            onClick={() => openWhatsApp(selectedThread.phone)}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#25D366', color: 'white', cursor: 'pointer', fontWeight: '500' }}
                                        >
                                            📱 WhatsApp
                                        </button>
                                    </>
                                )}
                            </div>

                            <div className="message-thread-history">
                                {selectedThread.messages.map(msg => (
                                    <React.Fragment key={msg.id}>
                                        <div className="history-item">
                                            <div className="history-meta">
                                                <span className="history-date">{formatDate(msg.created_at)}</span>
                                                <span className="history-subject">{msg.subject}</span>
                                            </div>
                                            <p style={{ wordBreak: 'break-word' }}>{msg.message}</p>
                                        </div>
                                        {msg.replies && msg.replies.map(reply => (
                                            <div key={reply.id} className="history-item reply-item" style={{ marginLeft: '2rem', borderLeft: '3px solid #3b82f6', background: '#eff6ff' }}>
                                                <div className="history-meta">
                                                    <span className="history-date">{formatDate(reply.created_at)}</span>
                                                    <span className="history-subject" style={{ color: '#3b82f6' }}>Tu Respuesta</span>
                                                </div>
                                                <p style={{ wordBreak: 'break-word' }}>{reply.content}</p>
                                            </div>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </div>

                            <div className="modal-actions-bar">
                                {/* {selectedThread.phone && (
                                    <button
                                        className="btn-action btn-whatsapp"
                                        onClick={() => openWhatsApp(selectedThread.phone)}
                                        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: '#25D366', color: 'white', cursor: 'pointer', fontWeight: '500' }}
                                    >
                                        📱 WhatsApp
                                    </button>
                                )} */}
                                <button
                                    className="btn-action btn-archive"
                                    onClick={() => { closeThreadModal(); archiveThread(selectedThread.email, selectedThread.messages); }}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontWeight: '500' }}
                                >
                                    {selectedThread.messages[0].is_archived ? '📤 Desarchivar' : '📥 Archivar'}
                                </button>
                                <button
                                    onClick={() => { closeThreadModal(); deleteThread(selectedThread.email, selectedThread.messages); }}
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid #fecaca', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: '500' }}
                                >
                                    🗑️ Eliminar
                                </button>
                            </div>

                            <div className="reply-section">
                                <h4 style={{ margin: '0 0 0.8rem 0', color: '#333' }}>Responder por Email</h4>

                                {selectedThread.messages.some(m => m.is_replied === true) && (
                                    <div className="info-notice" style={{ background: '#ecfdf5', border: '1px solid #10b981', color: '#065f46', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                                        💡 <strong>Aviso:</strong> Ya enviaste una respuesta oficial. Para continuar usá Gmail o WhatsApp directamente.
                                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem' }}>
                                            <a href={`mailto:${selectedThread.email}`} style={{ color: '#059669', fontWeight: '600' }}>Ir a Gmail 📧</a>
                                            <a
                                                href={`https://wa.me/56968027107?text=${encodeURIComponent(`Hola ${selectedThread.name}, un gusto saludarte. Te contacto de Zona Artística respecto a tu consulta...`)}`}
                                                target="_blank" rel="noreferrer"
                                                style={{ color: '#059669', fontWeight: '600' }}
                                            >
                                                Ir a WhatsApp 📱
                                            </a>
                                        </div>
                                    </div>
                                )}

                                <textarea
                                    className="reply-textarea"
                                    placeholder={selectedThread.messages.some(m => m.is_replied) ? "Escribí una respuesta adicional si es necesario..." : `Escribí tu respuesta para ${selectedThread.name}...`}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    rows="4"
                                />
                                <div className="reply-actions">
                                    <div />
                                    <button
                                        className="btn-send-reply"
                                        disabled={!replyText.trim() || replyLoading}
                                        onClick={() => sendReply(selectedThread.email, selectedThread)}
                                    >
                                        {replyLoading ? 'Enviando...' : 'Enviar Respuesta'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeEmailDialog && (
                <EmailActionDialog
                    email={activeEmailDialog}
                    onClose={() => setActiveEmailDialog(null)}
                    showContactLink={true}
                />
            )}
        </div>
    );
}
