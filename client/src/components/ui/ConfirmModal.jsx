import React, { useEffect, useState } from 'react';
import { AlertCircle, X, Check, HelpCircle } from 'lucide-react';
import Button from './Button';
import { useScrollLock } from '../../hooks/useScrollLock';
import './ConfirmModal.css';

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
        <div className="confirmar-overlay" style={{ opacity: isVisible ? 1 : 0, pointerEvents: isVisible ? 'auto' : 'none' }}>
            {/* Backdrop */}
            <div 
                onClick={onClose}
                className="confirmar-fondo" 
            />

            {/* Modal Card */}
            <div className="confirmar-tarjeta" style={{ transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)' }}>
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="confirmar-cerrar"
                >
                    <X size={18} />
                </button>

                {/* Header with Icon */}
                <div className="adm-confirmar-texto">
                    <div className="confirmar-emblema" style={{ background: theme.bg }}>
                        {theme.icon}
                    </div>
                    <h2 className="confirmar-titulo">
                        {title}
                    </h2>
                </div>

                {/* Message */}
                <p className="confirmar-mensaje">
                    {message}
                </p>

                {/* Actions */}
                <div className="adm-confirmar-botones">
                    <Button 
                        onClick={onClose}
                        variant="outline"
                        className="adm-accion-clara"
                    >
                        {cancelText}
                    </Button>
                    <Button 
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="cm-boton-confirmar"
                        style={{ '--tono': theme.button, '--sombra': theme.shadow }}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
