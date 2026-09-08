import React, { useState, useEffect } from 'react';
import { getCollections, getImageUrl, getSrcSet } from '../../../lib/api/endpoints';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../../context/WebSocketContext';
import './FeaturedCollections.css';

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
                                    <img src={getImageUrl(coll.image_url)} srcSet={getSrcSet(coll.image_srcset) || undefined}
                                         sizes="(max-width: 768px) 100vw, 400px" loading="lazy" decoding="async"
                                         alt="" className="card-image-blur" aria-hidden="true" />
                                    <img src={getImageUrl(coll.image_url)} srcSet={getSrcSet(coll.image_srcset) || undefined}
                                         sizes="(max-width: 768px) 100vw, 400px" loading="lazy" decoding="async"
                                         alt={coll.name} className="card-image" />
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

        </section>
    );
};

export default FeaturedCollections;
