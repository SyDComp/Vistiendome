import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

/**
 * MediaDeleteWarningModal - Componente Puro de Presentación
 * Muestra las referencias activas de las imágenes seleccionadas para borrar
 * e interactúa con confirmación / eliminación forzada.
 */
export default function MediaDeleteWarningModal({ 
    isOpen, 
    onClose, 
    onConfirmForceDelete, 
    referencesData 
}) {
    if (!isOpen) return null;

    return (
        <div className="media-gallery-overlay as-modal active" onClick={onClose}>
            <div 
                className="media-gallery-container media-delete-warning-modal-container" 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Cabecera del Modal de Alerta */}
                <div className="media-delete-warning-header">
                    <div className="media-delete-warning-badge">
                        <AlertTriangle size={24} className="media-delete-warning-icon" />
                    </div>
                    <div className="media-delete-warning-title-group">
                        <h4>Eliminación de Riesgo de Medios</h4>
                        <p>Hay archivos que actualmente están siendo utilizados en el catálogo o páginas del sitio.</p>
                    </div>
                    <button className="media-delete-warning-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                {/* Cuerpo del Modal con Reporte de Integridad */}
                <div className="media-delete-warning-body">
                    <p className="media-delete-warning-body-intro">
                        Si eliminas estos archivos, **las imágenes se desvincularán de forma automática** para evitar caídas del sitio, pero las secciones correspondientes quedarán vacías.
                    </p>

                    <div className="media-delete-warning-list">
                        {referencesData.map((item) => (
                            <div key={item.media_id} className="media-delete-warning-item">
                                <div className="media-delete-warning-item-header">
                                    <span className="media-delete-warning-filename" title={item.filename}>
                                        {item.original_name}
                                    </span>
                                    <span className="media-delete-warning-count-badge">
                                        {item.associations.length} {item.associations.length === 1 ? 'referencia' : 'referencias'}
                                    </span>
                                </div>

                                <div className="media-delete-warning-associations">
                                    {item.associations.map((assoc, idx) => (
                                        <div key={idx} className="media-delete-association-row">
                                            <span className={`media-delete-assoc-badge type-${assoc.type}`}>
                                                {assoc.type === 'product' && 'Producto'}
                                                {assoc.type === 'sku' && 'Variante'}
                                                {assoc.type === 'homepage' && 'Sección CMS'}
                                            </span>
                                            <span className="media-delete-assoc-name">
                                                {assoc.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Acciones del Modal */}
                <div className="media-delete-warning-actions">
                    <button 
                        className="media-delete-warning-btn-cancel" 
                        onClick={onClose}
                    >
                        Cancelar
                    </button>
                    <button 
                        className="media-delete-warning-btn-danger" 
                        onClick={onConfirmForceDelete}
                    >
                        <Trash2 size={16} />
                        Eliminar de Todos Modos
                    </button>
                </div>
            </div>
        </div>
    );
}
