import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../../context/SettingsContext';
import { isDarkColor } from '../../utils/colorContrast';
import './TopBanner.css';

const STORAGE_KEY = 'vdm_top_banner';

const todayStr = () => new Date().toISOString().slice(0, 10);

const signature = (cfg) =>
    [cfg.text, cfg.bg_color, cfg.text_color, cfg.link, cfg.link_label, cfg.frequency].join('|');

const shouldShow = (cfg) => {
    if (!cfg || !cfg.active || !cfg.text) return false;
    const freq = cfg.frequency || 'session';
    if (freq === 'always') return true;
    const sig = signature(cfg);
    try {
        const store = freq === 'day' ? window.localStorage : window.sessionStorage;
        const raw = store.getItem(STORAGE_KEY);
        if (!raw) return true;
        const saved = JSON.parse(raw);
        if (saved.sig !== sig) return true;        // cambió el contenido => re-mostrar
        if (freq === 'day') return saved.date !== todayStr();
        return false;                              // 'session': ya visto
    } catch {
        return true;
    }
};

const TopBanner = () => {
    const { settings } = useSettings();
    const navigate = useNavigate();
    const cfg = settings?.top_banner;
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const show = shouldShow(cfg);
        setVisible(show);
        if (show) {
            document.body.classList.add('has-top-banner');
        } else {
            document.body.classList.remove('has-top-banner');
        }
        return () => document.body.classList.remove('has-top-banner');
    }, [cfg]);

    // --- Marquee: medir para repetir el texto hasta llenar la barra (bucle continuo sin huecos) ---
    const marqueeRef = useRef(null);
    const chunkRef = useRef(null);
    const [copies, setCopies] = useState(6);

    useEffect(() => {
        if (!visible || !cfg?.animated || cfg?.repeat === false) return;
        const recompute = () => {
            const cont = marqueeRef.current?.offsetWidth || 0;
            const chunk = chunkRef.current?.offsetWidth || 0;
            if (cont > 0 && chunk > 0) {
                setCopies(Math.max(2, Math.ceil(cont / chunk) + 1));
            }
        };
        recompute();
        window.addEventListener('resize', recompute);
        return () => window.removeEventListener('resize', recompute);
    }, [visible, cfg?.animated, cfg?.text, cfg?.link, cfg?.link_label]);

    if (!visible || !cfg) return null;

    const close = (e) => {
        if (e) e.stopPropagation();
        const freq = cfg.frequency || 'session';
        if (freq !== 'always') {
            try {
                const store = freq === 'day' ? window.localStorage : window.sessionStorage;
                store.setItem(STORAGE_KEY, JSON.stringify({ sig: signature(cfg), date: todayStr() }));
            } catch { /* no bloquea */ }
        }
        document.body.classList.remove('has-top-banner');
        setVisible(false);
    };

    const bg = cfg.bg_color || '#8f0653';
    const textColor = cfg.text_color || (isDarkColor(bg) ? '#ffffff' : '#1e293b');

    const animated = !!cfg.animated;
    const speed = Number(cfg.speed) > 0 ? Number(cfg.speed) : 20;
    const reverse = cfg.direction === 'right';
    const repeatText = cfg.repeat !== false;

    // --- Enlace opcional ---
    const link = cfg.link || '';
    const hasLink = !!link;
    const isExternal = /^https?:\/\//i.test(link);
    // Etiqueta a mostrar: apodo si existe; si no, una etiqueta amigable (no la ruta cruda interna)
    const PAGE_NAMES = {
        '/': 'Inicio', '/catalogo': 'Catálogo', '/explorador': 'Explorador',
        '/colecciones': 'Colecciones', '/nosotros': 'Nosotros', '/contacto': 'Contacto', '/ayuda': 'Atención al Cliente',
    };
    const friendly = isExternal ? link : (PAGE_NAMES[link] || 'Ver más');
    const linkLabel = cfg.link_label || friendly;
    const followLink = () => {
        if (!hasLink) return;
        if (isExternal) window.open(link, '_blank', 'noopener');
        else navigate(link);
    };
    // En modo animado el apodo viaja dentro del texto (toda la barra es clickeable)
    const chunkText = hasLink && linkLabel ? `${cfg.text}   ➜ ${linkLabel}` : cfg.text;

    return (
        <div
            className="top-banner"
            style={{ background: bg, color: textColor, cursor: hasLink ? 'pointer' : 'default' }}
            onClick={hasLink ? followLink : undefined}
            role={hasLink ? 'link' : undefined}
        >
            {animated ? (
                <div className="top-banner__marquee" ref={marqueeRef}>
                    {repeatText ? (
                        <>
                            <span ref={chunkRef} className="top-banner__chunk top-banner__chunk--measure">{chunkText}</span>
                            <div
                                className="top-banner__track"
                                style={{ animationDuration: `${speed}s`, animationDirection: reverse ? 'reverse' : 'normal' }}
                            >
                                {Array.from({ length: copies * 2 }).map((_, i) => (
                                    <span key={i} className="top-banner__chunk" aria-hidden={i !== 0}>{chunkText}</span>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div
                            className="top-banner__track top-banner__track--single"
                            style={{ animationDuration: `${speed}s`, animationDirection: reverse ? 'reverse' : 'normal' }}
                        >
                            <span className="top-banner__chunk">{chunkText}</span>
                        </div>
                    )}
                </div>
            ) : (
                <span className="top-banner__text">
                    {cfg.text}
                    {hasLink && (
                        <span style={{ textDecoration: 'underline', fontWeight: 700, marginLeft: '8px' }}>
                            {linkLabel}
                        </span>
                    )}
                </span>
            )}
            <button
                className="top-banner__close"
                onClick={close}
                aria-label="Cerrar anuncio"
                style={{ color: textColor }}
            >
                <X size={16} />
            </button>
        </div>
    );
};

export default TopBanner;
