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

const API_BASE = 'http://localhost:8000/api/v1/admin/catalog';

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
        const seenUrls = new Set();

        generatedVariants.forEach(variant => {
            // Caso 1: Imágenes como objetos (Legacy/Detallado)
            if (variant.images && Array.isArray(variant.images)) {
                variant.images.forEach(img => {
                    if (img && img.url && !seenUrls.has(img.url)) {
                        seenUrls.add(img.url);
                        universe.push(img);
                    }
                });
            }
            // Caso 2: Imágenes como URLs (Simple/Nuevo)
            if (variant.image_urls && Array.isArray(variant.image_urls)) {
                variant.image_urls.forEach(url => {
                    if (url && !seenUrls.has(url)) {
                        seenUrls.add(url);
                        universe.push({ 
                            url, 
                            is_main: false,
                            ui_config: { zoom: 1, x: 0, y: 0, rotate: 0, brightness: 100 }
                        });
                    }
                });
            }
        });

        setAllImagesUniverse(universe);
        
        // Sincronización: Si se borra una versión y con ella desaparece la imagen principal del producto,
        // intentamos asignar una nueva del universo restante.
        if (productImages.length > 0) {
            const validImages = productImages.filter(pi => seenUrls.has(pi.url));
            if (validImages.length !== productImages.length) {
                setProductImages(validImages);
                if (selectedImage && !seenUrls.has(selectedImage.url)) {
                    setSelectedImage(validImages[0] || null);
                }
            }
        }
    }, [generatedVariants]);

    const handleToggleProductImage = (img) => {
        if (!img || !img.url) return;
        const alreadyIn = productImages.find(pi => pi.url === img.url);
        if (alreadyIn) {
            removeImage(img.url);
        } else {
            const newImg = { 
                url: img.url, 
                is_main: productImages.length === 0,
                ui_config: img.ui_config || { zoom: 1, x: 0, y: 0, rotate: 0, brightness: 100 }
            };
            const updated = [...productImages, newImg];
            setProductImages(updated);
            if (!selectedImage) setSelectedImage(newImg);
        }
    };

    const removeImage = (url) => {
        const filtered = productImages.filter(img => img.url !== url);
        setProductImages(filtered);
        if (selectedImage?.url === url) {
            setSelectedImage(filtered[0] || null);
        }
    };

    const setMainImage = (url) => {
        if (!url) return;
        setProductImages(productImages.map(img => ({ ...img, is_main: img.url === url })));
    };

    const updateImageConfig = (newConfig) => {
        if (!selectedImage) return;
        const updated = productImages.map(img => img.url === selectedImage.url ? { ...img, ui_config: newConfig } : img);
        setProductImages(updated);
        setSelectedImage({ ...selectedImage, ui_config: newConfig });
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

    const handleMassImageAssign = (selectedUrls) => {
        if (!selectedVariantIndices.length) return;
        
        const updatedVariants = [...generatedVariants];
        selectedVariantIndices.forEach(idx => {
            const variant = updatedVariants[idx];
            if (variant) {
                // Combinar sin duplicados
                const currentUrls = variant.image_urls || [];
                const newUrls = [...new Set([...currentUrls, ...selectedUrls])];
                updatedVariants[idx] = { ...variant, image_urls: newUrls };
            }
        });

        setGeneratedVariants(updatedVariants);
        setSelectedVariantIndices([]); // REINICIAMOS SELECCIÓN PARA NUEVO LOTE
        setShowMassGallery(false);
        setShowVersionLibrary(true); // RETORNO AUTOMÁTICO A VERSIONES
        toast.success(`Fotos asignadas a ${selectedVariantIndices.length} versiones con éxito.`);
    };

    const onSave = async (formValues, skusOverride = null) => {
        const payload = {
            ...formValues,
            category_id: parseInt(formValues.category_id),
            images: productImages,
            skus: skusOverride || generatedVariants,
            specs: {} // Deprecated/Legacy
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
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : '1fr 380px', 
            gap: '24px',
            height: '100%',
            overflowY: isMobile ? 'auto' : 'hidden'
        }}>
            {/* PANEL IZQUIERDO: FORMULARIO */}
            <div style={{ 
                background: '#fff', 
                borderRadius: '16px', 
                border: '1px solid #e2e8f0', 
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ padding: '10px', background: '#fdf2f8', borderRadius: '12px', color: '#8f0653' }}>
                        <Layout size={20} />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e1b4b' }}>
                        {initialData ? 'Editar Producto' : 'Crear Nuevo Producto'}
                    </h3>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                    {batchErrors && (
                        <div style={{ 
                            background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '16px', 
                            padding: '20px', marginBottom: '32px', animation: 'fadeIn 0.3s ease' 
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9a3412' }}>
                                    <AlertCircle size={18} />
                                    <span style={{ fontWeight: '800', fontSize: '14px' }}>Errores de Persistencia ({batchErrors.length})</span>
                                </div>
                                <button onClick={() => setBatchErrors(null)} style={{ background: 'none', border: 'none', color: '#9a3412', cursor: 'pointer', fontSize: '11px', fontWeight: '800' }}>OCULTAR</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {batchErrors.map((err, idx) => (
                                    <div key={idx} style={{ fontSize: '12px', color: '#c2410c', background: '#fff', padding: '10px 14px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', border: '1px solid #fed7aa' }}>
                                        <span style={{ fontWeight: '700' }}>{err.sku}</span>
                                        <span>{err.error}</span>
                                    </div>
                                ))}
                            </div>
                            <p style={{ marginTop: '12px', fontSize: '11px', color: '#9a3412', fontWeight: '600', fontStyle: 'italic' }}>
                                Nota: Las versiones que no aparecen aquí se guardaron correctamente. Por favor corrige los códigos de arriba y vuelve a intentar.
                            </p>
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit(onSave)}>
                        {/* Secciones del Formulario */}
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1.5fr', gap: '20px', marginBottom: '24px' }}>
                            <Input label="Nombre del Producto" name="name" value={values.name} onChange={handleChange} error={errors.name} placeholder="Ej: Vestido Noemi Azul" />
                            <Input label="Identificador URL (Automático)" name="slug" value={values.slug} readOnly style={{ backgroundColor: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }} />
                        </div>

                        <div style={{ marginTop: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '800', color: '#1e1b4b' }}>Ficha Técnica (Datos fijos)</label>
                                <div style={{ padding: '2px 8px', background: '#f1f5f9', borderRadius: '4px', fontSize: '10px', color: '#64748b', fontWeight: '700' }}>DATOS INFORMATIVOS</div>
                            </div>
                            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
                                Detalles globales (ej: Cuidado de la tela, Origen - Aplica a todas las versiones).
                            </p>
                            
                            <textarea 
                                name="description" 
                                value={values.description} 
                                onChange={handleChange} 
                                placeholder="Escribe aquí los detalles que enamorarán a tu cliente..."
                                style={{ 
                                    width: '100%', minHeight: '100px', padding: '14px', borderRadius: '12px', border: '1px solid #e2e8f0', 
                                    fontSize: '14.5px', outline: 'none', backgroundColor: '#f8fafc', transition: 'all 0.2s', resize: 'vertical',
                                    boxSizing: 'border-box'
                                }} 
                            ></textarea>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr', gap: '20px', marginBottom: '32px', marginTop: '24px' }}>
                            <div>
                                <label style={{ fontSize: '13.5px', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '8px' }}>Categoría Base</label>
                                <select 
                                    name="category_id" 
                                    value={values.category_id} 
                                    onChange={handleChange} 
                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontWeight: '600', outline: 'none', boxSizing: 'border-box' }}
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
                        <div style={{ 
                            position: 'relative',
                            marginTop: '40px',
                            background: '#fff', borderRadius: '32px', border: '1px solid #fce7f3', 
                            padding: isMobile ? '24px' : '40px', boxShadow: '0 20px 50px -12px rgba(143, 6, 83, 0.05)' 
                        }}>
                            {!isSaved && (
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                    background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(4px)',
                                    zIndex: 10, borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    padding: '40px', textAlign: 'center'
                                }}>
                                    <div style={{ maxWidth: '400px', animation: 'fadeIn 0.5s ease' }}>
                                        <div style={{ width: '64px', height: '64px', background: '#fdf2f8', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#8f0653' }}>
                                            <Package size={32} />
                                        </div>
                                        <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#1e1b4b' }}>Gestión de Versiones</h4>
                                        <p style={{ margin: '12px 0 0', fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                                            Para empezar a crear tallas, colores e imágenes específicas, primero debes **confirmar el Producto Base**.
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: '32px', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Package size={20} color="#8f0653" /> Centro de Versiones (Variantes)
                                    </h4>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Crea los SKUs con sus características y fotos propias.</p>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px' }}>
                                {/* Botón "CREAR NUEVA VERSIÓN" */}
                                <button
                                    type="button"
                                    onClick={() => setShowVariantPicker(true)}
                                    style={{
                                        padding: '32px', backgroundColor: '#fff', color: '#1e1b4b', border: '2px dashed #8f0653',
                                        borderRadius: '24px', cursor: 'pointer', transition: 'all 0.2s',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                                        boxShadow: '0 4px 15px rgba(143,6,83,0.05)'
                                    }}
                                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <div style={{ width: '48px', height: '48px', background: '#8f0653', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Plus size={24} />
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <span style={{ display: 'block', fontWeight: '900', fontSize: '16px' }}>Añadir Versión</span>
                                        <span style={{ display: 'block', fontSize: '12px', color: '#94a3b8', fontWeight: '500', marginTop: '4px' }}>Mezcla opciones y sube fotos</span>
                                    </div>
                                </button>

                                {/* Botón "BIBLIOTECA DE VERSIONES" */}
                                <button
                                    type="button"
                                    onClick={() => setShowVersionLibrary(true)}
                                    style={{
                                        padding: '32px', backgroundColor: '#1e1b4b', color: '#fff', border: 'none',
                                        borderRadius: '24px', cursor: 'pointer', transition: 'all 0.2s',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                                        boxShadow: '0 10px 25px rgba(30,27,75,0.2)'
                                    }}
                                    onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                                    onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Package size={24} />
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <span style={{ display: 'block', fontWeight: '900', fontSize: '16px' }}>Ver Mi Galería de SKUs</span>
                                        <span style={{ display: 'block', fontSize: '12px', color: 'rgba(255,255,255,0.6)', fontWeight: '500', marginTop: '4px' }}>
                                            {generatedVariants.length} versiones activas
                                        </span>
                                    </div>
                                </button>
                            </div>

                            {generatedVariants.length > 0 && (
                                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            if (window.confirm("¿Estás seguro de que deseas limpiar todo el área de trabajo local? Esto no borrará versiones que ya estén guardadas permanentemente en la base de datos hasta que presiones Guardar Cambios.")) {
                                                setGeneratedVariants([]);
                                                toast.info("Workspace local limpiado. Las versiones en servidor permanecen intactas.");
                                            }
                                        }}
                                        style={{ 
                                            background: 'none', border: 'none', color: '#64748b', fontSize: '11px', 
                                            fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                                            padding: '8px 12px', borderRadius: '8px', transition: 'all 0.2s'
                                        }}
                                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
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

                        <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'center' }}>
                            <Button 
                                variant="primary" 
                                type="submit" 
                                disabled={isSubmitting}
                                style={{ padding: '0 60px', height: '56px', fontSize: '16px', borderRadius: '18px', fontWeight: '900', boxShadow: '0 10px 15px -3px rgba(143, 6, 83, 0.3)' }}
                            >
                                {isSubmitting ? 'Guardando...' : isSaved ? 'Guardar Cambios' : 'Confirmar y Guardar Producto Base'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>

            {/* PANEL DERECHO: AGREGADOR DE FOTOS (UNIVERSO) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ background: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                    {/* Función para importar TODO del universo a la galería principal */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ImageIcon size={20} color="#8f0653" />
                            <h4 style={{ margin: 0, fontSize: '16px', color: '#1e1b4b', fontWeight: '800' }}>Universo Agregado</h4>
                        </div>
                        {allImagesUniverse.length > 0 && (
                            <button 
                                type="button"
                                onClick={() => {
                                    const newBatch = [...productImages];
                                    allImagesUniverse.forEach(uniImg => {
                                        if (!newBatch.some(pi => pi.url === uniImg.url)) {
                                            newBatch.push({ ...uniImg, is_main: newBatch.length === 0 });
                                        }
                                    });
                                    setProductImages(newBatch);
                                    if (!selectedImage && newBatch.length > 0) setSelectedImage(newBatch[0]);
                                    toast.success("¡Todas las fotos importadas con éxito!");
                                }}
                                style={{ 
                                    background: '#fdf2f8', color: '#8f0653', border: '1px solid #fbcfe8', 
                                    padding: '6px 12px', borderRadius: '10px', fontSize: '11px', 
                                    fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' 
                                }}
                            >
                                <Sparkles size={14} /> IMPORTAR TODO
                            </button>
                        )}
                    </div>
                    <p style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '20px', fontWeight: '600', lineHeight: '1.4' }}>
                        Selecciona qué fotos de tus versiones aparecerán en la galería global del producto.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '24px' }}>
                        {allImagesUniverse.length > 0 ? (
                            allImagesUniverse.map((img, idx) => {
                                const isCurrentProductImg = productImages.some(pi => pi.url === img.url);
                                const isMain = productImages.find(pi => pi.url === img.url)?.is_main;

                                return (
                                    <div key={idx} style={{ position: 'relative', cursor: 'pointer' }} onClick={() => handleToggleProductImage(img)}>
                                        <div style={{ 
                                            aspectRatio: '1/1', borderRadius: '10px', overflow: 'hidden',
                                            border: isCurrentProductImg ? '2.5px solid #8f0653' : '1px solid #f1f5f9',
                                            opacity: isCurrentProductImg ? 1 : 0.6,
                                            transition: 'all 0.2s'
                                        }}>
                                            <img src={`http://localhost:8000${img.url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                        {isCurrentProductImg && (
                                            <div style={{ position: 'absolute', top: '-5px', right: '-5px', width: '18px', height: '18px', background: '#8f0653', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                                                <Check size={12} strokeWidth={4} />
                                            </div>
                                        )}
                                        {isMain && (
                                            <div style={{ position: 'absolute', bottom: '-4px', left: '0', right: '0', textAlign: 'center' }}>
                                                <span style={{ background: '#8f0653', color: '#fff', fontSize: '8px', fontWeight: '900', padding: '1px 4px', borderRadius: '3px', textTransform: 'uppercase' }}>PORTADA PR</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div style={{ gridColumn: 'span 4', padding: '24px', textAlign: 'center', border: '2px dashed #f1f5f9', borderRadius: '16px' }}>
                                <ImageIcon size={24} color="#cbd5e1" style={{ marginBottom: '8px' }} />
                                <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>Sin versiones creadas aún.</span>
                            </div>
                        )}
                    </div>

                    <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                        <h5 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: '800', color: '#475569' }}>Selección y Calibración</h5>
                        {selectedImage ? (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>Ajuste de encuadre general</span>
                                    {!selectedImage.is_main && (
                                        <button 
                                            type="button"
                                            onClick={() => setMainImage(selectedImage.url)} 
                                            style={{ fontSize: '11px', color: '#8f0653', background: '#fdf2f8', border: 'none', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: '800' }}
                                        >
                                            Hacer Portada
                                        </button>
                                    )}
                                </div>
                                <SmartCanvas 
                                    src={`http://localhost:8000${selectedImage.url}`} 
                                    mode="edit" 
                                    config={selectedImage.ui_config}
                                    onChange={updateImageConfig}
                                />
                            </>
                        ) : (
                            <div style={{ padding: '30px 15px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
                                <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', fontWeight: '500' }}>
                                    {allImagesUniverse.length > 0 
                                        ? "Toca una foto del universo para incluirla en la galería del producto." 
                                        : "Crea primero una versión con fotos para poblar este panel."}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductForm;
