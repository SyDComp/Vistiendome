import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../../../components/atoms/Button';
import Input from '../../../components/atoms/Input';
import api from '../../../services/api';
import { authService } from '../../../services/authService';
import { useNotification } from '../../../context/NotificationContext';
import ImageSettingsEditor from '../config/components/ImageSettingsEditor';
import ImageAdjusterModal from '../config/components/ImageAdjusterModal';
import GallerySelectorModal from '../gallery/GallerySelectorModal';
import SmartImage from '../../../components/atoms/SmartImage';
import './ProductForm.css';

export default function ProductForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEdit = !!id;

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        stock: '',
        category_id: '',
        mercadolibre_url: '',
        height: '',
        width: '',
        depth: '',
        image_settings: { zoom: 1, x: 0, y: 0 }
    });
    const [categories, setCategories] = useState([]);
    const [image, setImage] = useState(null); // Local file upload
    const [galleryImage, setGalleryImage] = useState(null); // Selected from gallery
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isAdjusterOpen, setIsAdjusterOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { showNotification } = useNotification();

    // Fetch Categories
    useEffect(() => {
        api.get('/products/categories')
            .then(res => setCategories(res.data))
            .catch(err => console.error(err));

        if (isEdit) {
            setLoading(true);
            api.get(`/products/${id}`)
                .then(res => {
                    const data = res.data;
                    setFormData({
                        name: data.name,
                        description: data.description || '',
                        price: data.price,
                        stock: data.stock,
                        category_id: data.category_id,
                        mercadolibre_url: data.mercadolibre_url || '',
                        height: data.height || '',
                        width: data.width || '',
                        depth: data.depth || '',
                        images: data.images || [],
                        image_settings: data.image_settings || { zoom: 1, x: 0, y: 0 }
                    });
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [id, isEdit]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setImage(e.target.files[0]);
            setGalleryImage(null); // Clear gallery selection if local file
        }
    };

    const handleGallerySelect = (url, fileData) => {
        setGalleryImage(fileData.path); // Store relative path
        setImage(null); // Clear local file if gallery image
        setFormData(prev => ({ ...prev, images: [fileData.path] })); // Send this to API
        setIsGalleryOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // 1. Basic Validation
        if (!formData.name.trim()) {
            showNotification('error', 'El nombre del producto es obligatorio');
            return;
        }
        if (!formData.price || parseFloat(formData.price) <= 0) {
            showNotification('error', 'El precio debe ser un número mayor a 0');
            return;
        }
        if (!formData.category_id) {
            showNotification('error', 'Debes seleccionar una categoría');
            return;
        }

        setLoading(true);

        const url = isEdit ? `/products/${id}` : '/products';
        const method = isEdit ? 'patch' : 'post';

        try {
            // Get current user
            const currentUser = authService.getCurrentUser();
            if (!currentUser || !currentUser.id) {
                showNotification('error', 'Sesión expirada o inválida. Por favor inicia sesión nuevamente.');
                setLoading(false);
                return;
            }

            // Prepare payload
            const rawData = { ...formData };
            if (!isEdit) rawData.artisan_id = currentUser.id;

            // Clean numeric fields
            ['price', 'stock'].forEach(field => {
                rawData[field] = Number(rawData[field]) || 0;
            });

            ['height', 'width', 'depth'].forEach(field => {
                if (rawData[field] === '' || rawData[field] === null || rawData[field] === undefined) {
                    rawData[field] = null;
                } else {
                    const val = parseFloat(rawData[field]);
                    rawData[field] = isNaN(val) ? null : val;
                }
            });

            // If a gallery image was selected, ensure it is in the payload
            if (galleryImage && !image) {
                rawData.images = [galleryImage];
            }

            // 1. Save Basic Data
            const response = await api[method](url, rawData);
            const product = response.data;

            // 2. Upload Image if selected
            if (image) {
                try {
                    const uploadData = new FormData();
                    uploadData.append('file', image);

                    await api.post(`/products/${product.id}/images`, uploadData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                } catch (imgError) {
                    console.error('Image upload failed:', imgError);
                    showNotification('warning', `✅ Producto "${product.name}" creado con descripción y precio. ⚠️ La imagen no se pudo subir (intenta editarlo para agregar la imagen).`);
                    navigate('/admin/products');
                    return;
                }
            }

            showNotification('success', isEdit ? 'Producto actualizado correctamente' : 'Producto creado correctamente');
            navigate('/admin/products');

        } catch (error) {
            console.error('API Error:', error);
            const detail = error.response?.data?.detail;
            const message = typeof detail === 'string' ? detail : 
                            Array.isArray(detail) ? detail.map(d => d.msg).join(', ') :
                            'Error al guardar el producto';
            showNotification('error', message);
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEdit) return <div>Cargando...</div>;

    const currentImgSrc = image ? URL.createObjectURL(image) : galleryImage ? `${(import.meta.env.VITE_API_URL || '').replace('/api/v1', '')}/static/${galleryImage}` : formData.images?.[0] ? `${(import.meta.env.VITE_API_URL || '').replace('/api/v1', '')}/static/${formData.images?.[0]}` : null;

    return (
        <div style={{ display: 'flex', justifyContent: 'center', width: '100%', padding: '2rem' }}>
            <div className="admin-page" style={{ maxWidth: '1000px', width: '100%' }}>
                <h2>{isEdit ? 'Editar Producto' : 'Nuevo Producto'}</h2>

                <form onSubmit={handleSubmit} className="card" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <Input
                        label="Nombre del Producto"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                    />

                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Descripción</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="4"
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #ddd' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: '1rem' }}>
                        <Input
                            label="Precio ($)"
                            name="price"
                            type="number"
                            value={formData.price}
                            onChange={handleChange}
                            required
                        />
                        <Input
                            label="Stock Inicial"
                            name="stock"
                            type="number"
                            value={formData.stock}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Categoría</label>
                        <select
                            name="category_id"
                            value={formData.category_id}
                            onChange={handleChange}
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '4px', border: '1px solid #ddd' }}
                            required
                        >
                            <option value="">Selecciona una categoría</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <Input
                        label="Enlace de MercadoLibre (Opcional)"
                        name="mercadolibre_url"
                        value={formData.mercadolibre_url}
                        onChange={handleChange}
                        placeholder="https://articulo.mercadolibre.com.ar/..."
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '1rem' }}>
                        <Input
                            label="Alto (cm)"
                            name="height"
                            type="number"
                            step="0.01"
                            value={formData.height}
                            onChange={handleChange}
                            placeholder="Ej: 80"
                        />
                        <Input
                            label="Ancho (cm)"
                            name="width"
                            type="number"
                            step="0.01"
                            value={formData.width}
                            onChange={handleChange}
                            placeholder="Ej: 120"
                        />
                        <Input
                            label="Largo/Fondo (cm)"
                            name="depth"
                            type="number"
                            step="0.01"
                            value={formData.depth}
                            onChange={handleChange}
                            placeholder="Ej: 60"
                        />
                    </div>

                    <div className="form-group" style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '1rem', fontWeight: 'bold', fontSize: '1.1rem' }}>
                            Ajustes de Imagen y Previsualización
                        </label>

                        <div className="image-adjustments" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="image-field">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                                    Imagen Principal {isEdit && '(Déjalo vacío para mantener actual)'}
                                </label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.8rem', background: '#f8fafc', padding: '0.8rem', borderRadius: '6px', border: '1px solid #e2e8f0', boxSizing: 'border-box', overflow: 'hidden' }}>
                                    <Button
                                        type="button"
                                        onClick={() => document.getElementById('product-image-upload').click()}
                                        variant="secondary"
                                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', flex: '1 1 auto', whiteSpace: 'nowrap' }}
                                    >
                                        Subir imagen
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={() => setIsGalleryOpen(true)}
                                        variant="outline"
                                        style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', flex: '1 1 auto', whiteSpace: 'nowrap' }}
                                    >
                                        🖼️ Galería
                                    </Button>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b', flex: '1 1 120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {image ? image.name : galleryImage ? `Seleccionado: ${galleryImage.split('/').pop()}` : 'Sin archivos seleccionados'}
                                    </span>
                                    <input
                                        id="product-image-upload"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageChange}
                                        style={{ display: 'none' }}
                                    />
                                </div>
                            </div>
                            
                            <div className='container-flex'>
                                { currentImgSrc ? (
                                    <div style={{ width: '100%' }}>
                                        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                                            <SmartImage 
                                                src={currentImgSrc}
                                                settings={formData.image_settings}
                                                style={{
                                                    maxWidth: '430px',
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
                                                padding: '1rem',
                                                background: '#ebf8ff',
                                                border: '1px solid #3182ce',
                                                color: '#2c5282',
                                                borderRadius: '10px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '10px',
                                                transition: 'all 0.2s',
                                                fontSize: '1rem'
                                            }}
                                        >
                                            🎨 Ajustar Encuadre y Zoom
                                        </button>

                                        <ImageAdjusterModal
                                            isOpen={isAdjusterOpen}
                                            onClose={() => setIsAdjusterOpen(false)}
                                            src={currentImgSrc}
                                            settings={formData.image_settings}
                                            onSave={(settings) => setFormData(prev => ({ ...prev, image_settings: settings }))}
                                        />
                                    </div>
                                ) : (
                                    <div className="empty-preview" style={{ 
                                        width: '100%', 
                                        padding: '3rem 1rem', 
                                        background: '#f8fafc', 
                                        borderRadius: '12px', 
                                        border: '2px dashed #cbd5e0', 
                                        textAlign: 'center',
                                        color: '#64748b'
                                    }}>
                                        <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '1rem' }}>🖼️</span>
                                        <p style={{ fontWeight: '500' }}>Selecciona una imagen para habilitar el encuadre</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Guardando...' : 'Guardar Producto'}
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => navigate('/admin/products')}>
                            Cancelar
                        </Button>
                    </div>
                </form>

                <GallerySelectorModal
                    isOpen={isGalleryOpen}
                    onClose={() => setIsGalleryOpen(false)}
                    onSelect={handleGallerySelect}
                    type="image"
                    selectedUrl={galleryImage || (isEdit ? formData.images?.[0] : null)}
                />
            </div>
        </div>
    );
}
