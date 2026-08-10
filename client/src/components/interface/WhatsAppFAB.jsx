import React, { useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import WhatsAppComposerModal from './WhatsAppComposerModal';
import './WhatsAppFAB.css';

// Glifo oficial de WhatsApp (icono de marca, uso estándar para botones "chatea con nosotros").
const WhatsAppIcon = () => (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.2 4.74 1.2h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.64-1.03-5.13-2.9-7C17.18 3.03 14.68 2 12.04 2m0 1.67c2.2 0 4.26.86 5.82 2.42a8.192 8.192 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23-1.48 0-2.93-.4-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.32a8.15 8.15 0 0 1-1.25-4.36c0-4.54 3.7-8.25 8.24-8.25m-3.51 3.66c-.16 0-.43.06-.66.31s-.87.85-.87 2.07 0 2.4 1 3.62c1 1.2 2.63 3.7 5.12 4.76.59.27 1.05.42 1.41.53.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.07-.1-.23-.16-.48-.28-.25-.14-1.47-.74-1.69-.82-.23-.08-.37-.12-.56.12-.16.25-.64.81-.78.97-.15.17-.29.19-.53.07-.26-.13-1.06-.39-2-1.23-.74-.66-1.23-1.47-1.38-1.72-.12-.24-.01-.38.11-.49.11-.11.25-.29.35-.44.13-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.11-.56-1.35-.77-1.84-.2-.48-.4-.42-.56-.43z" />
    </svg>
);

// Botón flotante persistente para escribir por WhatsApp desde cualquier página pública.
// Si aún no hay un número configurado no se muestra: un botón que no lleva a
// ningún lado es una acción imposible, no un estado de carga.
const WhatsAppFAB = () => {
    const { settings } = useSettings();
    const rawPhone = settings?.social_links?.whatsapp;
    const phone = rawPhone ? rawPhone.replace(/\D/g, '') : '';
    const [open, setOpen] = useState(false);

    if (!phone) return null;

    return (
        <>
            <button
                type="button"
                className="whatsapp-fab"
                onClick={() => setOpen(true)}
                aria-label="Escríbenos por WhatsApp"
                title="Escríbenos por WhatsApp"
            >
                <WhatsAppIcon />
            </button>
            {open && <WhatsAppComposerModal phone={phone} onClose={() => setOpen(false)} />}
        </>
    );
};

export default WhatsAppFAB;
