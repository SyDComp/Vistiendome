import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Layers, Trash2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import Button from '../../../ui/Button';

// Estilos e Hijos Desacoplados (Divide y Vencerás)
import './MediaGallery.css';
import MediaHeader from './MediaHeader';
import MediaCard from './MediaCard';
import MediaLightbox from './MediaLightbox';
import MediaDeleteWarningModal from './MediaDeleteWarningModal';

/**
 * MediaGallery Premium v4: Orchestrator Component (State Container)
 * Manages the state, API lifecycle, and selection logic, then delegates rendering to specialized components.
 */
const MediaGallery = ({ 
    isOpen = true, 
    onClose, 
    selectionMode = false, 
    onSelectionModeChange, 
    onSelect, 
    initialSelected = [], 
    allowMultiple = true,
    confirmButtonText = null,
    contextInfo = null,
    asModal = true,      // Permite renderizar sin portal ni overlay
    itemsPool = null,    // Pool de imágenes personalizado (opcional)
    mainId = null,       // ID de la imagen de portada actual
    onSetMain = null     // Callback para cambiar la portada
}) => {
    const [images, setImages] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSelectMode, setIsSelectMode] = useState(selectionMode || Boolean(onSelect)); 
    const [previewIndex, setPreviewIndex] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [stableOrder, setStableOrder] = useState([]);

    // Estado para la eliminación rigurosa con chequeo de integridad
    const [isDeleteWarningOpen, setIsDeleteWarningOpen] = useState(false);
    const [activeReferences, setActiveReferences] = useState([]);
    const [pendingDeleteIds, setPendingDeleteIds] = useState([]);

    // Seguimiento para evitar bucles y reversiones accidentales de selección
    const lastSyncedRef = React.useRef("");

    // Sincronización de selección (Unidireccional: Padre -> Hijo)
    useEffect(() => {
        if (!isOpen) return;
        
        const validIds = Array.isArray(initialSelected) 
            ? initialSelected.map(id => parseInt(id, 10)).filter(id => !isNaN(id)).sort((a, b) => a - b)
            : [];
        const syncKey = JSON.stringify(validIds);

        if (syncKey !== lastSyncedRef.current) {
            setSelectedIds(new Set(validIds));
            lastSyncedRef.current = syncKey;
        }
    }, [initialSelected, isOpen]);

    useEffect(() => {
        setIsSelectMode(selectionMode || Boolean(onSelect));
    }, [selectionMode, onSelect]);

    // Ordenamiento estable al abrir la galería o al recibir nuevos datos base
    useEffect(() => {
        if (images.length > 0) {
            const currentSelected = new Set(selectedIds);
            const sorted = [...images].sort((a, b) => {
                const aSel = currentSelected.has(a.id);
                const bSel = currentSelected.has(b.id);
                if (aSel && !bSel) return -1;
                if (!aSel && bSel) return 1;
                const nameA = a.filename || a.url || '';
                const nameB = b.filename || b.url || '';
                return nameA.localeCompare(nameB);
            });
            setStableOrder(sorted);
        }
    }, [images, isOpen]);

    const fetchImages = async () => {
        try {
            const res = await fetch(`/api/v1/media/`);
            const data = await res.json();
            setImages(data);
        } catch (err) {
            console.error("Error cargando galería:", err);
        }
    };

    useEffect(() => {
        if (isOpen) {
            if (itemsPool && Array.isArray(itemsPool)) {
                setImages(itemsPool);
            } else {
                fetchImages();
            }
        }
    }, [isOpen, itemsPool]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        setStatus({ type: 'info', text: 'Subiendo archivo...' });
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch(`/api/v1/media/upload`, { 
                method: 'POST', 
                body: formData 
            });
            if (res.ok) {
                setStatus({ type: 'success', text: 'Imagen añadida' });
                setTimeout(() => setStatus(null), 3000);
                fetchImages();
            }
        } catch (err) {
            setStatus({ type: 'error', text: 'Error de conexión' });
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateAlias = async (id, alias) => {
        try {
            const res = await fetch(`/api/v1/media/alias`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, alias }),
            });
            if (res.ok) {
                setStatus({ type: 'success', text: 'Nombre actualizado' });
                setTimeout(() => setStatus(null), 2500);
                fetchImages();
            } else {
                setStatus({ type: 'error', text: 'No se pudo actualizar el nombre' });
            }
        } catch (err) {
            setStatus({ type: 'error', text: 'Error de conexión' });
        }
    };

    const filteredImages = useMemo(() => {
        return stableOrder.filter(img => {
            const name = `${img.alias || ''} ${img.original_name || ''} ${img.filename || ''}`;
            return name.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }, [stableOrder, searchTerm]);

    const openPreview = (index) => setPreviewIndex(index);
    const closePreview = () => setPreviewIndex(null);
    
    const nextPreview = useCallback(() => {
        if (previewIndex === null || filteredImages.length === 0) return;
        setPreviewIndex((prev) => (prev + 1) % filteredImages.length);
    }, [previewIndex, filteredImages.length]);

    const prevPreview = useCallback(() => {
        if (previewIndex === null || filteredImages.length === 0) return;
        setPreviewIndex((prev) => (prev - 1 + filteredImages.length) % filteredImages.length);
    }, [previewIndex, filteredImages.length]);

    const toggleImageSelection = (id) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            if (!allowMultiple) {
                next.clear();
            }
            next.add(id);
        }
        setSelectedIds(next);
    };

    const handleConfirmSelection = () => {
        if (onSelect) {
            const result = images.filter(img => selectedIds.has(img.id));
            onSelect(allowMultiple ? result : result[0]);
            if (onClose) onClose();
        }
    };

    const executeBatchDelete = async (ids) => {
        try {
            setStatus({ type: 'info', text: 'Eliminando archivos de medios...' });
            const res = await fetch(`/api/v1/media/batch`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ids)
            });
            const data = await res.json();

            if (res.ok) {
                setStatus({ type: 'success', text: `Eliminados ${data.success} archivos con éxito.` });
                setSelectedIds(new Set());
                setIsDeleteWarningOpen(false);
                fetchImages();
                setTimeout(() => setStatus(null), 3000);
            } else {
                setStatus({ type: 'error', text: 'Error al realizar eliminación masiva' });
            }
        } catch (err) {
            console.error("Error batch deleting:", err);
            setStatus({ type: 'error', text: 'Error de conexión al eliminar' });
        }
    };

    const handleDeleteClick = async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;

        try {
            setStatus({ type: 'info', text: 'Analizando integridad y referencias...' });
            const res = await fetch(`/api/v1/media/check-references`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ids)
            });
            const data = await res.json();
            setStatus(null);

            if (data.has_references) {
                // Alerta activa de dependencias en uso! Desplegar warning modal
                setActiveReferences(data.references);
                setPendingDeleteIds(ids);
                setIsDeleteWarningOpen(true);
            } else {
                // Borrado limpio clásico con confirmación simple
                const confirmDelete = window.confirm(`¿Estás seguro de que deseas eliminar permanentemente los ${ids.length} archivos seleccionados?`);
                if (confirmDelete) {
                    executeBatchDelete(ids);
                }
            }
        } catch (err) {
            console.error("Error checking references:", err);
            setStatus({ type: 'error', text: 'Error comprobando referencias' });
        }
    };

    if (!isOpen) return null;

    const galleryContent = (
        <div 
            onClick={(e) => {
                if (asModal) {
                    e.stopPropagation();
                    if (onClose) onClose();
                }
            }}
            className={`media-gallery-overlay ${asModal ? 'as-modal' : 'as-inline'}`}
        >
            <div 
                onClick={(e) => { if (asModal) e.stopPropagation(); }}
                className={`media-gallery-container ${asModal ? 'as-modal' : 'as-inline'}`}
            >
                {/* 1. Header (Especializado) */}
                <MediaHeader
                    imagesCount={images.length}
                    contextInfo={contextInfo}
                    onClose={onClose}
                    isSelectMode={isSelectMode}
                    onToggleSelectMode={() => {
                        const next = !isSelectMode;
                        setIsSelectMode(next);
                        if (onSelectionModeChange) onSelectionModeChange(next);
                    }}
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    uploading={uploading}
                    onFileUpload={handleFileUpload}
                    status={status}
                    selectedCount={selectedIds.size}
                    onDeleteSelected={handleDeleteClick}
                />

                {/* 2. Grid de Cards */}
                <div className="media-gallery-grid">
                    {filteredImages.map((img, idx) => {
                        const isSelected = selectedIds.has(img.id);
                        return (
                            <MediaCard
                                key={img.id}
                                img={img}
                                idx={idx}
                                isSelected={isSelected}
                                isSelectMode={isSelectMode}
                                mainId={mainId}
                                onSetMain={onSetMain}
                                onToggleSelection={toggleImageSelection}
                                onOpenPreview={openPreview}
                            />
                        );
                    })}
                </div>

                {/* 3. Footer de Acciones Múltiples */}
                {isSelectMode && (() => {
                    const isVariantContext = contextInfo?.toLowerCase().includes('versione') || contextInfo?.toLowerCase().includes('variante');
                    const defaultButtonText = isVariantContext
                        ? 'Asignar a Variante'
                        : (allowMultiple ? 'Seleccionar Imágenes' : 'Seleccionar Imagen');
                    const btnText = confirmButtonText || defaultButtonText;
                    const subtitleText = isVariantContext
                        ? 'Listas para asignar a variante'
                        : (allowMultiple ? 'Listas para usar' : 'Lista para seleccionar');

                    return (
                        <div className="media-gallery-footer">
                            <div className="media-gallery-footer-info">
                                 <div className={`media-gallery-footer-icon-wrapper ${selectedIds.size > 0 ? '' : 'is-inactive'}`}>
                                    <Layers size={24} />
                                 </div>
                                 <div>
                                    <span className="media-gallery-footer-title">{selectedIds.size} seleccionada{selectedIds.size !== 1 ? 's' : ''}</span>
                                    <span className="media-gallery-footer-subtitle">{subtitleText}</span>
                                 </div>
                            </div>
                            <div className="media-gallery-footer-buttons">
                                {selectedIds.size > 0 && (
                                    <Button 
                                        variant="outline" 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            handleDeleteClick(); 
                                        }} 
                                        className="media-gallery-footer-btn-danger"
                                    >
                                        <Trash2 size={16} className="media-gallery-icon-mr" />
                                        Eliminar
                                    </Button>
                                )}
                                
                                {allowMultiple && (
                                    selectedIds.size < filteredImages.length ? (
                                        <Button 
                                            variant="outline" 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setSelectedIds(new Set(filteredImages.map(img => img.id))); 
                                            }} 
                                            className="media-gallery-footer-btn-secondary"
                                        >
                                            Seleccionar Todo
                                        </Button>
                                    ) : (
                                        <Button 
                                            variant="outline" 
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setSelectedIds(new Set()); 
                                            }} 
                                            className="media-gallery-footer-btn-secondary"
                                        >
                                            Deseleccionar Todo
                                        </Button>
                                    )
                                )}

                                <Button 
                                    variant="primary" 
                                    disabled={selectedIds.size === 0}
                                    onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleConfirmSelection(); 
                                    }} 
                                    className={`media-gallery-footer-btn-primary ${selectedIds.size > 0 ? 'is-active' : 'is-disabled'}`}
                                >
                                    {btnText}
                                </Button>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* 4. Lightbox Visor (Especializado) */}
            {previewIndex !== null && filteredImages[previewIndex] && (
                <MediaLightbox
                    img={filteredImages[previewIndex]}
                    mainId={mainId}
                    onSetMain={onSetMain}
                    onClose={closePreview}
                    onPrev={prevPreview}
                    onNext={nextPreview}
                    onUpdateAlias={handleUpdateAlias}
                />
            )}

            {/* 5. Modal de Advertencia de Eliminación Rigurosa */}
            <MediaDeleteWarningModal 
                isOpen={isDeleteWarningOpen}
                onClose={() => setIsDeleteWarningOpen(false)}
                onConfirmForceDelete={() => executeBatchDelete(pendingDeleteIds)}
                referencesData={activeReferences}
            />
        </div>
    );

    return asModal ? createPortal(galleryContent, document.body) : galleryContent;
};

export default MediaGallery;
