import React, { useState, useRef } from 'react';
import api from '../../services/api';
import GallerySelectorModal from '../../pages/admin/gallery/GallerySelectorModal';
import SmartImage from '../atoms/SmartImage';
import './ConfigImageUpload.css';

const ConfigImageUpload = ({
    currentImage,
    onImageUploaded,
    label,
    helpText,
    imageSettings,
    showPreview = true   // Cuando hay ImageSettingsEditor debajo, pasar false para no duplicar la imagen
}) => {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);
    const [error, setError] = useState(null);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);

    const currentImageSettings = imageSettings || { zoom: 1, x: 50, y: 50 };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tipo
        if (!file.type.startsWith('image/')) {
            setError('Solo se permiten archivos de imagen');
            return;
        }

        // Preview temporal
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result);
        };
        reader.readAsDataURL(file);

        // Upload
        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/config/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            // Notificar al padre con la nueva URL
            if (response.data && response.data.url) {
                // Agregar URL base si es ruta relativa
                const fullUrl = response.data.url.startsWith('http')
                    ? response.data.url
                    : `${(import.meta.env.VITE_API_URL || '/api/v1').replace('/api/v1', '')}${response.data.url}`;

                onImageUploaded(fullUrl);
            }
        } catch (err) {
            console.error('Error uploading config image:', err);
            setError('Error al subir la imagen. Inténtalo de nuevo.');
            setPreview(null); // Revertir preview
        } finally {
            setUploading(false);
        }
    };

    const triggerFileSelect = () => {
        fileInputRef.current.click();
    };

    const handleGallerySelect = (url, item) => {
        onImageUploaded(url);
        setPreview(url); // Also update local preview immediately
        setIsGalleryOpen(false);
    };

    const displayImage = preview || currentImage;

    return (
        <div className="config-image-upload">
            <label className="upload-label">{label}</label>

            <div className="upload-area">
                {showPreview && (
                    <div
                        className={`image-preview-container ${!displayImage ? 'empty' : ''}`}
                        onClick={triggerFileSelect}
                        style={{ cursor: 'pointer' }}
                    >
                        {displayImage ? (
                            <SmartImage 
                                src={displayImage}
                                settings={currentImageSettings}
                            />
                        ) : (
                            <div className="placeholder-text">
                                <span>📷</span>
                                <p>Haz clic para subir imagen</p>
                            </div>
                        )}

                        {uploading && (
                            <div className="upload-overlay">
                                <div className="spinner"></div>
                            </div>
                        )}
                    </div>
                )}

                <div className="upload-actions">
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div className="file-input-wrapper" style={{ flex: 1, position: 'relative' }}>
                            <button
                                type="button"
                                className="btn-select-file"
                                disabled={uploading}
                                style={{ width: '100%', margin: 0 }}
                            >
                                {uploading ? 'Subiendo...' : 'Cambiar Imagen'}
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*"
                                disabled={uploading}
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    opacity: 0,
                                    cursor: 'pointer',
                                    width: '100%',
                                    height: '100%'
                                }}
                            />
                        </div>
                        <button
                            type="button"
                            className="btn-select-file"
                            onClick={() => setIsGalleryOpen(true)}
                            disabled={uploading}
                            style={{ flex: 1, backgroundColor: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)', margin: 0 }}
                        >
                            🖼️ Galería
                        </button>
                    </div>
                    {helpText && <p className="help-text">{helpText}</p>}
                    {error && <p className="error-text">{error}</p>}
                </div>
            </div>

            {/* Input oculto para compatibilidad con forms tradicionales si fuera necesario */}
            <input type="hidden" value={currentImage || ''} />

            <GallerySelectorModal
                isOpen={isGalleryOpen}
                onClose={() => setIsGalleryOpen(false)}
                onSelect={handleGallerySelect}
                type="image" // Solamente imágenes para configuraciones por ahora
            />
        </div>
    );
};

export default ConfigImageUpload;
