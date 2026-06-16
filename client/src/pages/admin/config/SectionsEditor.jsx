import React, { useState, useEffect } from 'react';
import Button from '../../../components/atoms/Button';
import ConfigImageUpload from '../../../components/molecules/ConfigImageUpload';
import api from '../../../services/api'; // Import API
import { useNotification } from '../../../context/NotificationContext';
import { useModal } from '../../../context/ModalContext';
import './SectionsEditor.css';

import { EditorInput, EditorSelect, EditorColorPicker, EditorButton } from './components/EditorAtoms';
import ImageSettingsEditor from './components/ImageSettingsEditor';
import ImageAdjusterModal from './components/ImageAdjusterModal';
import SmartImage from '../../../components/atoms/SmartImage';

// --- Element Editors ---
const ElementEditor = ({ element, onChange, onDelete, onMoveUp, onMoveDown, products, workshops }) => { // Receive products and workshops
    const [isAdjusterOpen, setIsAdjusterOpen] = useState(false);
    const handleChange = (field, value) => onChange({ ...element, [field]: value });
    const handleStyleChange = (field, value) => onChange({ ...element, styles: { ...element.styles, [field]: value } });

    return (
        <div className="element-editor-item">
            <div className="element-header">
                <div className="element-controls">
                    <button onClick={onMoveUp} title="Subir">↑</button>
                    <button onClick={onMoveDown} title="Bajar">↓</button>
                </div>
                <span className="element-type-tag">{element.type}</span>
                <div className="element-controls">
                    {/* <button onClick={onMoveUp} title="Subir">↑</button>
                    <button onClick={onMoveDown} title="Bajar">↓</button> */}
                    <button onClick={onDelete} title="Eliminar" className="text-red">×</button>
                </div>
            </div>

            <div className="element-body">
                {/* Heading & Paragraph */}
                {(element.type === 'heading' || element.type === 'paragraph') && (
                    <>
                        <div className="form-group">
                            <EditorInput
                                label="Contenido:"
                                value={element.content}
                                onChange={(e) => handleChange('content', e.target.value)}
                                placeholder={element.type === 'heading' ? 'Escribe el título...' : 'Escribe el contenido...'}
                                type={element.type === 'paragraph' ? 'textarea' : 'text'}
                                rows={element.type === 'paragraph' ? 3 : 1}
                            />
                        </div>
                        <div className="element-options-row">
                            <EditorSelect
                                label="Alineación:"
                                value={element.styles?.textAlign || 'left'}
                                onChange={(e) => handleStyleChange('textAlign', e.target.value)}
                                options={[
                                    { value: 'left', label: 'Izquierda' },
                                    { value: 'center', label: 'Centro' },
                                    { value: 'right', label: 'Derecha' }
                                ]}
                            />
                            <EditorColorPicker
                                label="Color:"
                                value={element.styles?.color || '#ff0000'}
                                onChange={(e) => handleStyleChange('color', e.target.value)}
                            />
                            <div className="option-group">
                                <label>Tamaño:</label><span> </span>
                                <div className="size-selector-container">
                                    <div className="size-selector">
                                        {[
                                            { label: 'Pequeño', value: element.type === 'heading' ? '1.5rem' : '0.9rem', icon: 'S' },
                                            { label: 'Mediano', value: element.type === 'heading' ? '2.5rem' : '1.1rem', icon: 'M' },
                                            { label: 'Grande', value: element.type === 'heading' ? '3.5rem' : '1.5rem', icon: 'L' }
                                        ].map((sizeOption) => (
                                            <button
                                                key={sizeOption.label}
                                                className={`btn-size-option ${element.styles?.fontSize === sizeOption.value ? 'active' : ''}`}
                                                onClick={() => handleStyleChange('fontSize', sizeOption.value)}
                                                title={sizeOption.label}
                                            >
                                                {sizeOption.icon}
                                            </button>
                                        ))}
                                    </div>
                                    <div
                                        className="font-preview-box"
                                        style={{
                                            fontSize: element.styles?.fontSize || (element.type === 'heading' ? '2.5rem' : '1.1rem'),
                                            color: element.styles?.color || '#3182ce',
                                        }}
                                    >
                                        Aa Texto
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* Image */}
                {element.type === 'image' && (
                    <div className="image-element-editor-v2">
                        <ConfigImageUpload
                            currentImage={element.image}
                            onImageUploaded={(url) => handleChange('image', url)}
                            label="Imagen de Sección"
                            imageSettings={element.image_settings}
                            showPreview={false} // Disable internal generic preview to use NDE one
                        />
                        
                        {element.image && (
                            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                    <SmartImage 
                                        src={element.image}
                                        settings={element.image_settings}
                                        style={{
                                            maxWidth: '100%',
                                            border: '2px solid #3182ce',
                                            boxShadow: '0 4px 12px rgba(49, 130, 206, 0.15)',
                                            transition: 'all 0.3s ease'
                                        }}
                                    />
                                </div>
                                
                                <button 
                                    className="btn-adjust-image"
                                    onClick={() => {
                                        // Logic to open modal (need state in SectionsEditor or ElementEditor)
                                        // For now, let's use a local state in ElementEditor or a window-level approach
                                        // But actually, SectionEditor handles the state.
                                        // I'll add a state to ElementEditor.
                                        setIsAdjusterOpen(true);
                                    }}
                                >
                                    🎨 Ajustar Encuadre y Forma
                                </button>
                                
                                <ImageAdjusterModal
                                    isOpen={isAdjusterOpen}
                                    onClose={() => setIsAdjusterOpen(false)}
                                    src={element.image}
                                    settings={element.image_settings}
                                    onSave={(settings) => handleChange('image_settings', settings)}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Spacer */}
                {element.type === 'spacer' && (
                    <div className="option-group">
                        <label>Altura del espacio:</label>
                        <div className="size-selector-container">
                            <div className="size-selector">
                                {[
                                    { label: 'Pequeño', value: '2rem', icon: 'S' },
                                    { label: 'Mediano', value: '4rem', icon: 'M' },
                                    { label: 'Grande', value: '8rem', icon: 'L' }
                                ].map((sizeOption) => (
                                    <button
                                        key={sizeOption.label}
                                        className={`btn-size-option ${element.styles?.height === sizeOption.value ? 'active' : ''}`}
                                        onClick={() => handleStyleChange('height', sizeOption.value)}
                                        title={sizeOption.label}
                                    >
                                        {sizeOption.icon}
                                    </button>
                                ))}
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '10px' }}>
                                ({element.styles?.height || '2rem'})
                            </span>
                        </div>
                    </div>
                )}

                {/* Button Group */}
                {element.type === 'button_group' && (
                    <div className="button-group-editor">
                        {element.buttons?.map((btn, idx) => (
                            <div key={idx} className="button-item-editor">
                                <div className="btn-editor-top">
                                    <EditorInput
                                        value={btn.text}
                                        onChange={(e) => {
                                            const newBtns = [...element.buttons];
                                            newBtns[idx].text = e.target.value;
                                            handleChange('buttons', newBtns);
                                        }}
                                        placeholder="Texto del Botón"
                                        className="btn-editor-text-input"
                                    />
                                    <button
                                        onClick={() => {
                                            const newBtns = element.buttons.filter((_, i) => i !== idx);
                                            handleChange('buttons', newBtns);
                                        }}
                                        className="btn-delete-action"
                                        title="Eliminar botón"
                                    >
                                        🗑️
                                    </button>
                                </div>

                                <div className="btn-editor-row">
                                    <div className="btn-editor-link">
                                        <EditorSelect
                                            label="Acción:"
                                            value={btn.linkType === 'product' ? 'product' : (btn.linkType === 'workshop' ? 'workshop' : (['/', '/catalogo', '/nosotros', '/contacto', '/el-taller', '/envios'].includes(btn.link) ? btn.link : 'custom'))}
                                            onChange={(e) => {
                                                const newBtns = [...element.buttons];
                                                const val = e.target.value;

                                                if (val === 'product') {
                                                    newBtns[idx].linkType = 'product';
                                                    newBtns[idx].link = ''; // Clear link
                                                    newBtns[idx].workshopId = undefined;
                                                } else if (val === 'workshop') {
                                                    newBtns[idx].linkType = 'workshop';
                                                    newBtns[idx].link = ''; // Clear link
                                                    newBtns[idx].productId = undefined;
                                                } else if (val === 'custom') {
                                                    newBtns[idx].linkType = 'url';
                                                    newBtns[idx].link = '';
                                                    newBtns[idx].productId = undefined;
                                                    newBtns[idx].workshopId = undefined;
                                                } else {
                                                    newBtns[idx].linkType = 'url';
                                                    newBtns[idx].link = val;
                                                    newBtns[idx].productId = undefined;
                                                    newBtns[idx].workshopId = undefined;
                                                }
                                                handleChange('buttons', newBtns);
                                            }}
                                            options={[
                                                { value: 'product', label: '🛒 Abrir Producto' }, // New option
                                                { value: 'workshop', label: '🎨 Abrir Taller' }, // New option
                                                { value: 'custom', label: '🔗 Enlace Personalizado...' },
                                                { value: '/', label: 'Inicio' },
                                                { value: '/catalogo', label: 'Catálogo' },
                                                { value: '/nosotros', label: 'Nosotros' },
                                                { value: '/el-taller', label: 'El Taller' },
                                                { value: '/contacto', label: 'Contacto' },
                                                { value: '/envios', label: 'Envíos' }
                                            ]}
                                        />

                                        {/* URL Input */}
                                        {btn.linkType !== 'product' && btn.linkType !== 'workshop' && (!['/', '/catalogo', '/nosotros', '/contacto', '/el-taller', '/envios'].includes(btn.link)) && (
                                            <EditorInput
                                                value={btn.link}
                                                onChange={(e) => {
                                                    const newBtns = [...element.buttons];
                                                    newBtns[idx].link = e.target.value;
                                                    handleChange('buttons', newBtns);
                                                }}
                                                placeholder="https://... o /ruta"
                                            />
                                        )}

                                        {/* Product Selector */}
                                        {btn.linkType === 'product' && (
                                            <select
                                                className="editor-select"
                                                value={btn.productId || ''}
                                                onChange={(e) => {
                                                    const newBtns = [...element.buttons];
                                                    newBtns[idx].productId = e.target.value;
                                                    handleChange('buttons', newBtns);
                                                }}
                                            >
                                                <option value="">-- Seleccionar Producto --</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name}
                                                    </option>
                                                ))}
                                            </select>
                                        )}

                                        {/* Workshop Selector */}
                                        {btn.linkType === 'workshop' && (
                                            <select
                                                className="editor-select"
                                                value={btn.workshopId || ''}
                                                onChange={(e) => {
                                                    const newBtns = [...element.buttons];
                                                    newBtns[idx].workshopId = e.target.value;
                                                    handleChange('buttons', newBtns);
                                                }}
                                            >
                                                <option value="">-- Seleccionar Taller --</option>
                                                {workshops.map(w => (
                                                    <option key={w.id} value={w.id}>
                                                        {w.title}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    <div className="btn-editor-colors">
                                        <EditorSelect
                                            value={btn.variant}
                                            onChange={(e) => {
                                                const newBtns = [...element.buttons];
                                                newBtns[idx].variant = e.target.value;
                                                handleChange('buttons', newBtns);
                                            }}
                                            options={[
                                                { value: 'primary', label: 'Sólido' },
                                                { value: 'outline', label: 'Borde' },
                                                { value: 'secondary', label: 'Secundario' }
                                            ]}
                                        />
                                        <EditorColorPicker
                                            value={btn.customColor}
                                            onChange={(e) => {
                                                const newBtns = [...element.buttons];
                                                newBtns[idx].customColor = e.target.value;
                                                handleChange('buttons', newBtns);
                                            }}
                                            title="Color Personalizado"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <EditorButton
                            onClick={() => handleChange('buttons', [...(element.buttons || []), { text: 'Nuevo Botón', linkType: 'url', link: '/catalogo', variant: 'primary', customColor: '#ff0000' }])}
                            style={{ alignSelf: 'flex-start' }}
                        >
                            + Añadir Botón
                        </EditorButton>
                    </div>
                )}
            </div>
        </div>
    );
};

// Componente para editar un bloque individual (BuilderBlockEditor)
const BlockEditor = ({ block, index, onChange, onDelete, onDragStart, onDragOver, onDrop, onMoveUp, onMoveDown, isFirst, isLast, products, workshops }) => { // Receive products and workshops
    const [expanded, setExpanded] = useState(false);

    // Initialize elements if legacy block
    if (!block.elements && !block._migrated) {
        // Simple migration on the fly for UI (not saving unless they edit)
        // This is optional, but helps transition. For now, we assume user starts fresh or we support legacy rendering.
    }

    const handleStyleChange = (field, value) => {
        onChange({
            ...block,
            styles: { ...block.styles, [field]: value }
        });
    };

    const addElement = (type) => {
        const newElement = {
            id: Date.now().toString(),
            type,
            content: '',
            styles: { color: '#ff0000' },
            buttons: type === 'button_group' ? [] : undefined
        };
        const updatedElements = [...(block.elements || []), newElement];
        onChange({ ...block, elements: updatedElements });
    };

    const updateElement = (idx, updatedEl) => {
        const newElements = [...(block.elements || [])];
        newElements[idx] = updatedEl;
        onChange({ ...block, elements: newElements });
    };

    const removeElement = (idx) => {
        const newElements = (block.elements || []).filter((_, i) => i !== idx);
        onChange({ ...block, elements: newElements });
    };

    const moveElement = (idx, direction) => {
        const newElements = [...(block.elements || [])];
        if (direction === -1 && idx > 0) {
            [newElements[idx], newElements[idx - 1]] = [newElements[idx - 1], newElements[idx]];
        } else if (direction === 1 && idx < newElements.length - 1) {
            [newElements[idx], newElements[idx + 1]] = [newElements[idx + 1], newElements[idx]];
        }
        onChange({ ...block, elements: newElements });
    };

    return (
        <div
            className={`block-editor ${expanded ? 'expanded' : 'collapsed'}`}
            draggable={!expanded}
            onDragStart={!expanded ? onDragStart : (e) => e.preventDefault()}
            onDragOver={onDragOver}
            onDrop={onDrop}
            style={{ marginBottom: '1rem' }}
        >
            <div className="block-header" onClick={() => setExpanded(!expanded)}>
                <div className="block-move-controls" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="btn-icon" disabled={isFirst} title="Subir" style={{ opacity: isFirst ? 0.3 : 1 }}>↑</button>
                    <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="btn-icon" disabled={isLast} title="Bajar" style={{ opacity: isLast ? 0.3 : 1 }}>↓</button>
                </div>

                <div className="block-title-text">
                    <strong style={{ wordBreak: 'break-word', lineHeight: '1.3' }}>{block.title || (block.elements ? 'Sección Personalizada' : 'Sección Legacy')}</strong>
                    <span className="block-type-badge">{block.elements ? `${block.elements.length} Elementos` : 'Legacy'}</span>
                </div>

                <div className="block-actions" onClick={(e) => e.stopPropagation()}>
                    <div className="checkbox-wrapper">
                        <input
                            type="checkbox"
                            checked={block.visible !== false}
                            onChange={(e) => onChange({ ...block, visible: e.target.checked })}
                        />
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="btn-icon delete" title="Eliminar sección">
                        🗑️
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="btn-icon">
                        {expanded ? '▲' : '▼'}
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="block-body">
                    {/* Section Name Input */}
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label>Nombre de la Sección</label>
                        <input
                            type="text"
                            value={block.title || ''}
                            onChange={(e) => onChange({ ...block, title: e.target.value })}
                            className="element-input-text"
                            placeholder="Ej: Ofertas, Novedades..."
                            style={{ width: '100%', padding: '0.5rem' }}
                        />
                    </div>

                    {/* Section General Settings */}
                    <div className="section-settings-panel">
                        <h5>Estilo del Contenedor</h5>
                        <div className="form-row">
                            <div className="form-group half">
                                <label>Color de Fondo</label>
                                <div className="color-picker-wrapper">
                                    <input type="color" value={block.styles?.backgroundColor || '#ffffff'} onChange={(e) => handleStyleChange('backgroundColor', e.target.value)} />
                                    <input type="text" value={block.styles?.backgroundColor || '#ffffff'} onChange={(e) => handleStyleChange('backgroundColor', e.target.value)} />
                                </div>
                            </div>
                            <div className="form-group half">
                                <label>Alineación Global</label>
                                <select value={block.styles?.textAlign || 'left'} onChange={(e) => handleStyleChange('textAlign', e.target.value)}>
                                    <option value="left">Izquierda</option>
                                    <option value="center">Centro</option>
                                    <option value="right">Derecha</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <hr className="divider" />

                    {/* Builder Area */}
                    <div className="builder-area">
                        <h5>Elementos de la Sección</h5>

                        {!block.elements && (
                            <div className="legacy-warning">
                                <p>Esta es una sección antigua. <button onClick={() => onChange({ ...block, elements: [] })} className="btn-link">Convertir a Nuevo Formato</button> (Perderá datos actuales)</p>
                            </div>
                        )}

                        {block.elements && block.elements.map((el, idx) => (
                            <ElementEditor
                                key={el.id || idx}
                                element={el}
                                onChange={(val) => updateElement(idx, val)}
                                onDelete={() => removeElement(idx)}
                                onMoveUp={() => moveElement(idx, -1)}
                                onMoveDown={() => moveElement(idx, 1)}
                                products={products} // Pass products
                                workshops={workshops} // Pass workshops
                            />
                        ))}

                        <div className="add-element-bar">
                            <div className="add-element-bar-title">
                                <span>Agregar: </span>
                            </div>

                            <div className="add-element-bar-body">
                                <button type="button" onClick={() => addElement('heading')}>Título</button>
                                <button type="button" onClick={() => addElement('paragraph')}>Párrafo</button>
                                <button type="button" onClick={() => addElement('image')}>Imagen</button>
                                <button type="button" onClick={() => addElement('button_group')}>Botones</button>
                                <button type="button" onClick={() => addElement('spacer')}>Espacio</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function SectionsEditor({ sections = [], onChange }) {
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [products, setProducts] = useState([]); // State for products
    const [workshops, setWorkshops] = useState([]); // State for workshops
    const { showNotification } = useNotification();
    const { confirm } = useModal();

    useEffect(() => {
        fetchProducts();
        fetchWorkshops();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await api.get('/products?limit=100'); // Get enough products for selector
            if (response.data && response.data.items) {
                setProducts(response.data.items);
            } else if (Array.isArray(response.data)) {
                setProducts(response.data);
            }
        } catch (error) {
            console.error("Error fetching products for selector:", error);
        }
    };

    const fetchWorkshops = async () => {
        try {
            const response = await api.get('/workshop');
            setWorkshops(response.data || []);
        } catch (error) {
            console.error('Error fetching workshops for selector:', error);
        }
    };

    const handleAddSection = () => {
        if (sections.length >= 10) { // Increased limit slightly or as needed
            showNotification('warning', 'Has alcanzado el límite de secciones permitidas.');
            return;
        }
        const newSection = {
            id: Date.now().toString(),
            title: 'Nueva Sección',
            elements: [], // Initialize as new builder section
            visible: true,
            styles: { backgroundColor: '#ffffff', textAlign: 'left' }
        };
        const updatedSections = [...sections, newSection];
        onChange(updatedSections);
    };

    const handleUpdateSection = (index, updatedSection) => {
        const newSections = [...sections];
        newSections[index] = updatedSection;
        onChange(newSections);
    };

    const handleDeleteSection = async (index) => {
        const confirmed = await confirm({
            title: 'Eliminar Sección',
            message: '¿Estás seguro de eliminar esta sección? Todos los elementos dentro de ella se perderán.',
            confirmText: 'Eliminar',
            variant: 'danger'
        });

        if (confirmed) {
            const newSections = sections.filter((_, i) => i !== index);
            onChange(newSections);
        }
    };

    // --- Drag and Drop Logic ---
    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
        // e.dataTransfer.setData("text/html", e.target.parentNode); 
    };

    const handleDragOver = (e, index) => {
        e.preventDefault();
    };

    const handleDrop = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newSections = [...sections];
        const draggedItem = newSections[draggedIndex];

        // Remove from old pos
        newSections.splice(draggedIndex, 1);
        // Insert at new pos
        newSections.splice(index, 0, draggedItem);

        onChange(newSections);
        setDraggedIndex(null);
    };

    const handleMoveSection = (idx, direction) => {
        const newSections = [...sections];
        if (direction === -1 && idx > 0) {
            [newSections[idx], newSections[idx - 1]] = [newSections[idx - 1], newSections[idx]];
        } else if (direction === 1 && idx < newSections.length - 1) {
            [newSections[idx], newSections[idx + 1]] = [newSections[idx + 1], newSections[idx]];
        }
        onChange(newSections);
    };

    return (
        <div className="sections-editor">
            <h4>Editor de Secciones Personalizadas</h4>
            <div className="sections-list">
                {sections.map((section, index) => (
                    <BlockEditor
                        key={section.id || index}
                        block={section}
                        onChange={(updated) => handleUpdateSection(index, updated)}
                        onDelete={() => handleDeleteSection(index)}
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDrop={(e) => handleDrop(e, index)}
                        onMoveUp={() => handleMoveSection(index, -1)}
                        onMoveDown={() => handleMoveSection(index, 1)}
                        isFirst={index === 0}
                        isLast={index === sections.length - 1}
                        products={products} // Pass products to block editor
                        workshops={workshops} // Pass workshops to block editor
                    />
                ))}

                {sections.length === 0 && (
                    <div className="empty-sections-state">
                        <p>No hay secciones personalizadas creadas.</p>
                    </div>
                )}
            </div>

            <div className="add-section-wrapper">
                <Button onClick={handleAddSection} variant="secondary">
                    + Nueva Sección
                </Button>
            </div>
        </div>
    );
}
