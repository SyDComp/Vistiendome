import React from 'react';
import { createPortal } from 'react-dom';
import Button from '../atoms/Button';
import './ConfirmModal.css';

const ConfirmModal = ({
    isOpen,
    onClose,
    onConfirm,
    onCancel,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger'
}) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
    };

    const handleCancel = () => {
        if (onCancel) onCancel();
    };

    return createPortal(
        <div className="confirm-modal-overlay" onClick={handleCancel}>
            <div className="confirm-modal-container" onClick={e => e.stopPropagation()}>
                <div className="confirm-modal-header">
                    <h3>{title}</h3>
                </div>
                <div className="confirm-modal-body">
                    <p>{message}</p>
                </div>
                <div className="confirm-modal-footer">
                    <Button variant="secondary" onClick={handleCancel}>
                        {cancelText}
                    </Button>
                    <Button variant={variant} onClick={handleConfirm}>
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmModal;
