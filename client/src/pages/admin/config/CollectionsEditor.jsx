import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import Button from '../../../components/atoms/Button';
import { useModal } from '../../../context/ModalContext';
import './SectionsEditor.css'; // Reuse styles for now
import ImageSettingsEditor from './components/ImageSettingsEditor';
import ImageAdjusterModal from './components/ImageAdjusterModal';
import SmartImage from '../../../components/atoms/SmartImage';

const CollectionItemEditor = ({
    collection,
    index,
    categories,
    products,
    onChange,
    onDelete,
    onDragStart,
    onDragOver,
    onDrop,
    onMoveUp,
    onMoveDown,
    isFirst,
    isLast
}) => {
    const [expanded, setExpanded] = useState(false);
    const [isAdjusterOpen, setIsAdjusterOpen] = useState(false);

    // Determines the title of the collapsed block
    const getTitle = () => {
        if (collection.category_name) return collection.category_name;
        const cat = categories.find(c => String(c.id) === String(collection.category_id));
        return cat ? cat.name : `Colección #${index + 1}`;
    };

    return (
        <div
            className={`block-editor ${expanded ? 'expanded' : 'collapsed'}`}
            draggable={!expanded}
            onDragStart={(e) => !expanded && onDragStart(e, index)}
            onDragOver={(e) => onDragOver(e, index)}
            onDrop={(e) => onDrop(e, index)}
            style={{ marginBottom: '1rem' }}
        >
            <div className="block-header" onClick={() => setExpanded(!expanded)}>
                <div className="block-move-controls" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="btn-icon" disabled={isFirst} title="Subir" style={{ opacity: isFirst ? 0.3 : 1 }}>↑</button>
                    <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="btn-icon" disabled={isLast} title="Bajar" style={{ opacity: isLast ? 0.3 : 1 }}>↓</button>
                </div>

                <div className="block-title-text">
                    <strong style={{ wordBreak: 'break-word', lineHeight: '1.3' }}>{getTitle()}</strong>
                </div>

                <div className="block-actions" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="btn-icon delete" title="Eliminar colección">
                        🗑️
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="btn-icon">
                        {expanded ? '▲' : '▼'}
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="block-body">
                    <div className="form-group">
                        <label>Categoría</label>
                        <select
                            value={collection.category_id}
                            onChange={(e) => onChange('category_id', e.target.value)}
                            style={{ width: '100%', padding: '0.5rem' }}
                        >
                            <option value="">Seleccionar categoría...</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    {collection.category_id && (
                        <div className="form-group">
                            <label>Producto Representativo (Imagen)</label>
                            <select
                                value={collection.product_id}
                                onChange={(e) => onChange('product_id', e.target.value)}
                                style={{ width: '100%', padding: '0.5rem' }}
                            >
                                <option value="">Seleccionar producto...</option>
                                {products.map(prod => (
                                    <option key={prod.id} value={prod.id}>{prod.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {collection.product_image && (
                        <div style={{ marginTop: '1rem', borderTop: '1px dashed #eee', paddingTop: '1rem' }}>
                            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                                <SmartImage 
                                    src={collection.product_image ? `${(import.meta.env.VITE_API_URL || '/api/v1').replace('/api/v1', '')}/static/${collection.product_image}` : null}
                                    settings={collection.image_settings}
                                    style={{
                                        maxWidth: '280px',
                                        border: '2px solid #3182ce',
                                        boxShadow: '0 4px 12px rgba(49, 130, 206, 0.15)',
                                        transition: 'all 0.3s ease'
                                    }}
                                />
                            </div>

                            <button 
                                type="button"
                                className="btn-adjust-image"
                                onClick={() => setIsAdjusterOpen(true)}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: '#ebf8ff',
                                    border: '1px solid #3182ce',
                                    color: '#2c5282',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s',
                                    fontSize: '0.9rem'
                                }}
                            >
                                🎨 Ajustar Encuadre de la Colección
                            </button>
                            
                            <ImageAdjusterModal
                                isOpen={isAdjusterOpen}
                                onClose={() => setIsAdjusterOpen(false)}
                                src={collection.product_image ? `${(import.meta.env.VITE_API_URL || '/api/v1').replace('/api/v1', '')}/static/${collection.product_image}` : null}
                                settings={collection.image_settings}
                                onSave={(settings) => onChange('image_settings', settings)}
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function CollectionsEditor({ collections = [], onChange }) {
    const [categories, setCategories] = useState([]);
    const [productsByCategory, setProductsByCategory] = useState({});
    const [loading, setLoading] = useState(true);

    const [draggedIndex, setDraggedIndex] = useState(null);
    const { confirm } = useModal();

    // Ensure collections is an array
    const safeCollections = Array.isArray(collections) ? collections : [];

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const response = await api.get('/products/categories');
            if (response.data) {
                setCategories(response.data);
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProductsForCategory = async (categoryId) => {
        if (!categoryId || productsByCategory[categoryId]) return;

        try {
            // Fetch products filtered by category
            const response = await api.get(`/products?category_id=${categoryId}`);
            if (response.data) {
                setProductsByCategory(prev => ({
                    ...prev,
                    [categoryId]: response.data
                }));
            }
        } catch (error) {
            console.error(`Error fetching products for category ${categoryId}:`, error);
        }
    };

    const handleAddCollection = () => {
        if (safeCollections.length >= 3) return;
        onChange([...safeCollections, { 
            id: Date.now().toString(), 
            category_id: '', 
            product_id: '', 
            product_image: '' 
        }]);
    };

    const handleRemoveCollection = async (index) => {
        const confirmed = await confirm({
            title: 'Eliminar Colección',
            message: '¿Estás seguro de eliminar esta colección de la página de inicio?',
            confirmText: 'Eliminar',
            variant: 'danger'
        });

        if (confirmed) {
            const newCollections = [...safeCollections];
            newCollections.splice(index, 1);
            onChange(newCollections);
        }
    };

    // --- Drag and Drop Logic ---
    const handleDragStart = (e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
        // e.dataTransfer.setData("text/html", e.target.parentNode); // Needed for Firefox
    };

    const handleDragOver = (e, index) => {
        e.preventDefault(); // Necessary to allow dropping
        // Ideally add visual cue here
    };

    const handleDrop = (e, index) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newCollections = [...safeCollections];
        const draggedItem = newCollections[draggedIndex];

        // Remove from old pos
        newCollections.splice(draggedIndex, 1);
        // Insert at new pos
        newCollections.splice(index, 0, draggedItem);

        onChange(newCollections);
        setDraggedIndex(null);
    };

    const handleMoveCollection = (idx, direction) => {
        const newCollections = [...safeCollections];
        if (direction === -1 && idx > 0) {
            [newCollections[idx], newCollections[idx - 1]] = [newCollections[idx - 1], newCollections[idx]];
        } else if (direction === 1 && idx < newCollections.length - 1) {
            [newCollections[idx], newCollections[idx + 1]] = [newCollections[idx + 1], newCollections[idx]];
        }
        onChange(newCollections);
    };

    const updateCollection = (index, field, value) => {
        const newCollections = [...safeCollections];
        let item = { ...newCollections[index] };

        // Handle nested updates (e.g., image_settings)
        // ImageSettingsEditor always returns the full settings object, so we replace entirely
        // to avoid stale merges that could lose shape/radius/position data
        if (field === 'image_settings') {
            item.image_settings = value;
        } else {
            item[field] = value;
        }

        // Reset product if category changes
        if (field === 'category_id') {
            item.product_id = '';
            item.product_image = '';
            item.category_name = categories.find(c => String(c.id) === String(value))?.name || '';
            fetchProductsForCategory(value);
        }

        // Set image and inherit NDE settings if product changes
        if (field === 'product_id') {
            const products = productsByCategory[item.category_id] || [];
            const product = products.find(p => p.id === value);
            if (product) {
                if (product.images && product.images.length > 0) {
                    item.product_image = product.images[0];
                }
                // Inherit product's NDE settings as a starting point for the collection
                if (product.image_settings) {
                    item.image_settings = { ...product.image_settings };
                }
            }
        }

        newCollections[index] = item;
        onChange(newCollections);
    };

    // Load products for existing collections on mount
    useEffect(() => {
        safeCollections.forEach(item => {
            if (item.category_id) {
                fetchProductsForCategory(item.category_id);
            }
        });
    }, [safeCollections.length]);

    if (loading) return <div>Cargando categorías...</div>;

    return (
        <div className="sections-editor">
            <div className="editor-header">
                <h3>Colecciones Destacadas ({safeCollections.length}/3)</h3>
                <p className="helper-text" style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                    Usa las flechas ↑↓ para reordenar. Puedes mostrar hasta 3.
                </p>
            </div>

            <div className="sections-list">
                {safeCollections.map((collection, index) => (
                    <CollectionItemEditor
                        key={collection.id || index}
                        index={index}
                        collection={collection}
                        categories={categories}
                        products={productsByCategory[collection.category_id] || []}
                        onChange={(field, value) => updateCollection(index, field, value)}
                        onDelete={() => handleRemoveCollection(index)}
                        onDragStart={handleDragStart}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onMoveUp={() => handleMoveCollection(index, -1)}
                        onMoveDown={() => handleMoveCollection(index, 1)}
                        isFirst={index === 0}
                        isLast={index === safeCollections.length - 1}
                    />
                ))}

                {safeCollections.length === 0 && (
                    <div className="empty-sections-state" style={{ padding: '2rem', textAlign: 'center', background: '#f9f9f9', borderRadius: '8px', border: '1px dashed #ccc' }}>
                        <p style={{ color: '#888', fontStyle: 'italic', marginBottom: '1rem' }}>No hay colecciones destacadas visibles.</p>
                        <Button onClick={handleAddCollection} size="sm">
                            + Crear Primera Colección
                        </Button>
                    </div>
                )}

                {safeCollections.length > 0 && safeCollections.length < 3 && (
                    <div className="add-section-wrapper" style={{ marginTop: '1rem' }}>
                        <Button onClick={handleAddCollection} variant="secondary">
                            + Nueva Colección
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
