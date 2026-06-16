import React, { useState, useEffect } from 'react';
import Button from '../atoms/Button';
import './HelpModal.css';

/**
 * A reusable modal to display warnings, tips, or critical information to the user.
 * It intercept flows and allows the user to opt-out of seeing the message again.
 * 
 * @param {boolean} isOpen - Controls modal visibility
 * @param {string} title - Modal header title
 * @param {React.ReactNode} message - Modal body content
 * @param {string} type - 'info' | 'warning' | 'danger'
 * @param {string} storageKey - localStorage key to save "Don't show again" preference
 * @param {Function} onConfirm - Callback when user clicks accept/continue
 * @param {Function} onCancel - Callback when user clicks cancel/close
 * @param {string} confirmText - Custom text for confirm button
 * @param {string} cancelText - Custom text for cancel button
 */
export default function HelpModal({
    isOpen,
    title,
    message,
    type = 'info',
    storageKey,
    onConfirm,
    onCancel,
    confirmText = 'Entendido, continuar',
    cancelText = 'Cancelar'
}) {
    const [dontShowAgain, setDontShowAgain] = useState(false);

    // Reset checkbox when modal opens
    useEffect(() => {
        if (isOpen) {
            setDontShowAgain(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (dontShowAgain && storageKey) {
            localStorage.setItem(storageKey, 'true');
        }
        if (onConfirm) onConfirm();
    };

    // Determine styles based on type
    const getVariantStyles = () => {
        switch (type) {
            case 'warning':
                return {
                    icon: '⚠️',
                    className: 'help-modal-warning',
                    buttonVariant: 'primary' // We can use primary, but CSS will style it orange
                };
            case 'danger':
                return {
                    icon: '🚨',
                    className: 'help-modal-danger',
                    buttonVariant: 'danger' // Assuming Button component has a danger variant or we style it
                };
            case 'info':
            default:
                return {
                    icon: '💡',
                    className: 'help-modal-info',
                    buttonVariant: 'primary'
                };
        }
    };

    const variant = getVariantStyles();

    return (
        <div className="help-modal-overlay">
            <div className={`help-modal-content ${variant.className}`}>
                <div className="help-modal-header">
                    <span className="help-modal-icon">{variant.icon}</span>
                    <h3 className="help-modal-title">{title}</h3>
                </div>

                <div className="help-modal-body">
                    {typeof message === 'string' ? <p>{message}</p> : message}
                </div>

                {storageKey && (
                    <div className="help-modal-checkbox">
                        <label>
                            <input
                                type="checkbox"
                                checked={dontShowAgain}
                                onChange={(e) => setDontShowAgain(e.target.checked)}
                            />
                            <span>No volver a mostrar este mensaje</span>
                        </label>
                    </div>
                )}

                <div className="help-modal-footer">
                    {onCancel && (
                        <Button variant="secondary" onClick={onCancel}>
                            {cancelText}
                        </Button>
                    )}
                    <Button
                        variant={variant.buttonVariant}
                        onClick={handleConfirm}
                        className={`help-btn-${type}`}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
}
