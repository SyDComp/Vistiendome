import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import CMSRenderer from '../cms/CMSRenderer';
import { useWebSocket } from '../../../context/WebSocketContext';
import PremiumLoader from '../../ui/PremiumLoader';
import { useScrollLock } from '../../../hooks/useScrollLock';
import { ChevronRight, X, ArrowLeft } from 'lucide-react';
import './AtencionCliente.css';

const HELP_API = '/api/v1/homepage/help/sections';

const AtencionCliente = ({ initialSection = 'tallas' }) => {
    const location = useLocation();
    const [sections, setSections] = useState([]);
    const [activeSection, setActiveSection] = useState(initialSection);
    const [loading, setLoading] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    // Modal para móvil
    const [modalSection, setModalSection] = useState(null); // { slug, title, icon }
    const { lastMessage } = useWebSocket();

    useScrollLock(!!modalSection);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchSections = useCallback(async () => {
        try {
            const res = await fetch(HELP_API);
            const data = await res.json();
            setSections(data);
            if (data.length > 0 && !data.find(s => s.slug === activeSection)) {
                setActiveSection(data[0].slug);
            }
        } catch (err) {
            console.error("Error fetching help sections:", err);
        } finally {
            setLoading(false);
        }
    }, [activeSection]);

    useEffect(() => {
        fetchSections();
    }, [fetchSections]);

    useEffect(() => {
        if (lastMessage?.type === 'invalidate_cache' && lastMessage.resource === 'help_sections') {
            fetchSections();
        }
    }, [lastMessage, fetchSections]);

    useEffect(() => {
        if (location.state?.section) {
            setActiveSection(location.state.section);
            window.scrollTo({ top: 0, behavior: 'auto' });
        }
    }, [location.state]);

    const openModal = (sec) => setModalSection(sec);
    const closeModal = () => setModalSection(null);

    if (loading) {
        return <PremiumLoader text="Cargando centro de ayuda..." />;
    }

    return (
        <div className="atencion-hub-view">
            {/* Hero compacto */}
            <div className="ayuda-hero">
                <div className="container">
                    <span className="subtitle">Atención al Cliente</span>
                    <h1>¿Cómo podemos ayudarte hoy?</h1>
                </div>
            </div>

            {/* MÓVIL: Lista de tarjetas → abre modal */}
            {isMobile ? (
                <div className="container ayuda-cards-list">
                    {sections.map(sec => (
                        <button
                            key={sec.id}
                            className="ayuda-card-item"
                            onClick={() => openModal(sec)}
                        >
                            <span className="ayuda-card-icon">{sec.icon}</span>
                            <span className="ayuda-card-title">{sec.title}</span>
                            <ChevronRight size={18} className="ayuda-card-arrow" />
                        </button>
                    ))}
                </div>
            ) : (
                /* ESCRITORIO: Layout sidebar + contenido */
                <div className="container ayuda-layout">
                    <aside className="ayuda-sidebar">
                        <nav>
                            {sections.map(sec => (
                                <button
                                    key={sec.id}
                                    className={`ayuda-nav-btn ${activeSection === sec.slug ? 'active' : ''}`}
                                    onClick={() => setActiveSection(sec.slug)}
                                >
                                    <span className="icon">{sec.icon}</span>
                                    <span className="title">{sec.title}</span>
                                </button>
                            ))}
                        </nav>
                    </aside>

                    <main className="ayuda-main fade-in">
                        <div className="ayuda-content">
                            <CMSRenderer page={activeSection} />
                        </div>
                    </main>
                </div>
            )}

            {/* MODAL FULLSCREEN — solo en móvil */}
            {modalSection && (
                <div className="ayuda-modal-overlay" onClick={closeModal}>
                    <div
                        className="ayuda-modal-panel fade-in"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header del modal */}
                        <div className="ayuda-modal-header">
                            <button className="ayuda-modal-back" onClick={closeModal}>
                                <ArrowLeft size={20} />
                            </button>
                            <div className="ayuda-modal-title-row">
                                <span className="ayuda-modal-icon">{modalSection.icon}</span>
                                <h2 className="ayuda-modal-title">{modalSection.title}</h2>
                            </div>
                            <button className="ayuda-modal-close" onClick={closeModal}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Contenido */}
                        <div className="ayuda-modal-body">
                            <div className="ayuda-modal-cms-wrap">
                                <CMSRenderer page={modalSection.slug} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AtencionCliente;
