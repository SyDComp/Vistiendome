import React, { useState, useRef, useEffect } from 'react';
import Button from '../../../../components/atoms/Button';
import './RichTextModal.css';
import '../../../../pages/PolicyPage.css'; // For accurate live preview

const RichTextModal = ({ title, initialValue, onSave, onClose }) => {
    const [content, setContent] = useState(initialValue || '');
    const [mobileExpandedPane, setMobileExpandedPane] = useState(null); // 'html' | 'preview' | null
    const previewRef = useRef(null);

    // Sync preview changes back to the raw HTML state when the user finishes editing
    const handlePreviewEdit = () => {
        if (previewRef.current) {
            setContent(previewRef.current.innerHTML);
        }
    };

    // When the content state changes (e.g., via the textarea), ensure the preview ref is updated
    // but only if the user isn't currently editing the preview to avoid resetting their cursor
    useEffect(() => {
        if (previewRef.current && previewRef.current.innerHTML !== content) {
            previewRef.current.innerHTML = content;
        }
    }, [content]);

    return (
        <div className="modal-overlay rich-text-modal-overlay">
            <div className="split-view-modal-content">
                <div className="modal-header">
                    <h2>Editando: {title}</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="split-view-container">
                    <div className={`split-view-pane editor-pane ${mobileExpandedPane === 'preview' ? 'mobile-hidden' : ''} ${mobileExpandedPane === 'html' ? 'mobile-expanded' : ''}`}>
                        <div className="pane-header">
                            <span>Código HTML 💻</span>
                            <button className="mobile-expand-btn" onClick={() => setMobileExpandedPane(mobileExpandedPane === 'html' ? null : 'html')} title="Pantalla completa">
                                {mobileExpandedPane === 'html' ? '⤡ Contraer' : '⤢ Expandir'}
                            </button>
                        </div>
                        <textarea
                            className="html-source-editor"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="<p>Escribe o pega tu código HTML exacto aquí...</p>"
                            spellCheck="false"
                        />
                    </div>
                    <div className={`split-view-pane preview-pane ${mobileExpandedPane === 'html' ? 'mobile-hidden' : ''} ${mobileExpandedPane === 'preview' ? 'mobile-expanded' : ''}`}>
                        <div className="pane-header">
                            <span>Live Preview 👁️ (¡Puedes escribir aquí!)</span>
                            <button className="mobile-expand-btn" onClick={() => setMobileExpandedPane(mobileExpandedPane === 'preview' ? null : 'preview')} title="Pantalla completa">
                                {mobileExpandedPane === 'preview' ? '⤡ Contraer' : '⤢ Expandir'}
                            </button>
                        </div>
                        <div className="preview-content policy-content-wrapper">
                            <div
                                className="policy-body editable-preview"
                                contentEditable={true}
                                suppressContentEditableWarning={true}
                                onBlur={handlePreviewEdit}
                                ref={previewRef}
                            />
                        </div>
                    </div>
                </div>

                <div className="modal-actions">
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button variant="primary" onClick={() => onSave(content)}>Guardar y Cerrar</Button>
                </div>
            </div>
        </div>
    );
};

export default RichTextModal;
