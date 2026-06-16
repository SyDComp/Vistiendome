import { 
    Image as ImageIcon, Sparkles, X, Check, MousePointer2, Search, Loader2, Upload, Trash2 
} from 'lucide-react';

/**
 * MediaHeader Component (Presentational)
 * Handles the toolbar, search box, upload button, and selection toggles.
 */
const MediaHeader = ({
    imagesCount,
    contextInfo,
    onClose,
    isSelectMode,
    onToggleSelectMode,
    searchTerm,
    onSearchChange,
    uploading,
    onFileUpload,
    status,
    selectedCount = 0,
    onDeleteSelected
}) => {
    return (
        <div className="media-gallery-header">
            <div className="media-gallery-header-row">
                <div className="media-gallery-title-area">
                    <div>
                        <h3 className="media-gallery-title-main">
                            <ImageIcon size={28} className="media-gallery-header-main-icon" /> Galería de Medios
                        </h3>
                        <div className="media-gallery-title-sub">
                            <span className="media-gallery-badge-active">{imagesCount} activos</span>
                            {contextInfo && (
                                <div className="media-gallery-badge-context">
                                    <Sparkles size={14} color="#8f0653" />
                                    <span className="media-gallery-badge-context-text">{contextInfo.toUpperCase()}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {onClose && (
                        <div 
                            className="media-gallery-close-btn-mobile"
                            onClick={(e) => { 
                                e.preventDefault();
                                onClose(); 
                            }} 
                        >
                            <X size={18} color="#1e1b4b" />
                        </div>
                    )}
                </div>

                <div className="media-gallery-controls">
                    {isSelectMode && selectedCount > 0 && onDeleteSelected && (
                        <button 
                            className="media-gallery-header-delete-btn"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSelected();
                            }}
                            title="Eliminar seleccionados"
                        >
                            <Trash2 size={16} />
                            <span>Eliminar ({selectedCount})</span>
                        </button>
                    )}
                    <div 
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleSelectMode();
                        }}
                        className={`media-gallery-select-toggle-btn ${isSelectMode ? 'is-active' : 'is-inactive'}`}
                    >
                        {isSelectMode ? <Check size={18} strokeWidth={3} /> : <MousePointer2 size={18} />}
                        <span>{isSelectMode ? 'Selección ON' : 'Activar Selección'}</span>
                    </div>
                    
                    <div className="media-gallery-search-wrapper">
                        <Search size={18} className="media-gallery-search-icon" />
                        <input 
                            type="text" 
                            placeholder="Buscar..." 
                            value={searchTerm} 
                            onChange={(e) => onSearchChange(e.target.value)} 
                            className="media-gallery-search-input"
                        />
                    </div>
                    
                    <label htmlFor="media-upload" className="media-gallery-upload-label">
                        <input type="file" id="media-upload" className="media-gallery-upload-input" onChange={onFileUpload} accept="image/*" />
                        {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />} 
                        SUBIR
                    </label>
                    
                    {onClose && (
                        <div 
                            className="media-gallery-close-btn-desktop"
                            onClick={(e) => { 
                                e.preventDefault();
                                onClose(); 
                            }} 
                        >
                            <X size={20} color="#1e1b4b" />
                        </div>
                    )}
                </div>
            </div>
            {status && (
                <div className={`media-gallery-status-bar ${status.type === 'error' ? 'is-error' : 'is-success'}`}>
                    {status.text}
                </div>
            )}
        </div>
    );
};

export default MediaHeader;
