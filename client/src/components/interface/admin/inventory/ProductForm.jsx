import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from '../../../../hooks/useForm';
import Input from '../../../ui/Input';
import Button from '../../../ui/Button';
import SmartCanvas from '../../../ui/SmartCanvas';
import MediaGallery from '../media/MediaGallery';
import VariantMatrix from './VariantMatrix';
import VariantPicker from './VariantPicker';
import DetailDrawer from '../../../ui/admin/DetailDrawer';
import CharacteristicForm from './CharacteristicForm';
import LibraryPicker from './LibraryPicker';
import { useNotification } from '../../../../context/NotificationContext';
import { Search, Image as ImageIcon, Box, Layout, Layers, Settings, Save, ArrowLeft, Trash2, Edit3, Plus, X, Folder, Sparkles, Package, Check, AlertCircle } from 'lucide-react';
import { formatChar, formatOpt } from '../../../../utils/formatters';
import AdminFormLayout, { AdminFormRow, AdminFormSection, AdminFormSubmit } from '../../../ui/admin/AdminFormLayout';

const API_BASE = `${(window.location.origin.includes('localhost') ? 'http://localhost:8000' : '')}/api/v1/admin/catalog`;

const ProductForm = ({ initialData, onSuccess, onRefresh, autoOpenVariants = false }) => {
    const { toast } = useNotification();
    const [productId, setProductId] = useState(initialData?.id || null);
    const [batchErrors, setBatchErrors] = useState(null);
    const [categories, setCategories] = useState([]);
    const [dynamicAttributes, setDynamicAttributes] = useState([]);
    const [selectedImage, setSelectedImage] = useState(null);
    const [productImages, setProductImages] = useState(initialData?.images || []);
    const [showGallery, setShowGallery] = useState(false);
    const [allAttributes, setAllAttributes] = useState([]);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [isSaved, setIsSaved] = useState(!!initialData?.id);

    // Configuración para la generación de variantes
    const [variantAttributes, setVariantAttributes] = useState([]);
    const [generatedVariants, setGeneratedVariants] = useState(initialData?.skus || []);
    const [suggestedSpecs, setSuggestedSpecs] = useState([]);
    const [showVariantPicker, setShowVariantPicker] = useState(false);
    const [showVersionLibrary, setShowVersionLibrary] = useState(false);
    const [selectedVariant, setSelectedVariant] = useState(null);
    const [selectedVariantIndices, setSelectedVariantIndices] = useState([]); // Índices para acción masiva
    const [showMassGallery, setShowMassGallery] = useState(false); // Galería para asignación masiva
    const [showVariantDetail, setShowVariantDetail] = useState(false);
    const [gallerySelectMode, setGallerySelectMode] = useState(false); // MEMORIA MODO SELECCIÓN
    const [allSpecifications, setAllSpecifications] = useState([]);
    const [showCarouselGallery, setShowCarouselGallery] = useState(false);

    const { values, errors, handleChange, handleSubmit, isSubmitting, setValues } = useForm({
        name: initialData?.name || '',
        slug: initialData?.slug || '',
        description: initialData?.description || '',
        category_id: initialData?.category_id || '',
        extras: initialData?.extras || {}
    }, (v) => {
        const err = {};
        if(!v.name) err.name = "El nombre es obligatorio";
        if(!v.category_id) err.category_id = "Selecciona una categoría";
        return err;
    });

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        
        // Cargar Categorías
        fetch(`${API_BASE}/categories?page_size=200`)
            .then(res => res.json())
            .then(data => setCategories(data.items || []));

        // Cargar Atributos Globales
        fetch(`${API_BASE}/attributes`)
            .then(res => res.json())
            .then(data => setAllAttributes(data || []));

        // Cargar Especificaciones Globales
        fetch(`${API_BASE}/specifications?page_size=200`)
            .then(res => res.json())
            .then(data => setAllSpecifications(data || []));

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Cargar Atributos Dinámicos y Sugerencias al cambiar de categoría
    useEffect(() => {
        if (values.category_id) {
            // Características Heredadas (Template)
            fetch(`${API_BASE}/categories/${values.category_id}/attributes`)
                .then(res => res.json())
                .then(setDynamicAttributes)
                .catch(console.error);
            
            // Especificaciones Sugeridas
            fetch(`${API_BASE}/categories/${values.category_id}/specifications`)
                .then(res => res.json())
                .then(setSuggestedSpecs)
                .catch(console.error);
        } else {
            setDynamicAttributes([]);
            setSuggestedSpecs([]);
        }
    }, [values.category_id]);

    // Automatización de Slug con prefijo 'pr-' obligatorio
    useEffect(() => {
        if (!initialData && values.name) {
            const cleanName = values.name
                .toLowerCase()
                .normalize('NFKD')
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/[\s-]+/g, '_')
                .replace(/^_+|_+$/g, ''); // Limpiar guiones bajos al inicio/final
            
            const slug = `pr-${cleanName}`;
            setValues(prev => ({ ...prev, slug }));
        }
    }, [values.name, initialData, setValues]);
    useEffect(() => {
        if (autoOpenVariants && productId) {
            setShowVariantPicker(true);
        }
    }, [autoOpenVariants, productId]);

    // Lógica de Agregación de Imágenes (Universo del Producto)
    // El "Universo" son todas las imágenes únicas de todas las variantes generadas.
    const [allImagesUniverse, setAllImagesUniverse] = useState([]);

    useEffect(() => {
        const universe = [];
        const seenIds = new Set();

        generatedVariants.forEach(variant => {
            // Caso: media_assets (Nuevo estándar relacional)
            if (variant.media_assets && Array.isArray(variant.media_assets)) {
                variant.media_assets.forEach(asset => {
                    if (asset && asset.id && !seenIds.has(asset.id)) {
                        seenIds.add(asset.id);
                        universe.push(asset);
                    }
                });
            }
            // Fallback: image_urls (Legacy strings - los convertimos a un objeto básico si no hay assets)
            else if (variant.image_urls && Array.isArray(variant.image_urls)) {
                variant.image_urls.forEach(url => {
                    // Nota: esto es sub-óptimo, lo ideal es que siempre lleguen assets
                    if (url && !seenIds.has(url)) {
                        seenIds.add(url);
                        universe.push({ url, id: null });
                    }
                });
            }
        });

        setAllImagesUniverse(universe);
        
        // Sincronización: Si se borra una versión, limpiamos del producto
        if (productImages.length > 0) {
            const validImages = productImages.filter(pi => seenIds.has(pi.media_asset_id || pi.url));
            if (validImages.length !== productImages.length) {
                setProductImages(validImages);
                if (selectedImage && !seenIds.has(selectedImage.media_asset_id || selectedImage.url)) {
                    setSelectedImage(validImages[0] || null);
                }
            }
        }
    }, [generatedVariants]);

    const handleToggleProductImage = (asset) => {
        if (!asset || !asset.id) return;
        const alreadyIn = productImages.find(pi => pi.media_asset_id === asset.id);
        if (alreadyIn) {
            removeImage(asset.id);
        } else {
            const newImg = { 
                media_asset_id: asset.id,
                url: asset.url, 
                is_main: productImages.length === 0
            };
            const updated = [...productImages, newImg];
            setProductImages(updated);
            if (!selectedImage) setSelectedImage(newImg);
        }
    };

    const removeImage = (id) => {
        const filtered = productImages.filter(img => img.media_asset_id !== id);
        setProductImages(filtered);
        if (selectedImage?.media_asset_id === id) {
            setSelectedImage(filtered[0] || null);
        }
    };

    const setMainImage = (id) => {
        if (!id) return;
        setProductImages(productImages.map(img => ({ ...img, is_main: img.media_asset_id === id })));
    };

    const toggleCarouselImage = (url) => {
        const currentCarousel = values.extras?.preview_carousel || [];
        let updatedCarousel;
        if (currentCarousel.includes(url)) {
            updatedCarousel = currentCarousel.filter(u => u !== url);
        } else {
            updatedCarousel = [...currentCarousel, url];
        }
        setValues(prev => ({
            ...prev,
            extras: { ...prev.extras, preview_carousel: updatedCarousel }
        }));
    };

    const updateCarouselSpeed = (speed) => {
        setValues(prev => ({
            ...prev,
            extras: { ...prev.extras, carousel_speed: parseInt(speed) }
        }));
    };

    const addCustomExtra = async () => {
        const key = await prompt("¿Cómo se llama esta característica fija? (ej: Material, Cuello, Largo Total)");
        if (key) {
            setValues(prev => ({
                ...prev,
                extras: { ...prev.extras, [key]: '' }
            }));
        }
    };

    const processVariants = async () => {
        if (!values.category_id) return toast.error("Selecciona una categoría primero para generar variantes.");
        
        const payload = {
            product_name: values.name,
            category_id: parseInt(values.category_id),
            attributes: variantAttributes
                .filter(a => a.name && a.values)
                .map(a => ({ 
                    name: formatChar(a.name), 
                    values: a.values.split(',').map(v => formatOpt(v.trim())) 
                }))
        };

        try {
            const res = await fetch(`${API_BASE}/generate-variants`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            setGeneratedVariants(data);
        } catch (err) { console.error(err); }
    };

    const handleMassImageAssign = (selectedMedia) => {
        if (!selectedVariantIndices.length) return;
        
        const assetsToAdd = Array.isArray(selectedMedia) ? selectedMedia : [selectedMedia];
        const updatedVariants = [...generatedVariants];
        
        selectedVariantIndices.forEach(idx => {
            const variant = updatedVariants[idx];
            if (variant) {
                const currentAssets = variant.media_assets || [];
                const currentIds = new Set(currentAssets.map(a => a.id));
                
                // Filtrar solo las nuevas
                const newUniqueAssets = assetsToAdd.filter(a => !currentIds.has(a.id));
                const nextAssets = [...currentAssets, ...newUniqueAssets];
                
                updatedVariants[idx] = { 
                    ...variant, 
                    media_assets: nextAssets,
                    media_ids: nextAssets.map(a => a.id)
                };
            }
        });

        setGeneratedVariants(updatedVariants);
        setSelectedVariantIndices([]);
        setShowMassGallery(false);
        setShowVersionLibrary(true);
        toast.success(`Fotos asignadas a ${selectedVariantIndices.length} versiones con éxito.`);
    };

    const onSave = async (formValues, skusOverride = null) => {
        const payload = {
            ...formValues,
            category_id: parseInt(formValues.category_id),
            images: productImages.map(img => ({
                media_asset_id: img.media_asset_id || img.id,
                is_main: img.is_main
            })),
            skus: (skusOverride || generatedVariants).map(s => ({
                ...s,
                media_ids: s.media_ids || (s.media_assets?.map(a => a.id)) || []
            })),
            extras: {
                ...formValues.extras,
                carousel_speed: formValues.extras?.carousel_speed || 3000,
                preview_carousel: formValues.extras?.preview_carousel || []
            }
        };

        const isNew = !productId;
        const method = productId ? 'PUT' : 'POST';
        const url = productId ? `${API_BASE}/products/${productId}` : `${API_BASE}/products`;

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const result = await res.json();
                
                if (result.errors && result.errors.length > 0) {
                    setBatchErrors(result.errors);
                    toast.info(`Guardado parcial: ${result.success_count} exitosos, ${result.error_count} con errores.`, "Atención");
                    // No llamamos a onSuccess ni cerramos para permitir corrección
                } else {
                    setBatchErrors(null);
                    toast.success(isNew ? 'Producto base creado con éxito' : 'Producto actualizado');
                    
                    // Refrescar tabla en segundo plano
                    if (onRefresh) onRefresh();

                    if (isNew) {
                        setProductId(result.id);
                        setIsSaved(true);
                    } else {
                        // Comentamos onSuccess() para evitar que el componente padre (Modal/Drawer) cierre este formulario.
                        // El usuario desea que NO se cierre al guardar para seguir editando.
                        // if (onSuccess) onSuccess(); 
                    }
                }
            } else {
                const err = await res.json();
                toast.error(err.detail || "Error al guardar");
            }
        } catch (err) { 
            console.error("Error:", err); 
            toast.error("Error de conexión");
        }
    };

    return (
        <AdminFormLayout
            title={initialData ? 'Editar Producto' : 'Crear Nuevo Producto'}
            icon={Layout}
            splitLayout={true}
            rightPanel={
                <div className="product-right-panel">
                    <div className="product-gallery-card">
                        {/* Función para importar TODO del universo a la galería principal */}
                        <div className="product-gallery-header">
                            <div className="product-gallery-title-wrapper">
                                <div className="product-gallery-icon">
                                    <ImageIcon size={20} />
                                </div>
                                <div>
                                    <h4 className="product-gallery-title">Galería Multimedia</h4>
                                    <p className="product-gallery-subtitle">Fotos activas en el catálogo.</p>
                                </div>
                            </div>
                        </div>

                        <div className="product-carousel-wrapper">
                            <div className="product-carousel-header">
                                <h5 className="product-carousel-title">
                                    <Sparkles size={16} color="#f59e0b" /> Carrusel de Catálogo
                                </h5>
                                <button 
                                    type="button"
                                    onClick={() => setShowCarouselGallery(true)}
                                    className="product-carousel-btn"
                                >
                                    GESTIONAR SELECCIÓN
                                </button>
                            </div>
                            <p className="product-carousel-desc">
                                Usa el explorador para elegir qué fotos rotarán automáticamente en el catálogo.
                            </p>
                            
                            <div className="product-carousel-speed">
                                <label className="product-carousel-speed-label">
                                    VELOCIDAD DE ROTACIÓN
                                </label>
                                <select 
                                    value={values.extras?.carousel_speed || 3000} 
                                    onChange={(e) => updateCarouselSpeed(e.target.value)}
                                    className="product-carousel-speed-select"
                                >
                                    <option value="2000">Rápida (2 seg)</option>
                                    <option value="3000">Normal (3 seg)</option>
                                    <option value="5000">Lenta (5 seg)</option>
                                    <option value="10000">Muy Lenta (10 seg)</option>
                                </select>
                            </div>

                            <div className="product-carousel-summary">
                                <span className="product-carousel-summary-text">
                                    Resumen: {values.extras?.preview_carousel?.length || 0} fotos en el carrusel.
                                </span>
                            </div>

                            <MediaGallery 
                                isOpen={showCarouselGallery}
                                onClose={() => setShowCarouselGallery(false)}
                                selectionMode={true}
                                allowMultiple={true}
                                itemsPool={allImagesUniverse}
                                initialSelected={productImages.map(img => img.media_asset_id || img.id)}
                                mainId={productImages.find(img => img.is_main)?.media_asset_id || productImages.find(img => img.is_main)?.id}
                                contextInfo="Gestión de Galería"
                                onSetMain={(img) => {
                                    const assetId = img.id;
                                    // 1. Actualizar is_main en productImages (Galería)
                                    setProductImages(prev => prev.map(pi => ({
                                        ...pi,
                                        is_main: (pi.media_asset_id || pi.id) === assetId
                                    })));

                                    // 2. Sincronizar con el Carrusel: Mover la portada a la primera posición para que sea determinista
                                    setValues(prev => {
                                        const currentCarousel = prev.extras?.preview_carousel || [];
                                        const coverIndex = currentCarousel.findIndex(c => c.id === assetId);
                                        
                                        if (coverIndex !== -1) {
                                            const newCarousel = [...currentCarousel];
                                            const [coverObj] = newCarousel.splice(coverIndex, 1);
                                            newCarousel.unshift(coverObj); // Portada siempre primero
                                            return { ...prev, extras: { ...prev.extras, preview_carousel: newCarousel } };
                                        }
                                        return prev;
                                    });
                                    
                                    toast.success("Portada actualizada y sincronizada");
                                }}
                                onSelect={(selected) => {
                                    // Las imágenes seleccionadas en el modal pasan a ser la galería del producto
                                    const newProductImages = selected.map((img, idx) => {
                                        const existing = productImages.find(pi => (pi.media_asset_id || pi.id) === img.id);
                                        return {
                                            media_asset_id: img.id,
                                            url: img.url,
                                            is_main: existing ? existing.is_main : (idx === 0 && !productImages.some(pi => pi.is_main))
                                        };
                                    });
                                    setProductImages(newProductImages);
                                    
                                    // Carrusel determinista: Objetos completos con la portada al principio
                                    const mainImage = newProductImages.find(pi => pi.is_main);
                                    const otherImages = selected.filter(img => img.id !== mainImage?.media_asset_id);
                                    
                                    const finalCarousel = [];
                                    if (mainImage) {
                                        const mainObj = selected.find(s => s.id === mainImage.media_asset_id);
                                        if (mainObj) finalCarousel.push({ id: mainObj.id, url: mainObj.url, filename: mainObj.filename || '' });
                                    }
                                    
                                    otherImages.forEach(img => {
                                        finalCarousel.push({ id: img.id, url: img.url, filename: img.filename || '' });
                                    });
                                    
                                    
                                    setValues(prev => ({
                                        ...prev,
                                        extras: { ...prev.extras, preview_carousel: finalCarousel }
                                    }));

                                    setShowCarouselGallery(false);
                                    toast.success("Galería y Carrusel sincronizados con éxito");
                                }}
                            />
                        </div>
                    </div>
                </div>
            }
        >
            {batchErrors && (
                <div className="product-batch-errors">
                    <div className="product-batch-errors-header">
                        <div className="product-batch-errors-title">
                            <AlertCircle size={18} />
                            <span>Errores de Persistencia ({batchErrors.length})</span>
                        </div>
                        <button type="button" onClick={() => setBatchErrors(null)} className="product-batch-errors-close">OCULTAR</button>
                    </div>
                    <div className="product-batch-errors-list">
                        {batchErrors.map((err, idx) => (
                            <div key={idx} className="product-batch-error-item">
                                <span style={{ fontWeight: '700' }}>{err.sku}</span>
                                <span>{err.error}</span>
                            </div>
                        ))}
                    </div>
                    <p className="product-batch-errors-note">
                        Nota: Las versiones que no aparecen aquí se guardaron correctamente. Por favor corrige los códigos de arriba y vuelve a intentar.
                    </p>
                </div>
            )}
            
            <form onSubmit={handleSubmit(onSave)}>
                {/* Secciones del Formulario */}
                <AdminFormRow balanced>
                    <Input label="Nombre del Producto" name="name" value={values.name} onChange={handleChange} error={errors.name} placeholder="Ej: Vestido Noemi Azul" />
                    <Input label="Identificador URL (Automático)" name="slug" value={values.slug} readOnly style={{ backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }} />
                </AdminFormRow>

                <AdminFormSection 
                    title="Ficha Técnica (Datos fijos)" 
                    badge="DATOS INFORMATIVOS"
                    description="Detalles globales (ej: Cuidado de la tela, Origen - Aplica a todas las versiones)."
                >
                    <textarea 
                        name="description" 
                        value={values.description} 
                        onChange={handleChange} 
                        placeholder="Escribe aquí los detalles que enamorarán a tu cliente..."
                        className="product-form-textarea"
                    ></textarea>
                </AdminFormSection>

                        <div className="product-form-select-wrapper">
                            <div>
                                <label className="product-form-label">Categoría Base</label>
                                <select 
                                    name="category_id" 
                                    value={values.category_id} 
                                    onChange={handleChange} 
                                    className="product-form-select"
                                >
                                    <option value="">-- Seleccionar Categoría --</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>


                        {/* SECCIÓN 3: CENTRO DE VERSIONES (HUB) - BLOQUEADO SI NO ESTÁ GUARDADO */}
                        <div className={`product-hub-wrapper ${isMobile ? 'mobile' : 'desktop'}`}>
                            {!isSaved && (
                                <div className="product-hub-overlay">
                                    <div className="product-hub-overlay-content">
                                        <div className="product-hub-overlay-icon">
                                            <Package size={32} />
                                        </div>
                                        <h4 className="product-hub-overlay-title">Gestión de Versiones</h4>
                                        <p className="product-hub-overlay-desc">
                                            Para empezar a crear tallas, colores e imágenes específicas, primero debes **confirmar el Producto Base**.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className={`product-hub-header ${isMobile ? 'mobile' : 'desktop'}`}>
                                <div>
                                    <h4 className="product-hub-title">
                                        <Package size={20} color="#8f0653" /> Centro de Versiones (Variantes)
                                    </h4>
                                    <p className="product-hub-desc">Crea los SKUs con sus características y fotos propias.</p>
                                </div>
                            </div>

                            <div className={`product-hub-buttons ${isMobile ? 'mobile' : 'desktop'}`}>
                                {/* Botón "CREAR NUEVA VERSIÓN" */}
                                <button
                                    type="button"
                                    onClick={() => setShowVariantPicker(true)}
                                    className="product-hub-btn-add"
                                >
                                    <div className="product-hub-btn-add-icon">
                                        <Plus size={24} />
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <span className="product-hub-btn-title">Añadir Versión</span>
                                        <span className="product-hub-btn-desc">Mezcla opciones y sube fotos</span>
                                    </div>
                                </button>

                                {/* Botón "BIBLIOTECA DE VERSIONES" */}
                                <button
                                    type="button"
                                    onClick={() => setShowVersionLibrary(true)}
                                    className="product-hub-btn-lib"
                                >
                                    <div className="product-hub-btn-lib-icon">
                                        <Package size={24} />
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <span className="product-hub-btn-title">Ver Mi Galería de SKUs</span>
                                        <span className="product-hub-btn-lib-desc">
                                            {generatedVariants.length} versiones activas
                                        </span>
                                    </div>
                                </button>
                            </div>

                            {generatedVariants.length > 0 && (
                                <div className="product-hub-clear-wrapper">
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            if (window.confirm("¿Estás seguro de que deseas limpiar todo el área de trabajo local? Esto no borrará versiones que ya estén guardadas permanentemente en la base de datos hasta que presiones Guardar Cambios.")) {
                                                setGeneratedVariants([]);
                                                toast.info("Workspace local limpiado. Las versiones en servidor permanecen intactas.");
                                            }
                                        }}
                                        className="product-hub-clear-btn"
                                    >
                                        <Trash2 size={14} /> LIMPIAR ESPACIO DE TRABAJO LOCAL
                                    </button>
                                </div>
                            )}

                            <LibraryPicker 
                                isOpen={showVersionLibrary}
                                onClose={() => setShowVersionLibrary(false)}
                                title="Biblioteca de Versiones"
                                description="Haz clic en una versión para editarla o activa 'Selección' para gestionar fotos en masa."
                                type="variants"
                                labelSingular="versión"
                                labelPlural="versiones"
                                enableSelectionMode={true}
                                confirmLabel="Siguiente: Seleccionar Fotos" // Texto masivo propositivo
                                initialSelectedIds={selectedVariantIndices} // PERSISTENCIA DE SELECCIÓN
                                items={generatedVariants.map((v, idx) => ({ 
                                    id: idx, 
                                    name: Object.values(v.config).join(' / ') || 'Base',
                                    price: v.price,
                                    stock: v.stock,
                                    sku: v.sku,
                                    image: (v.image_urls && v.image_urls.length > 0) ? v.image_urls[0] : v.images?.find(img => img.is_main)?.url,
                                    fullData: v
                                }))}
                                onItemClick={(selected) => {
                                    setSelectedVariant({ ...selected.fullData, index: selected.id });
                                    setShowVariantDetail(true);
                                }}
                                onSelect={(selectedVariants) => {
                                    if (selectedVariants.length > 0) {
                                        const indices = selectedVariants.map(v => v.id);
                                        setSelectedVariantIndices(indices);
                                        setShowVersionLibrary(false); // CERRAMOS Biblioteca
                                        setTimeout(() => setShowMassGallery(true), 100); // ABRIMOS Galería
                                    }
                                }}
                            />

                            <MediaGallery 
                                isOpen={showMassGallery}
                                onClose={() => {
                                    setShowMassGallery(false);
                                    setShowVersionLibrary(true); // RETORNO al cerrar sin acción
                                }}
                                selectionMode={true}
                                allowMultiple={true}
                                contextInfo={`Asignando fotos a ${selectedVariantIndices.length} versiones`}
                                onSelect={handleMassImageAssign}
                            />

                            <DetailDrawer 
                                isOpen={showVariantDetail}
                                onClose={() => setShowVariantDetail(false)}
                                type="variant"
                                title={`Detalle de Versión: ${selectedVariant?.sku}`}
                                data={selectedVariant}
                                galleryPool={allImagesUniverse}
                                style={{ zIndex: 9999 }}
                                onUpdate={(newData) => {
                                    const updated = [...generatedVariants];
                                    updated[selectedVariant.index] = { 
                                        ...updated[selectedVariant.index], 
                                        price: newData.price, 
                                        stock: newData.stock,
                                        barcode: newData.barcode,
                                        image_urls: newData.image_urls 
                                    };
                                    setGeneratedVariants(updated);
                                    toast.success("Versión actualizada");
                                }}
                                onDelete={async (variantToDelete) => {
                                    try {
                                        // Si ya existe en la base de datos, lo borramos de verdad en el servidor
                                        if (variantToDelete.id) {
                                            const res = await fetch(`${API_BASE}/skus/${variantToDelete.id}`, {
                                                method: 'DELETE'
                                            });
                                            if (!res.ok) throw new Error("Error al eliminar del servidor");
                                        }

                                        // Limpieza local en el estado
                                        const filtered = generatedVariants.filter((_, idx) => idx !== selectedVariant.index);
                                        setGeneratedVariants(filtered);
                                        setShowVariantDetail(false);
                                        toast.success("Versión eliminada permanentemente");
                                    } catch (err) {
                                        console.error(err);
                                        toast.error("No se pudo eliminar la versión");
                                    }
                                }}
                            />

                            <VariantPicker 
                                isOpen={showVariantPicker}
                                onClose={() => setShowVariantPicker(false)}
                                baseSlug={values.slug}
                                attributes={variantAttributes}
                                suggestedSpecs={suggestedSpecs}
                                allSpecs={allSpecifications}
                                categoryId={values.category_id}
                                allAttributes={allAttributes}
                                onConfirm={async (newVariants) => {
                                    // Mecla Inteligente (Smart Merge): Deduplicar por SKU
                                    const currentMap = new Map(generatedVariants.map(v => [v.sku, v]));
                                    newVariants.forEach(nv => currentMap.set(nv.sku, nv));
                                    
                                    const updatedList = Array.from(currentMap.values());
                                    setGeneratedVariants(updatedList);
                                    setShowVariantPicker(false);
                                    
                                    // Si el producto ya existe, persistimos de inmediato en la base de datos
                                    if (productId) {
                                        toast.info("Sincronizando lote de versiones...", "En proceso");
                                        await onSave(values, updatedList);
                                    } else {
                                        toast.success(`Se han procesado ${newVariants.length} versiones.`);
                                    }
                                }}
                            />
                        </div>

                        <AdminFormSubmit>
                            <Button 
                                variant="primary" 
                                type="submit" 
                                disabled={isSubmitting}
                                style={{ padding: '0 60px', height: '56px', fontSize: '16px', borderRadius: '18px', fontWeight: '900', boxShadow: '0 10px 15px -3px rgba(143, 6, 83, 0.3)' }}
                            >
                                {isSubmitting ? 'Guardando...' : isSaved ? 'Guardar Cambios' : 'Confirmar y Guardar Producto Base'}
                            </Button>
                        </AdminFormSubmit>
                    </form>
        </AdminFormLayout>
    );
};

export default ProductForm;
