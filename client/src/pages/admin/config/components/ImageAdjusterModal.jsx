import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ImageSettingsEditor from './ImageSettingsEditor';
import './ImageAdjusterModal.css';

const ImageAdjusterModal = ({ isOpen, onClose, src, settings, onSave }) => {
    const [tempSettings, setTempSettings] = useState(settings || { zoom: 1, x: 50, y: 50, shape: 'original', radius: 'none' });
    const [showConfirm, setShowConfirm] = useState(false);

    // Track changes
    const hasChanged = JSON.stringify(tempSettings) !== JSON.stringify(settings);

    // Lock scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100vw';
            document.body.classList.add('modal-open');
            
            return () => {
                const scrollY = document.body.style.top;
                document.body.style.position = '';
                document.body.style.top = '';
                document.body.style.width = '';
                document.body.classList.remove('modal-open');
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            };
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && settings) {
            setTempSettings(settings); // Sync when opening
        }
    }, [isOpen, settings]);

    if (!isOpen) return null;

    const handleCloseAttempt = () => {
        if (hasChanged) {
            setShowConfirm(true);
        } else {
            onClose();
        }
    };

    const handleSave = () => {
        onSave(tempSettings);
        onClose();
    };

    const handleConfirmDiscard = () => {
        setShowConfirm(false);
        onClose();
    };

    return createPortal(
        <div className="image-adjuster-overlay" onClick={handleCloseAttempt}>
            <div className="image-adjuster-container" onClick={e => e.stopPropagation()}>
                <div className="image-adjuster-header">
                    <button className="close-btn mobile-cancel" onClick={handleCloseAttempt}>&times;</button>
                    <h3>Ajustar Imagen</h3>
                    <button className="btn-save-header" onClick={handleSave}>Guardar</button>
                    <button className="close-btn desktop-close" onClick={handleCloseAttempt}>&times;</button>
                </div>
                
                <div className="image-adjuster-body">
                    <ImageSettingsEditor
                        src={src}
                        settings={tempSettings}
                        onChange={setTempSettings}
                        showShape={true}
                        label=""
                    />
                </div>

                <div className="image-adjuster-footer">
                    <button className="btn-cancel" onClick={handleCloseAttempt}>Cancelar</button>
                    <button className="btn-save" onClick={handleSave}>Guardar Cambios</button>
                </div>

                {/* Confirmation Overlay */}
                {showConfirm && (
                    <div className="confirm-discard-overlay">
                        <div className="confirm-discard-modal">
                            <h4>¿Deseas guardar los cambios?</h4>
                            <p>Has realizado ajustes en la imagen que no han sido guardados.</p>
                            <div className="confirm-actions">
                                <button className="btn-discard" onClick={handleConfirmDiscard}>Descartar</button>
                                <button className="btn-stay" onClick={() => setShowConfirm(false)}>Seguir editando</button>
                                <button className="btn-save-confirm" onClick={handleSave}>Guardar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default ImageAdjusterModal;
