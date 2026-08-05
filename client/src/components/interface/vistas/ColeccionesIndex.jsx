import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCollections, getImageUrl } from '../../../lib/api/endpoints';
import { Sparkles, Layers, Flame, Star, Shuffle, ArrowRight } from 'lucide-react';

const SMART_COLLECTIONS = [
    {
        slug: 'smart_latest',
        name: 'Recién Llegados (Novedades)',
        description: 'Las últimas tendencias y piezas añadidas a nuestro catálogo.',
        icon: <Sparkles size={24} color="#8f0653" />,
        background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)'
    },
    {
        slug: 'smart_best_sellers',
        name: 'Los Más Vendidos (Top Ventas)',
        description: 'Nuestras piezas más populares y amadas por nuestras clientas.',
        icon: <Flame size={24} color="#ea580c" />,
        background: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)'
    },
    {
        slug: 'smart_random',
        name: 'Descubre Algo Nuevo (Aleatorio)',
        description: 'Déjate sorprender por una selección curada aleatoria.',
        icon: <Shuffle size={24} color="#0284c7" />,
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'
    }
];

const ColeccionesIndex = () => {
    const navigate = useNavigate();
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCollections = async () => {
            try {
                const data = await getCollections();
                // Filtramos solo las colecciones activas si corresponde
                setCollections(data.filter(c => c.is_active));
            } catch (err) {
                console.error("Error cargando colecciones:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchCollections();
    }, []);

    return (
        <div className="collections-index-view fade-in">
            {/* Hero Section */}
            <header className="collections-hero">
                <div className="collections-hero-content">
                    <div className="collections-hero-badge">
                        <Layers size={14} />
                        <span>COLECCIONES</span>
                    </div>
                    <h1 className="collections-hero-title">Nuestras Curadurías</h1>
                    <p className="collections-hero-desc">
                        Explora selecciones exclusivas pensadas especialmente para ti. Descubre lo más nuevo, lo más buscado o inspírate con nuestras colecciones temáticas.
                    </p>
                </div>
            </header>

            <main className="container">
                {/* User Collections Grid */}
                {collections.length > 0 && (
                    <section className="collections-section">
                        <div className="collections-section-header">
                            <h2 className="collections-section-title">Temporadas & Exclusivos</h2>
                            <div className="collections-section-line" />
                        </div>
                        <div className="collections-grid user-collections">
                            {collections.map(c => (
                                <div 
                                    key={c.id} 
                                    className="collection-card user-card"
                                    onClick={() => navigate(`/coleccion/${c.slug}`)}
                                >
                                    <div className="card-image-box">
                                        {c.image_url ? (
                                            <img src={getImageUrl(c.image_url)} alt={c.name} />
                                        ) : (
                                            <div className="no-image-placeholder">
                                                <Layers size={32} color="#cbd5e1" />
                                            </div>
                                        )}
                                        <div className="card-overlay" />
                                    </div>
                                    <div className="card-info">
                                        <h3 className="card-title">{c.name}</h3>
                                        {c.description && <p className="card-desc">{c.description}</p>}
                                        <div className="card-action">
                                            Explorar colección <ArrowRight size={16} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Smart Collections Grid */}
                <section className="collections-section">
                    <div className="collections-section-header">
                        <h2 className="collections-section-title">Colecciones Destacadas</h2>
                        <div className="collections-section-line" />
                    </div>
                    <div className="collections-grid">
                        {SMART_COLLECTIONS.map(sc => (
                            <div 
                                key={sc.slug} 
                                className="collection-card smart-card"
                                onClick={() => navigate(`/coleccion/${sc.slug}`)}
                                style={{ background: sc.background }}
                            >
                                <div className="card-icon-wrapper">
                                    {sc.icon}
                                </div>
                                <div className="card-content">
                                    <h3 className="card-title">{sc.name}</h3>
                                    <p className="card-desc">{sc.description}</p>
                                    <div className="card-action">
                                        Explorar colección <ArrowRight size={16} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </main>


        </div>
    );
};

export default ColeccionesIndex;
