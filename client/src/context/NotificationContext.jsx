import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { X, CheckCircle2, AlertCircle, Info, HelpCircle } from 'lucide-react';
import '../styles/NotificationSystem.css';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const [dialog, setDialog] = useState(null); // { type: 'confirm'|'prompt', message, resolve, reject, value? }
    const toastId = useRef(0);

    // --- TOASTS ---
    const showToast = useCallback((message, type = 'info', title = '') => {
        const id = ++toastId.current;
        const newToast = { id, message, type, title };
        setToasts(prev => [...prev, newToast]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    const toast = {
        success: (msg, title = 'Éxito') => showToast(msg, 'success', title),
        error: (msg, title = 'Error') => showToast(msg, 'error', title),
        info: (msg, title = 'Información') => showToast(msg, 'info', title),
    };

    // --- DIALOGS (Confirm/Prompt) ---
    const confirm = useCallback((message) => {
        return new Promise((resolve) => {
            setDialog({ type: 'confirm', message, resolve });
        });
    }, []);

    const prompt = useCallback((message, defaultValue = '') => {
        return new Promise((resolve) => {
            setDialog({ type: 'prompt', message, resolve, defaultValue });
        });
    }, []);

    const handleDialogAction = (result) => {
        if (dialog?.resolve) dialog.resolve(result);
        setDialog(null);
    };

    return (
        <NotificationContext.Provider value={{ toast, confirm, prompt }}>
            {children}

            {/* TOAST CONTAINER */}
            <div className="toast-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast-card ${t.type}`}>
                        <div style={{ color: t.type === 'success' ? '#10b981' : t.type === 'error' ? '#ef4444' : '#3b82f6' }}>
                            {t.type === 'success' && <CheckCircle2 size={20} />}
                            {t.type === 'error' && <AlertCircle size={20} />}
                            {t.type === 'info' && <Info size={20} />}
                        </div>
                        <div className="toast-content">
                            <div className="toast-title">{t.title}</div>
                            <div className="toast-message">{t.message}</div>
                        </div>
                        <button 
                            onClick={() => setToasts(prev => prev.filter(toast => toast.id !== t.id))}
                            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                        >
                            <X size={14} />
                        </button>
                    </div>
                ))}
            </div>

            {/* DIALOG BACKDROP & MODAL */}
            {dialog && (
                <div className="dialog-backdrop">
                    <div className="dialog-card">
                        <div className="dialog-header">
                            <HelpCircle size={24} />
                            <span style={{ fontWeight: '800', fontSize: '18px' }}>Atención</span>
                        </div>
                        <div className="dialog-body">
                            <p className="dialog-message">{dialog.message}</p>
                            
                            {dialog.type === 'prompt' && (
                                <input 
                                    className="dialog-input"
                                    autoFocus
                                    defaultValue={dialog.defaultValue}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleDialogAction(e.target.value);
                                        if (e.key === 'Escape') handleDialogAction(null);
                                    }}
                                    id="dialog-prompt-field"
                                />
                            )}
                        </div>
                        <div className="dialog-footer">
                            <button 
                                className="btn-confirm secondary" 
                                onClick={() => handleDialogAction(null)}
                            >
                                Cancelar
                            </button>
                            <button 
                                className="btn-confirm primary" 
                                onClick={() => {
                                    if (dialog.type === 'prompt') {
                                        handleDialogAction(document.getElementById('dialog-prompt-field').value);
                                    } else {
                                        handleDialogAction(true);
                                    }
                                }}
                            >
                                {dialog.type === 'prompt' ? 'Aceptar' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) throw new Error('useNotification must be used within NotificationProvider');
    return context;
};
