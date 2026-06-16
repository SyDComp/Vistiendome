import React, { useState } from 'react';
import './EmailActionDialog.css';

const EmailActionDialog = ({ email, onClose, showContactLink = true }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(email);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleOpenMail = () => {
        window.location.href = `mailto:${email}`;
        onClose();
    };

    const handleGmail = () => {
        window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${email}`, '_blank', 'noopener,noreferrer');
        onClose();
    };

    const handleOutlook = () => {
        window.open(`https://outlook.live.com/mail/0/deeplink/compose?to=${email}`, '_blank', 'noopener,noreferrer');
        onClose();
    };

    return (
        <div className="email-dialog-overlay" onClick={onClose}>
            <div className="email-dialog" onClick={e => e.stopPropagation()}>
                <div className="email-dialog-header">
                    <h4>Contacto vía Email</h4>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>
                
                <div className="email-display">
                    <code>{email}</code>
                </div>

                <div className="email-actions-grid">
                    <button className="action-btn copy-btn" onClick={handleCopy}>
                        {copied ? '¡Copiado!' : '📋 Copiar Email'}
                    </button>
                    
                    <button className="action-btn gmail-btn" onClick={handleGmail}>
                        📧 Abrir en Gmail
                    </button>
                    
                    <button className="action-btn outlook-btn" onClick={handleOutlook}>
                        💻 Abrir en Outlook
                    </button>
                    
                    <button className="action-btn open-btn" onClick={handleOpenMail}>
                        ⚙️ Aplicación Predeterminada
                    </button>
                    
                    {showContactLink && (
                        <a href="/contacto" className="action-btn form-btn" onClick={onClose}>
                            📝 Ir al Formulario
                        </a>
                    )}
                </div>
                
                <p className="email-dialog-footer">
                    Selecciona cómo deseas contactar.
                </p>
            </div>
        </div>
    );
};

export default EmailActionDialog;
