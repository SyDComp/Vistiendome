import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Button from '../atoms/Button';
import './Modal.css';

const Modal = ({ isOpen, onClose, title, children, footer }) => {
    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            return () => {
                // Short timeout to prevent scroll reset when switching between modals rapidly
                setTimeout(() => {
                    const modalsOpen = document.querySelectorAll('.g-modal-overlay, .modal-overlay, .cart-drawer-overlay, .help-modal-overlay, .confirm-modal-overlay, .rich-text-modal-overlay, .gallery-selector-modal-overlay, .external-sale-modal-overlay');
                    if (modalsOpen.length === 0) {
                        document.body.style.overflow = '';
                        document.body.style.paddingRight = '';
                    }
                }, 10);
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="g-modal-overlay" onClick={onClose}>
            <div
                className="g-modal-container"
                onClick={e => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
            >
                <div className="g-modal-header">
                    <h3 id="modal-title">{title}</h3>
                    <button className="g-modal-close-btn" onClick={onClose} aria-label="Cerrar">
                        &times;
                    </button>
                </div>

                <div className="g-modal-body">
                    {children}
                </div>

                {footer && (
                    <div className="g-modal-footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default Modal;
