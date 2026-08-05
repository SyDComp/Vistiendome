import React, { useEffect, useState } from 'react';
import { AlertCircle, X, Check, HelpCircle } from 'lucide-react';
import Button from './Button';
import { useScrollLock } from '../../hooks/useScrollLock';

/**
 * ConfirmModal: Un modal premium para confirmaciones críticas.
 */
const ConfirmModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title = "¿Estás seguro?", 
    message = "Esta acción no se puede deshacer.",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "danger" // danger, warning, info
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useScrollLock(isOpen);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    if (!isOpen && !isVisible) return null;

    const colors = {
        danger: {
            icon: <AlertCircle size={32} color="#e11d48" />,
            bg: '#fff1f2',
            button: '#e11d48',
            shadow: 'rgba(225,29,72,0.2)'
        },
        warning: {
            icon: <HelpCircle size={32} color="#f59e0b" />,
            bg: '#fffbeb',
            button: '#f59e0b',
            shadow: 'rgba(245,158,11,0.2)'
        },
        info: {
            icon: <AlertCircle size={32} color="#3b82f6" />,
            bg: '#eff6ff',
            button: '#3b82f6',
            shadow: 'rgba(59,130,246,0.2)'
        }
    };

    const theme = colors[variant] || colors.danger;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.3s ease',
            pointerEvents: isVisible ? 'auto' : 'none'
        }}>
            {/* Backdrop */}
            <div 
                onClick={onClose}
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(15, 23, 42, 0.4)',
                    backdropFilter: 'blur(8px)',
                }} 
            />

            {/* Modal Card */}
            <div style={{
                position: 'relative',
                width: '100%',
                maxWidth: '440px',
                background: '#fff',
                borderRadius: '32px',
                padding: '40px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: '24px',
                        right: '24px',
                        width: '36px',
                        height: '36px',
                        borderRadius: '12px',
                        border: 'none',
                        background: '#f8fafc',
                        color: '#64748b',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s'
                    }}
                >
                    <X size={18} />
                </button>

                {/* Header with Icon */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '24px',
                        background: theme.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                    }}>
                        {theme.icon}
                    </div>
                    <h2 style={{ 
                        margin: 0, 
                        fontSize: '24px', 
                        fontWeight: '900', 
                        color: '#1e1b4b',
                        letterSpacing: '-0.02em'
                    }}>
                        {title}
                    </h2>
                </div>

                {/* Message */}
                <p style={{ 
                    textAlign: 'center', 
                    color: '#64748b', 
                    fontSize: '16px', 
                    lineHeight: '1.6',
                    margin: '0 0 32px 0'
                }}>
                    {message}
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <Button 
                        onClick={onClose}
                        variant="outline"
                        style={{ 
                            flex: 1, 
                            height: '54px', 
                            borderRadius: '16px',
                            borderColor: '#e2e8f0',
                            color: '#64748b',
                            fontSize: '15px',
                            fontWeight: '800'
                        }}
                    >
                        {cancelText}
                    </Button>
                    <Button 
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        style={{ 
                            flex: 1, 
                            height: '54px', 
                            borderRadius: '16px',
                            background: theme.button,
                            color: '#fff',
                            fontSize: '15px',
                            fontWeight: '800',
                            boxShadow: `0 10px 15px -3px ${theme.shadow}`
                        }}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
