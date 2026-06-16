import React, { useState, useEffect, useRef } from 'react';
import api from '../../../services/api';
import { useNotification } from '../../../context/NotificationContext';
import { useModal } from '../../../context/ModalContext';
import Button from '../../../components/atoms/Button';
import './GalleryManager.css';

export default function GalleryManager() {
    const [mediaItems, setMediaItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'image', 'video'
    const [usageFilter, setUsageFilter] = useState('all'); // 'all', 'used', 'unused'
    const fileInputRef = useRef(null);

    const { showNotification } = useNotification();
    const { confirm } = useModal();

    useEffect(() => {
        fetchMedia();
    }, []);

    const fetchMedia = async () => {
        setLoading(true);
        try {
            const response = await api.get('/gallery');
            setMediaItems(response.data || []);
        } catch (error) {
            console.error('Error fetching gallery:', error);
            showNotification('error', 'Error al cargar la galería de medios.');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Basic validation
        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            showNotification('error', 'El archivo es demasiado grande (Máx 50MB).');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'gallery');

        setUploading(true);
        try {
            await api.post('/gallery/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showNotification('success', 'Archivo subido exitosamente.');
            fetchMedia(); // Refresh list
        } catch (error) {
            console.error('Error uploading file:', error);
            showNotification('error', 'Error al subir el archivo.');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDelete = async (file) => {
        const confirmed = await confirm({
            title: 'Eliminar Archivo',
            message: `¿Estás seguro de que deseas eliminar permanentemente "${file.name}"? Los componentes que usen este archivo podrían dejar de mostrarlo.`,
            confirmText: 'Sí, eliminar',
            cancelText: 'Cancelar',
            type: 'danger'
        });

        if (confirmed) {
            try {
                // Encode the path to handle potential special characters or nested folders
                await api.delete(`/gallery?file_path=${encodeURIComponent(file.path)}`);
                showNotification('success', 'Archivo eliminado.');
                setMediaItems(mediaItems.filter(item => item.path !== file.path));
            } catch (error) {
                console.error('Error deleting file:', error);
                showNotification('error', 'Error al eliminar el archivo.');
            }
        }
    };

    // Calculate stats
    const totalBytes = mediaItems.reduce((acc, item) => acc + item.size, 0);
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
    const imageCount = mediaItems.filter(i => i.type === 'image').length;
    const videoCount = mediaItems.filter(i => i.type === 'video').length;
    const usedCount = mediaItems.filter(i => i.is_used).length;
    const unusedCount = mediaItems.length - usedCount;

    // Filter items by type and usage
    const filteredItems = mediaItems.filter(item => {
        const matchesType = typeFilter === 'all' || item.type === typeFilter;
        let matchesUsage = true;
        if (usageFilter === 'used') matchesUsage = item.is_used;
        if (usageFilter === 'unused') matchesUsage = !item.is_used;

        return matchesType && matchesUsage;
    });

    // Toggle type filter
    const handleTypeFilterToggle = (type) => {
        setTypeFilter(prev => prev === type ? 'all' : type);
    };

    // Toggle usage filter
    const handleUsageFilterToggle = (usage) => {
        setUsageFilter(prev => prev === usage ? 'all' : usage);
    };

    // Format file size
    const formatSize = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Helper to get full API URL for static files
    const getFullUrl = (relativeUrl) => {
        if (!relativeUrl) return '';
        const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
        return `${apiUrl.replace('/api/v1', '')}${relativeUrl}`;
    };

    return (
        <div className="gallery-manager">
            <div className="gallery-header">
                <h2>Galería de Medios</h2>
                <div className="gallery-actions">
                    <Button
                        variant="primary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? 'Subiendo...' : '📤 Subir Archivo'}
                    </Button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="image/*,video/*"
                        onChange={handleFileUpload}
                    />
                </div>
            </div>

            <div className="gallery-stats">
                <div className="stat-card">
                    <span className="stat-label">Espacio Utilizado</span>
                    <span className="stat-value">{totalMB} MB</span>
                </div>
                <div
                    className={`stat-card filterable ${typeFilter === 'image' ? 'active-filter' : ''}`}
                    onClick={() => handleTypeFilterToggle('image')}
                    title="Clic para filtrar por Imágenes"
                >
                    <span className="stat-label">Imágenes</span>
                    <span className="stat-value">{imageCount}</span>
                </div>
                <div
                    className={`stat-card filterable ${typeFilter === 'video' ? 'active-filter' : ''}`}
                    onClick={() => handleTypeFilterToggle('video')}
                    title="Clic para filtrar por Videos"
                >
                    <span className="stat-label">Videos</span>
                    <span className="stat-value">{videoCount}</span>
                </div>
                <div
                    className={`stat-card filterable ${usageFilter === 'used' ? 'active-filter' : ''}`}
                    onClick={() => handleUsageFilterToggle('used')}
                    title="Clic para filtrar por En Uso"
                >
                    <span className="stat-label">En Uso</span>
                    <span className="stat-value">{usedCount}</span>
                </div>
                <div
                    className={`stat-card filterable ${usageFilter === 'unused' ? 'active-filter' : ''}`}
                    onClick={() => handleUsageFilterToggle('unused')}
                    title="Clic para filtrar por Sin Uso"
                >
                    <span className="stat-label">Sin Uso</span>
                    <span className="stat-value">{unusedCount}</span>
                </div>
            </div>



            {loading ? (
                <div className="gallery-loading">Cargando medios...</div>
            ) : filteredItems.length === 0 ? (
                <div className="gallery-empty">
                    <p>No se encontraron archivos en la galería.</p>
                </div>
            ) : (
                <div className="gallery-grid">
                    {filteredItems.map(item => (
                        <div key={item.path} className="gallery-item-card">
                            <div className="gallery-item-preview">
                                {item.type === 'video' ? (
                                    <video src={getFullUrl(item.url)} muted preload="metadata" />
                                ) : (
                                    <img src={getFullUrl(item.url)} alt={item.name} loading="lazy" />
                                )}
                                <div className={`gallery-item-badge ${item.is_used ? 'badge-used' : 'badge-unused'}`}>
                                    {item.is_used ? 'En Uso' : 'Sin Uso'}
                                </div>
                                <div className="gallery-item-overlay">
                                    <button
                                        type="button"
                                        onClick={() => handleDelete(item)}
                                        className="gallery-action-btn btn-delete"
                                        title="Eliminar"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                    <a
                                        href={getFullUrl(item.url)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="gallery-action-btn btn-view"
                                        title="Ver en Grande"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                    </a>
                                </div>
                            </div>
                            <div className="gallery-item-info">
                                <span className="item-name" title={item.name}>{item.name}</span>
                                <div className="item-meta">
                                    <span className="item-size">{formatSize(item.size)}</span>
                                    <span className="item-type" style={{ display: 'flex', alignItems: 'center', color: '#64748b' }}>
                                        {item.type === 'video' ? (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
