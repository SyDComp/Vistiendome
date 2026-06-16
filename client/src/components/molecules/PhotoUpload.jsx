import React, { useState, useRef } from 'react';
import Button from '../atoms/Button';
import { useNotification } from '../../context/NotificationContext';
import './PhotoUpload.css';

export default function PhotoUpload({ onPhotoSelect, onCancel }) {
    const [preview, setPreview] = useState(null);
    const [file, setFile] = useState(null);
    const fileInputRef = useRef(null);
    const { showNotification } = useNotification();

    const handleFileSelect = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        // Validate file type
        if (!selectedFile.type.startsWith('image/')) {
            showNotification('error', 'Por favor selecciona una imagen válida');
            return;
        }

        // Validate file size (max 5MB)
        if (selectedFile.size > 5 * 1024 * 1024) {
            showNotification('error', 'La imagen es muy grande. Máximo 5MB');
            return;
        }

        setFile(selectedFile);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreview(reader.result);
        };
        reader.readAsDataURL(selectedFile);
    };

    const handleConfirm = () => {
        if (file) {
            onPhotoSelect(file);
        }
    };

    const handleRetake = () => {
        setPreview(null);
        setFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="photo-upload">
            <h3>Foto de Prueba de Entrega</h3>

            {!preview ? (
                <div className="upload-area">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileSelect}
                        className="file-input"
                        id="photo-input"
                    />
                    <label htmlFor="photo-input" className="upload-label">
                        <div className="camera-icon">📷</div>
                        <p>Toca para tomar foto</p>
                        <span className="hint">o selecciona desde galería</span>
                    </label>
                </div>
            ) : (
                <div className="preview-area">
                    <img src={preview} alt="Preview" className="preview-image" />
                    <div className="preview-actions">
                        <Button variant="secondary" onClick={handleRetake}>
                            Tomar otra
                        </Button>
                        <Button onClick={handleConfirm}>
                            Confirmar y Subir
                        </Button>
                    </div>
                </div>
            )}

            {onCancel && (
                <button onClick={onCancel} className="cancel-link">
                    Cancelar
                </button>
            )}
        </div>
    );
}
