import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import './WhatsAppFAB.css';

// Botón flotante persistente para escribir por WhatsApp desde cualquier página pública.
// Si aún no hay un número configurado no se muestra: un botón que no lleva a
// ningún lado es una acción imposible, no un estado de carga.
const WhatsAppFAB = () => {
    const { settings } = useSettings();
    const rawPhone = settings?.social_links?.whatsapp;
    const phone = rawPhone ? rawPhone.replace(/\D/g, '') : '';

    if (!phone) return null;

    return (
        <a
            className="whatsapp-fab"
            href={`https://wa.me/${phone}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Escríbenos por WhatsApp"
            title="Escríbenos por WhatsApp"
        >
            <MessageCircle size={28} strokeWidth={2} fill="currentColor" />
        </a>
    );
};

export default WhatsAppFAB;
