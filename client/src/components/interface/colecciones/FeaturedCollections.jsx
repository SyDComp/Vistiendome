import React, { useState, useEffect } from 'react';
import { getCollections, getImageUrl } from '../../../lib/api/endpoints';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../../context/WebSocketContext';

const FeaturedCollections = () => {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const { lastMessage } = useWebSocket();
    const navigate = useNavigate();

    const fetchColls = async () => {
        try {
            console.log("🔍 FeaturedCollections: Solicitando colecciones...");
            const data = await getCollections();
            console.log("📦 FeaturedCollections: Colecciones recibidas:", data);
            
            if (!Array.isArray(data)) {
                console.error("❌ Error: La API de colecciones no devolvió un array.");
                return;
            }
            // Mostramos máximo 3 en el inicio para mantener el impacto
            setCollections(data.slice(0, 3));
        } catch (err) {
            console.error("❌ Error fetching featured collections:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchColls();
    }, []);

    // Escucha de WebSockets para refrescar las colecciones destacadas
    useEffect(() => {
        if (lastMessage?.type === 'invalidate_cache' && lastMessage?.resource === 'collections') {
            console.log('✨ FeaturedCollections: Refrescando lista por cambio en Admin...');
            fetchColls();
        }
    }, [lastMessage]);

    if (loading) return <div className="loading-state">Cargando colecciones...</div>;
    if (collections.length === 0) return null; // Dejamos el null por ahora pero los logs nos dirán si llega aquí

    return (
        <section id="featured-collections" className="featured-collections-section">
            <div className="section-header">
                <div className="header-badge">
                    <Sparkles size={14} />
                    <span>CURATED EDITS</span>
                </div>
                <h2 className="section-title">Colecciones Exclusivas</h2>
                <p className="section-subtitle">Selecciones curadas para cada ocasión y estilo.</p>
            </div>

            <div className="collections-grid">
                {collections.map((coll, idx) => (
                    <div 
                        key={coll.id} 
                        id={`collection-${coll.slug}`}
                        className={`collection-card card-variant-${idx % 3}`}
                        onClick={() => navigate(`/coleccion/${coll.slug}`)}
                    >
                        <div className="card-image-container">
                            {coll.image_url ? (
                                <>
                                    <img src={getImageUrl(coll.image_url)} alt="" className="card-image-blur" aria-hidden="true" />
                                    <img src={getImageUrl(coll.image_url)} alt={coll.name} className="card-image" />
                                </>
                            ) : (
                                <div className="card-image-placeholder" />
                            )}
                            <div className="card-overlay" />
                        </div>
                        
                        <div className="card-content">
                            <h3 className="collection-name">{coll.name}</h3>
                            <p className="collection-desc">{coll.description || 'Explora nuestra nueva selección curada.'}</p>
                            <button className="view-collection-btn">
                                Ver Colección <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <style>{`
                .featured-collections-section {
                    padding: 80px 0;
                    margin-top: 40px;
                }

                .section-header {
                    text-align: center;
                    margin-bottom: 50px;
                }

                .header-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: #fdf2f8;
                    color: #8f0653;
                    padding: 6px 16px;
                    border-radius: 100px;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.1em;
                    margin-bottom: 16px;
                }

                .section-title {
                    font-size: 38px;
                    font-weight: 900;
                    color: #1e1b4b;
                    margin: 0 0 12px 0;
                    letter-spacing: -0.02em;
                }

                .section-subtitle {
                    color: #64748b;
                    font-size: 16px;
                    max-width: 600px;
                    margin: 0 auto;
                }

                .collections-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                    gap: 30px;
                    padding: 0 20px;
                }

                .collection-card {
                    position: relative;
                    height: 500px;
                    border-radius: 40px;
                    overflow: hidden;
                    cursor: pointer;
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                }

                .collection-card:hover {
                    transform: translateY(-10px);
                    box-shadow: 0 20px 50px rgba(143, 6, 83, 0.15);
                }

                .card-image-container {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 1;
                    background: #1e1b4b; /* Fondo oscuro de respaldo */
                }

                .card-image-blur {
                    position: absolute;
                    top: -10%;
                    left: -10%;
                    width: 120%;
                    height: 120%;
                    object-fit: cover;
                    filter: blur(20px) brightness(0.6);
                    opacity: 0.5;
                }

                .card-image {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                    z-index: 2;
                    transition: transform 0.8s ease;
                }

                .collection-card:hover .card-image {
                    transform: scale(1.1);
                }

                .card-image-placeholder {
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                }

                .card-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: linear-gradient(to top, rgba(30, 27, 75, 0.9) 0%, rgba(30, 27, 75, 0.2) 50%, rgba(30, 27, 75, 0) 100%);
                    transition: opacity 0.3s;
                }

                .card-content {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    padding: 40px;
                    z-index: 2;
                    color: white;
                }

                .collection-name {
                    font-size: 28px;
                    font-weight: 800;
                    margin: 0 0 10px 0;
                    line-height: 1.2;
                }

                .collection-desc {
                    font-size: 14px;
                    opacity: 0.8;
                    margin: 0 0 25px 0;
                    max-width: 80%;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }

                .view-collection-btn {
                    background: white;
                    color: #1e1b4b;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 100px;
                    font-weight: 700;
                    font-size: 13px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: all 0.3s;
                }

                .collection-card:hover .view-collection-btn {
                    background: #8f0653;
                    color: white;
                }

                @media (max-width: 768px) {
                    .collection-card {
                        height: 400px;
                    }
                    .section-title {
                        font-size: 28px;
                    }
                    .collections-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </section>
    );
};

export default FeaturedCollections;
