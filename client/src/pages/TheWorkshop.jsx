import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import SectionHeader from '../components/atoms/SectionHeader';
import './TheWorkshop.css';

const RenderList = ({ items, style }) => {
    const Tag = style === 'ordered' ? 'ol' : 'ul';
    return (
        <Tag className="workshop-list-block">
            {items.map((item, i) => {
                const content = typeof item === 'string' ? item : item.content;
                const nestedItems = item.items || [];
                return (
                    <li key={i}>
                        <span dangerouslySetInnerHTML={{ __html: content }} />
                        {nestedItems.length > 0 && <RenderList items={nestedItems} style={style} />}
                    </li>
                );
            })}
        </Tag>
    );
};

const BlockRenderer = ({ blocks }) => {
    if (!blocks || !Array.isArray(blocks)) return null;

    return blocks.map((block, index) => {
        switch (block.type) {
            case 'header':
                const Tag = `h${block.data.level}`;
                return <Tag key={index} className="workshop-header-block" dangerouslySetInnerHTML={{ __html: block.data.text }} />;
            case 'paragraph':
                return <p key={index} className="workshop-p-block" dangerouslySetInnerHTML={{ __html: block.data.text }} />;
            case 'list':
                return <RenderList key={index} items={block.data.items} style={block.data.style} />;
            case 'image':
            case 'video': // We'll handle custom types or extensions if Editor.js spits them out like this
                // Fallback to video natively if it detects via extension or custom tool logic
                const isVideo = block.data.file.url.match(/\.(mp4|webm|ogg)$/i) || block.type === 'video';
                if (isVideo) {
                    return (
                        <div key={index} className="workshop-video-block">
                            <video src={block.data.file.url} controls preload="metadata" className="w-full" />
                            {block.data.caption && <figcaption dangerouslySetInnerHTML={{ __html: block.data.caption }} />}
                        </div>
                    );
                } else {
                    return (
                        <div key={index} className="workshop-image-block">
                            <img src={block.data.file.url} alt={block.data.caption || ''} className="w-full" />
                            {block.data.caption && <figcaption dangerouslySetInnerHTML={{ __html: block.data.caption }} />}
                        </div>
                    );
                }
            default:
                console.warn(`Unknown block type: ${block.type}`);
                return null;
        }
    });
};

const TheWorkshop = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const response = await api.get('/workshop');
                setPosts(response.data);
            } catch (error) {
                console.error('Error fetching workshop posts:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPosts();
    }, []);

    // Effect to handle scrolling to hash once posts are loaded
    useEffect(() => {
        if (!loading && location.hash) {
            const id = location.hash.replace('#', '');
            setTimeout(() => {
                const element = document.getElementById(id);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100); // Slight delay to ensure DOM is ready
        }
    }, [loading, location.hash, posts]);

    return (
        <div className="workshop-page-container">
            <SectionHeader 
                title="El Taller"
                subtitle="Donde nace la artesanía. Acompáñanos en nuestro proceso creativo."
            />

            {loading ? (
                <div className="loading-spinner">Cargando publicaciones...</div>
            ) : posts.length === 0 ? (
                <div className="empty-workshop">
                    <h2>¡Próximamente!</h2>
                    <p>Estamos preparando contenido increíble para mostrarte cómo trabajamos.</p>
                    <p>Vuelve pronto para descubrir la magia detrás de nuestras piezas.</p>
                </div>
            ) : (
                <div className="workshop-feed">
                    {posts.map((post) => (
                        <article key={post.id} id={`workshop-${post.id}`} className="workshop-post-card">
                            <div className="post-date">
                                {
                                    // Parsear como hora local para evitar desfase de un día
                                    // "2026-03-31" en UTC es "2026-03-30 21:00" en Santiago (UTC-3)
                                    // Forzamos mediodía local sin timezone para que siempre caiga en el día correcto
                                    (() => {
                                        const raw = post.created_at;
                                        // Si viene con hora (contiene 'T' o ' '), usamos como está con timeZone Santiago
                                        // Si es solo fecha (YYYY-MM-DD), agregamos T12:00:00 para evitar rollback
                                        const date = raw.includes('T') || raw.includes(' ')
                                            ? new Date(raw)
                                            : new Date(raw + 'T12:00:00');
                                        return date.toLocaleDateString('es-CL', {
                                            timeZone: 'America/Santiago',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        });
                                    })()
                                }
                            </div>
                            <h2 className="post-title">{post.title}</h2>

                            <div className="post-content">
                                <BlockRenderer blocks={post.content?.blocks || []} />
                            </div>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TheWorkshop;
