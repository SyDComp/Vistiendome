import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { getImageUrl } from '../../lib/api/endpoints/images.api';
import { isDarkColor } from '../../utils/colorContrast';
import { useScrollLock } from '../../hooks/useScrollLock';
import './WelcomeModal.css';

const STORAGE_KEY = 'vdm_welcome_modal';

// Firma simple del contenido: si el admin cambia el modal, vuelve a mostrarse
const signature = (cfg) =>
    [cfg.title, cfg.body, cfg.image_url, cfg.button_text, cfg.button_link, cfg.frequency,
     cfg.title_color, cfg.body_color, cfg.bg_color, cfg.button_bg_color, cfg.button_text_color]
        .join('|');

const todayStr = () => new Date().toISOString().slice(0, 10);

const shouldShow = (cfg) => {
    if (!cfg || !cfg.active) return false;
    if (!cfg.title && !cfg.body && !cfg.image_url) return false;

    const freq = cfg.frequency || 'session';
    if (freq === 'always') return true;

    const sig = signature(cfg);
    try {
        const store = freq === 'day' ? window.localStorage : window.sessionStorage;
        const raw = store.getItem(STORAGE_KEY);
        if (!raw) return true;
        const saved = JSON.parse(raw);
        // Si cambió el contenido, se muestra de nuevo
        if (saved.sig !== sig) return true;
        // 'day': mostrar si es un día distinto
        if (freq === 'day') return saved.date !== todayStr();
        // 'session': ya visto en esta sesión
        return false;
    } catch {
        return true;
    }
};

const markSeen = (cfg) => {
    const freq = cfg.frequency || 'session';
    if (freq === 'always') return;
    try {
        const store = freq === 'day' ? window.localStorage : window.sessionStorage;
        store.setItem(STORAGE_KEY, JSON.stringify({ sig: signature(cfg), date: todayStr() }));
    } catch {
        /* almacenamiento no disponible: no bloquea la navegación */
    }
};

const WelcomeModal = () => {
    const { settings } = useSettings();
    const navigate = useNavigate();
    const location = useLocation();
    const cfg = settings?.welcome_modal;
    const [open, setOpen] = useState(false);

    // Un modal de bienvenida sobre una ficha de producto interrumpe justo a la
    // clienta que llegó por un link directo (el canal principal es WhatsApp).
    // Además tapa el selector de tallas, que tiene un z-index menor.
    // La promoción se muestra cuando está navegando, no cuando ya eligió qué ver.
    const enFichaDeProducto = location.pathname.includes('/producto/');

    useScrollLock(open);

    useEffect(() => {
        if (enFichaDeProducto) {
            setOpen(false);
            return;
        }
        if (shouldShow(cfg)) {
            const t = setTimeout(() => setOpen(true), 600);
            return () => clearTimeout(t);
        }
    }, [cfg, enFichaDeProducto]);

    if (!open || !cfg) return null;

    const close = () => {
        markSeen(cfg);
        setOpen(false);
    };

    const onCtaClick = () => {
        markSeen(cfg);
        setOpen(false);
        if (cfg.button_link) {
            if (/^https?:\/\//i.test(cfg.button_link)) {
                window.open(cfg.button_link, '_blank');
            } else {
                // Interno: navegación SPA (sin recargar la página, así el modal no reaparece)
                navigate(cfg.button_link);
            }
        }
    };

    const imageSrc = cfg.image_url ? getImageUrl(cfg.image_url) : null;

    const bg = cfg.bg_color || '#ffffff';
    const darkBg = isDarkColor(bg);
    // La X se adapta al fondo del modal para mantener contraste
    const closeColor = darkBg ? '#ffffff' : '#1e293b';
    const closeBg = darkBg ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.85)';

    const imageFit = cfg.image_fit || 'cover';
    const imagePos = cfg.image_position === 'top' ? 'top center' : cfg.image_position === 'bottom' ? 'bottom center' : 'center center';
    const imageMaxHeight = cfg.image_max_height || '280px';

    return (
        <div className="welcome-modal-overlay" onClick={close}>
            <div className="welcome-modal" onClick={(e) => e.stopPropagation()} style={{ background: bg }}>
                <button
                    className="welcome-modal__close"
                    onClick={close}
                    aria-label="Cerrar"
                    style={{ color: closeColor, background: closeBg }}
                >
                    <X size={20} />
                </button>

                {imageSrc && (
                    <div 
                        className="welcome-modal__image"
                        style={{
                            maxHeight: imageMaxHeight,
                            background: imageFit === 'contain' ? bg : '#f1f5f9',
                            display: imageFit === 'contain' ? 'flex' : 'block',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <img 
                            src={imageSrc} 
                            alt={cfg.title || 'Bienvenida'}
                            style={{
                                objectFit: imageFit,
                                objectPosition: imagePos,
                                width: '100%',
                                height: imageFit === 'contain' ? 'auto' : '100%',
                                maxHeight: imageMaxHeight
                            }}
                        />
                    </div>
                )}

                <div className="welcome-modal__body">
                    {cfg.title && (
                        <h2 className="welcome-modal__title" style={cfg.title_color ? { color: cfg.title_color } : undefined}>
                            {cfg.title}
                        </h2>
                    )}
                    {cfg.body && (
                        <p className="welcome-modal__text" style={cfg.body_color ? { color: cfg.body_color } : undefined}>
                            {cfg.body}
                        </p>
                    )}
                    {cfg.button_text && (
                        <button
                            className="welcome-modal__cta"
                            onClick={onCtaClick}
                            style={{
                                background: cfg.button_bg_color || '#8f0653',
                                color: cfg.button_text_color || '#ffffff'
                            }}
                        >
                            {cfg.button_text}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;
