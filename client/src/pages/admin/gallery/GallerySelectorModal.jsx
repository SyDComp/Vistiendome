import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import Button from '../../../components/atoms/Button';
import './GallerySelectorModal.css';

export default function GallerySelectorModal({ isOpen, onClose, onSelect, type = 'image', selectedUrl = null }) {
    const [mediaItems, setMediaItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchMedia();
        }
    }, [isOpen]);

    const fetchMedia = async () => {
        setLoading(true);
        try {
            const response = await api.get('/gallery');
            // Filter by requested type (image, video, or all/undefined)
            const allItems = response.data || [];
            const filtered = type ? allItems.filter(item => item.type === type) : allItems;
            setMediaItems(filtered);
        } catch (error) {
            console.error('Error fetching gallery:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const filteredItems = mediaItems;

    const getFullUrl = (relativeUrl) => {
        if (!relativeUrl) return '';
        const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
        return `${apiUrl.replace('/api/v1', '')}${relativeUrl}`;
    };

    return (
        <div className="gallery-modal-overlay">
            <div className="gallery-modal-container">
                <div className="gallery-modal-header">
                    <h3>Seleccionar de Galería</h3>
                    <button className="gallery-modal-close" onClick={onClose}>×</button>
                </div>



                <div className="gallery-modal-body">
                    {loading ? (
                        <div className="gallery-loading">Cargando medios...</div>
                    ) : filteredItems.length === 0 ? (
                        <div className="gallery-empty">No se encontraron archivos compatibles.</div>
                    ) : (
                        <div className="gallery-modal-grid">
                            {filteredItems.map(item => (
                                <div
                                    key={item.path}
                                    className={`gallery-modal-item ${selectedUrl === item.path ? 'selected' : ''}`}
                                    onClick={() => onSelect(getFullUrl(item.url), item)}
                                >
                                    <div className="gallery-modal-preview">
                                        {item.type === 'video' ? (
                                            <video src={getFullUrl(item.url)} muted preload="metadata" />
                                        ) : (
                                            <img src={getFullUrl(item.url)} alt={item.name} loading="lazy" />
                                        )}
                                        <div className={`gallery-item-badge ${item.is_used ? 'badge-used' : 'badge-unused'}`}>
                                            {item.is_used ? 'En Uso' : 'Sin Uso'}
                                        </div>
                                    </div>
                                    <div className="gallery-modal-info">
                                        <span className="gallery-item-name" title={item.name}>{item.name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="gallery-modal-footer">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                </div>
            </div>
        </div>
    );
}
