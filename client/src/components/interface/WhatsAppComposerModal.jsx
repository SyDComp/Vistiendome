import React, { useState } from 'react';
import { X, Send } from 'lucide-react';
import { buildWhatsAppMessage, openWhatsApp } from '../../utils/cartUtils';
import { useScrollLock } from '../../hooks/useScrollLock';
import './WhatsAppComposerModal.css';

// Compone un mensaje libre y lo envía por WhatsApp, con la misma apertura
// robusta (iOS/Android) y el mismo formato que usa el resto del sitio.
const WhatsAppComposerModal = ({ phone, onClose }) => {
    const [texto, setTexto] = useState('');
    useScrollLock(true);

    const enviar = () => {
        const mensaje = texto.trim();
        if (!mensaje) return;
        const whatsappMsg = buildWhatsAppMessage({ tipo: 'flotante', mensaje });
        openWhatsApp(phone, whatsappMsg);
        onClose();
    };

    return (
        <div className="wa-composer-overlay" onClick={onClose}>
            <div className="wa-composer-card" onClick={(e) => e.stopPropagation()}>
                <div className="wa-composer-header">
                    <h3>Escríbenos por WhatsApp</h3>
                    <button className="wa-composer-close" onClick={onClose} aria-label="Cerrar">
                        <X size={20} />
                    </button>
                </div>

                <label htmlFor="wa-composer-text" className="wa-composer-label">
                    Tu mensaje
                </label>
                <textarea
                    id="wa-composer-text"
                    className="wa-composer-textarea"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder="Ej: Hola, quisiera saber si tienen el vestido Noemí en talla M..."
                    autoFocus
                />

                <button
                    className="wa-composer-send"
                    onClick={enviar}
                    disabled={!texto.trim()}
                >
                    <Send size={18} />
                    Enviar por WhatsApp
                </button>
            </div>
        </div>
    );
};

export default WhatsAppComposerModal;
