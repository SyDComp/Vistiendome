import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import CMSRenderer from '../cms/CMSRenderer';
import { useWebSocket } from '../../../context/WebSocketContext';
import PremiumLoader from '../../ui/PremiumLoader';
import { useScrollLock } from '../../../hooks/useScrollLock';
import { ChevronRight, X, ArrowLeft } from 'lucide-react';

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

            <style>{`
                /* Hero compacto */
                .ayuda-hero {
                    padding: 2.5rem 0 2rem;
                    text-align: center;
                    background-color: #fbfbfb;
                    margin-bottom: 1.5rem;
                }
                .ayuda-hero h1 {
                    font-size: 1.8rem;
                    margin-top: 4px;
                }

                /* Lista de tarjetas móvil */
                .ayuda-cards-list {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    padding-bottom: 3rem;
                }

                .ayuda-card-item {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    background: white;
                    border: 1px solid #e8e8e8;
                    border-radius: 16px;
                    padding: 18px 20px;
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.2s ease;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.03);
                }

                .ayuda-card-item:active {
                    transform: scale(0.98);
                    background: #fdf2f8;
                    border-color: #d1a3d4;
                }

                .ayuda-card-icon {
                    font-size: 1.5rem;
                    flex-shrink: 0;
                }

                .ayuda-card-title {
                    flex: 1;
                    font-weight: 700;
                    font-size: 1rem;
                    color: #1e1b4b;
                }

                .ayuda-card-arrow {
                    color: #94a3b8;
                    flex-shrink: 0;
                }

                /* Modal fullscreen */
                .ayuda-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(0, 0, 0, 0.4);
                    z-index: 9000;
                    display: flex;
                    align-items: flex-end;
                }

                .ayuda-modal-panel {
                    width: 100%;
                    height: 92vh;
                    background: white;
                    border-radius: 24px 24px 0 0;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .ayuda-modal-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px 20px;
                    border-bottom: 1px solid #f1f5f9;
                    flex-shrink: 0;
                    background: white;
                }

                .ayuda-modal-back {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #475569;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    flex-shrink: 0;
                }

                .ayuda-modal-title-row {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    min-width: 0;
                }

                .ayuda-modal-icon {
                    font-size: 1.2rem;
                    flex-shrink: 0;
                }

                .ayuda-modal-title {
                    font-size: 1rem;
                    font-weight: 800;
                    color: #1e1b4b;
                    margin: 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .ayuda-modal-close {
                    background: #f1f5f9;
                    border: none;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #475569;
                    flex-shrink: 0;
                }

                .ayuda-modal-body {
                    flex: 1;
                    overflow-y: auto;
                    overflow-x: hidden;
                    padding: 20px;
                    -webkit-overflow-scrolling: touch;
                }

                /* Contenedor principal del modal */
                .ayuda-modal-cms-wrap {
                    width: 100%;
                    overflow-x: hidden;
                }
            `}</style>
        </div>
    );
};

export default AtencionCliente;
