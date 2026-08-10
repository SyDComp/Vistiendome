import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Edit2, Save, Trash2, ArrowLeft, Image as ImageIcon, Sparkles, Folder, Tag, Layers, FileText, Check, LayoutDashboard, Database, ChevronRight, Share2, Upload, AlertCircle, Maximize2, X, Package, FolderOpen, RefreshCw, BarChart2, Info, Lock, ChevronLeft, Plus, Hash, List, Palette, LayoutList, Users, Mail, Printer } from 'lucide-react';
import Barcode from 'react-barcode';
import Button from '../Button';
import MediaGallery from '../../interface/admin/media/MediaGallery';
import LibraryPicker from '../../interface/admin/inventory/LibraryPicker';
import Input from '../Input';
import { useScrollLock } from '../../../hooks/useScrollLock';
import { useSettings } from '../../../context/SettingsContext';
import { getShippingColor } from '../../../utils/shippingColors';

const API_BASE = '/api/v1/admin/catalog';

// Función para generar un código EAN-13 determinista basado en un texto (SKU)
const generateEAN13 = (text) => {
    if (!text) return "";
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) - hash) + text.charCodeAt(i);
        hash = hash & hash;
    }
    let hashStr = Math.abs(hash).toString().padStart(12, '0');
    while (hashStr.length < 12) hashStr += hashStr;
    hashStr = hashStr.substring(0, 12);
    
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(hashStr[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checksum = (10 - (sum % 10)) % 10;
    return hashStr + checksum;
};

import Skeleton, { SectionSkeleton } from '../Skeleton';

/**
 * DetailDrawer: Vista de detalles potente con navegación histórica (Stack-based).
 */
const DetailDrawer = ({ 
    isOpen, 
    onClose, 
    onSelect, 
    onUpdate, 
    onDelete,
    onReorder,
    data: initialData, 
    type: initialType = 'generic',
    title: initialTitle = "Detalles del Registro",
    metadata: initialMetadata = null,
    initialShowLibrary = false
}) => {
    const { settings } = useSettings();
    const shippingColors = settings?.shipping_colors || {};
    const [isVisible, setIsVisible] = useState(false);
    const [currData, setCurrData] = useState(null);
    const [editData, setEditData] = useState({});
    const [currType, setCurrType] = useState(null);
    const [currTitle, setCurrTitle] = useState('');
    const [currMetadata, setCurrMetadata] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [showGlobalGallery, setShowGlobalGallery] = useState(false);
    const [showLibraryVarieties, setShowLibraryVarieties] = useState(false);
    const [showLibraryOptions, setShowLibraryOptions] = useState(false);
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [activeSlideIndex, setActiveSlideIndex] = useState(0);
    const [activeLayerIndex, setActiveLayerIndex] = useState(null);
    const [pickingFor, setPickingFor] = useState(null); // { slideIndex: number, layerIndex: number, type: 'image' }
    const [tableNewHeader, setTableNewHeader] = useState('');
    const [allSpecs, setAllSpecs] = useState([]);
    const [allCategories, setAllCategories] = useState([]);
    const [allCollections, setAllCollections] = useState([]);



    // Resetear estados al cerrar el drawer
    useEffect(() => {
        if (!isOpen) {
            setShowLibraryVarieties(false);
            setShowLibraryOptions(false);
            setShowGlobalGallery(false);
            setIsReorderMode(false);
        }
    }, [isOpen]);

    // Cargar especificaciones y categorías si es categoría
    useEffect(() => {
        if (isOpen && (currType === 'category' || currType === 'cms_block')) {
            if (allSpecs.length === 0) {
                fetch(`/api/v1/admin/catalog/specifications`)
                    .then(r => r.json())
                    .then(data => setAllSpecs(data || []))
                    .catch(console.error);
            }
            if (allCategories.length === 0) {
                fetch(`/api/v1/admin/catalog/categories?page_size=500`)
                    .then(r => r.json())
                    .then(data => setAllCategories(data.items || []))
                    .catch(console.error);
            }
            if (allCollections.length === 0) {
                fetch(`/api/v1/admin/catalog/collections?page_size=500`)
                    .then(r => r.json())
                    .then(data => setAllCollections(Array.isArray(data) ? data : (data.items || [])))
                    .catch(console.error);
            }
        }
    }, [isOpen, currType, allSpecs.length, allCategories.length, allCollections.length]);
    
    // Estado local para permitir navegación profunda
    const [history, setHistory] = useState([]);

    useScrollLock(isOpen);

    // Resetear/Inicializar cuando se abre con nuevos datos desde fuera
    useEffect(() => {
        if (isOpen) {
            setCurrData(initialData);
            setEditData({
                ...initialData,
                media_assets: initialData?.media_assets || [],
                media_ids: initialData?.media_ids || []
            });
            setCurrType(initialType);
            setCurrTitle(initialTitle);
            setCurrMetadata(initialMetadata);
            setHistory([]);
            setShowGlobalGallery(false);
            setShowLibraryVarieties(initialShowLibrary);
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
        }
    }, [isOpen, initialData, initialType, initialTitle, initialMetadata]);

    const navigateTo = async (id, targetType, targetTitle, meta = null) => {
        if (isReorderMode) return;
        setLoading(true);
        // Apilar el actual con su estado de UI
        setHistory(prev => [...prev, { 
            data: currData, 
            type: currType, 
            title: currTitle, 
            meta: currMetadata,
            showLibrary: showLibraryVarieties || showLibraryOptions
        }]);
        
        // Si ya tenemos los datos en meta (como en color_option), no necesitamos fetch
        if (targetType === 'color_option' && meta) {
            setCurrData(meta);
            setEditData({
                ...meta,
                media_assets: meta.media_assets || [],
                media_ids: meta.media_ids || []
            });
            setCurrType(targetType);
            setCurrTitle(targetTitle);
            setCurrMetadata(null);
            setShowLibraryOptions(false);
            setLoading(false);
            return;
        }

        try {
            // Normalizar endpoint (ej: characteristic -> attributes)
            const endpoint = targetType === 'characteristic' ? 'attributes' : 
                            targetType === 'category' ? 'categories' :
                            targetType === 'specification' ? 'specifications' : 
                            targetType === 'variant' ? 'skus' : 'products';
            
            const res = await fetch(`${API_BASE}/${endpoint}/${id}`);
            if (!res.ok) throw new Error('Error al cargar detalle');
            const data = await res.json();
            
            setCurrData(data);
            setEditData({
                ...data,
                media_assets: data.media_assets || [],
                media_ids: data.media_ids || []
            });
            setCurrType(targetType);
            setCurrTitle(targetTitle || data.name);
            setCurrMetadata(meta);
            setShowLibraryVarieties(false); // Ocultamos biblioteca para ver el nuevo detalle
            setShowLibraryOptions(false);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const goBack = () => {
        if (history.length === 0) return;
        const newHistory = [...history];
        const last = newHistory.pop();
        
        setCurrData(last.data);
        setEditData({
            ...last.data,
            media_assets: last.data?.media_assets || [],
            media_ids: last.data?.media_ids || []
        });
        setCurrType(last.type);
        setCurrTitle(last.title);
        setCurrMetadata(last.meta);
        
        // Restaurar estado de biblioteca según el contexto previo
        if (last.type === 'product' || last.type === 'collection') {
            setShowLibraryVarieties(last.showLibrary || false);
            setShowLibraryOptions(false);
        } else if (last.type === 'characteristic') {
            setShowLibraryOptions(last.showLibrary || false);
            setShowLibraryVarieties(false);
        } else {
            setShowLibraryVarieties(false);
            setShowLibraryOptions(false);
        }
        
        setHistory(newHistory);
        setIsReorderMode(false);
    };

    // Memoizar las secciones para evitar re-cálculos pesados en cada render
    const sections = useMemo(() => {
        const s = [];
        if (loading || !currData) return s;

        if (currType === 'product') {
            s.push({
                title: 'Información General',
                icon: <Package size={18} />,
                items: [
                    { label: 'Nombre', value: currData.name },
                    { label: 'Slug', value: currData.slug },
                    { 
                        label: 'Categoría', 
                        value: currData.category_name || currData.category?.name || '---',
                        link: currData.category_id ? { id: currData.category_id, type: 'category' } : null
                    }
                ]
            });
            if (currData.description) {
                s.push({ title: 'Descripción', icon: <Info size={18} />, content: currData.description });
            }
            if (currData.skus && currData.skus.length > 0) {
                const prices = currData.skus.map(sk => sk.price);
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const configKeys = new Set();
                currData.skus.forEach(sk => {
                    Object.keys(sk.config || {}).forEach(k => configKeys.add(k));
                });

                s.push({
                    title: 'Variantes',
                    icon: <List size={18} />,
                    type: 'summary-card',
                    items: [
                        { label: 'Total Registradas', value: `${currData.skus.length} variantes` },
                        { label: 'Rango de Precios', value: minPrice === maxPrice ? `$${minPrice.toLocaleString()}` : `$${minPrice.toLocaleString()} - $${maxPrice.toLocaleString()}` },
                        { label: 'Atributos Definidos', value: Array.from(configKeys).join(', ') || 'Base' }
                    ],
                    footer: (
                        <p className="detail-drawer-summary-footer-text">
                            Usa el Explorador Visual para gestionar fotos, precios y stock de cada combinación.
                        </p>
                    )
                });
            }
        } else if (currType === 'collection') {
            s.push({
                title: 'Información General',
                icon: <Folder size={18} />,
                items: [
                    { label: 'Nombre', value: currData.name },
                        { label: 'Identificador (Slug)', value: currData.slug },
                    { label: 'Estado', value: currData.is_active ? 'Activa' : 'Inactiva' }
                ]
            });
            if (currData.description) {
                s.push({ title: 'Descripción', icon: <Info size={18} />, content: currData.description });
            }
            if (currData.skus && currData.skus.length > 0) {
                s.push({
                    title: `Variantes en la Colección (${currData.skus.length})`,
                    icon: <Layers size={18} />,
                    type: 'collection-items',
                    items: currData.skus
                });
            }
        } else if (currType === 'cliente') {
            s.push({
                title: 'Información de Cliente',
                icon: <Users size={18} />,
                items: [
                    { label: 'Nombre Completo', value: `${currData.nombres || ''} ${currData.apellidos || ''}`.trim() || 'Sin Nombre' },
                    { label: 'RUT', value: currData.rut || 'Sin RUT' },
                    { label: 'Tipo', value: currData.tipo_persona === 'LEAD' ? 'Prospecto' : 'Cliente' }
                ]
            });
            s.push({
                title: 'Datos de Contacto',
                icon: <Mail size={18} />,
                items: [
                    { label: 'Correo Electrónico', value: currData.email_personal || 'No registrado' },
                    { label: 'Teléfono', value: currData.telefono || 'No registrado' },
                    { label: 'Fecha de Registro', value: new Date(currData.created_at || Date.now()).toLocaleDateString() }
                ]
            });
        } else if (currType === 'cotizacion') {
            const calculatedTotal = currData.total || (currData.items ? currData.items.reduce((acc, item) => acc + ((item.cantidad || 0) * (item.precio_unitario_estimado || 0)), 0) : 0);
            s.push({
                title: 'Detalles de Cotización',
                icon: <FileText size={18} />,
                items: [
                    { label: 'Número', value: `#${currData.id}` },
                    { label: 'Estado', value: currData.estado || 'NUEVA' },
                    { label: 'Transporte / Envío', value: currData.transporte || 'STARKEN', isTransport: true },
                    { label: 'Tipo Despacho', value: currData.tipo_despacho === 'SUCURSAL' ? 'A Sucursal / Retiro' : 'A Domicilio' },
                    { label: 'Monto Total Estimado', value: `$${calculatedTotal.toLocaleString()}` }
                ]
            });
            if (currData.cliente) {
                s.push({
                    title: 'Cliente Asociado',
                    icon: <Users size={18} />,
                    items: [
                        { label: 'Nombre', value: `${currData.cliente.nombres || ''} ${currData.cliente.apellidos || ''}`.trim() || 'Sin Nombre' },
                        { label: 'Correo', value: currData.cliente.email_personal || 'No registrado' },
                        { label: 'Teléfono', value: currData.cliente.telefono || 'No registrado' }
                    ]
                });
            }
            if (currData.items && currData.items.length > 0) {
                s.push({
                    title: 'Productos Cotizados',
                    icon: <Package size={18} />,
                    items: currData.items.map(it => {
                        const nameStr = it.sku_name || it.nombre_custom || 'Producto del Catálogo / Especial';
                        const codeStr = it.sku_code && it.sku_code !== 'SKU-CUSTOM' ? ` [SKU: ${it.sku_code}]` : '';
                        const total = (it.cantidad || 1) * (it.precio_unitario_estimado || 0);
                        const unitDesc = (it.cantidad || 1) > 1 ? ` ($${(it.precio_unitario_estimado || 0).toLocaleString('es-CL')} c/u)` : '';
                        return {
                            label: `${it.cantidad || 1}x ${nameStr}${codeStr}`,
                            value: `$${total.toLocaleString('es-CL')}${unitDesc}`
                        };
                    })
                });
            }
            if (currData.mensaje) {
                s.push({
                    title: 'Nota / Observaciones',
                    icon: <FileText size={18} />,
                    items: [
                        { label: 'Detalle', value: currData.mensaje }
                    ]
                });
            }
        } else if (currType === 'category') {
            if (!editData.is_editing) {
                // MODO VISTA (Solo lectura)
                s.push({
                    title: 'Configuración de Categoría',
                    icon: <Folder size={18} />,
                    items: [
                        { label: 'Nombre', value: currData.name },
                        { label: 'Slug', value: currData.slug },
                        { 
                            label: 'Padre', 
                            value: currData.parent_name || 'Ninguno (Raíz)',
                            link: currData.parent_id ? { id: currData.parent_id, type: 'category' } : null
                        },
                        { label: 'Productos', value: `${currData.product_count || 0} productos asociados` }
                    ]
                });

                if (currData.subcategories && currData.subcategories.length > 0) {
                    s.push({
                        title: 'Subcategorías Hijas',
                        icon: <Layers size={18} />,
                        type: 'interactive-list',
                        linkedItems: currData.subcategories.map(sc => ({ id: sc.id, name: sc.name, type: 'category' }))
                    });
                }

                if (currData.suggested_specifications && currData.suggested_specifications.length > 0) {
                    s.push({
                        title: 'Especificaciones Sugeridas',
                        icon: <Layers size={18} />,
                        type: 'interactive-list',
                        linkedItems: currData.suggested_specifications.map(ss => ({ id: ss.id, name: ss.name, type: 'specification' }))
                    });
                }
            } else {
                // MODO EDICIÓN
                s.push({
                    title: 'Configuración Básica',
                    icon: <LayoutDashboard size={18} />,
                    editable: true,
                    type: 'form',
                    inputs: [
                        { label: 'Nombre de Categoría', type: 'text', name: 'name', value: editData.name, onChange: (e) => setEditData({...editData, name: e.target.value}) },
                        { label: 'Identificador (Slug)', type: 'text', name: 'slug', value: editData.slug, disabled: true },
                        { 
                            label: 'Categoría Padre', 
                            type: 'select', 
                            name: 'parent_id', 
                            value: editData.parent_id || '', 
                            options: [
                                { value: '', label: '— Sin padre (Raíz) —' },
                                ...allCategories
                                    .filter(c => c.id !== editData.id && c.slug !== 'sin_categoria')
                                    .map(c => ({ value: c.id, label: c.parent_name ? `${c.parent_name} › ${c.name}` : c.name }))
                            ],
                            onChange: (e) => setEditData({...editData, parent_id: e.target.value}) 
                        },
                        { label: 'Visible como Filtro', type: 'checkbox', name: 'is_filterable', value: editData.is_filterable, onChange: (e) => setEditData({...editData, is_filterable: e.target.checked}) }
                    ]
                });

                if (currData.subcategories && currData.subcategories.length > 0) {
                    s.push({
                        title: 'Subcategorías Hijas',
                        icon: <Layers size={18} />,
                        type: 'interactive-list',
                        linkedItems: currData.subcategories.map(sc => ({ id: sc.id, name: sc.name, type: 'category' }))
                    });
                }

                s.push({
                    title: 'Especificaciones Sugeridas',
                    icon: <Layers size={18} />,
                    editable: true,
                    type: 'custom',
                    content: (
                        <div className="detail-drawer-flex-col-16">
                            <p className="detail-drawer-hint-text">
                                Estas especificaciones se sugerirán automáticamente al crear productos en esta categoría.
                            </p>
                            <div className="detail-drawer-tags-container">
                                {(editData.suggested_specifications || []).map(spec => (
                                    <div key={spec.id} className="detail-drawer-tag-pill">
                                        {spec.name}
                                        <button 
                                            type="button"
                                            onClick={() => {
                                                const nextSpecs = editData.suggested_specifications.filter(s => s.id !== spec.id);
                                                setEditData({ ...editData, suggested_specifications: nextSpecs, suggested_specification_ids: nextSpecs.map(s => s.id) });
                                            }}
                                            className="detail-drawer-tag-remove-btn"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <Button 
                                variant="outline" 
                                type="button"
                                onClick={() => setShowLibraryOptions(true)}
                                className="detail-drawer-btn-dashed"
                            >
                                <Plus size={16} /> Gestionar Especificaciones
                            </Button>
                        </div>
                    )
                });
            }
        } else if (currType === 'specification') {
            s.push({
                title: 'Maestro de Especificación',
                icon: <Layers size={18} />,
                items: [
                    { label: 'Nombre', value: currData.name }
                ]
            });
            if (currData.characteristics && currData.characteristics.length > 0) {
                s.push({
                    title: 'Características Incluidas',
                    icon: <Hash size={18} />,
                    type: 'interactive-list',
                    linkedItems: currData.characteristics.map(c => ({ 
                        id: c.id, 
                        name: c.name, 
                        type: 'characteristic',
                        meta: { suggestedValues: c.allowed_values || [] }
                    }))
                });
            }
        } else if (currType === 'characteristic') {
            const isColor = currData.name.toLowerCase() === 'color' || currData.name.toLowerCase() === 'colores';
            const isPattern = currData.system_id === 'sys_pattern' || ['estampado', 'patrón', 'patron', 'diseño', 'diseno'].includes(currData.name.toLowerCase());
            s.push({
                title: 'Detalle de Atributo',
                icon: isColor ? <Palette size={18} /> : isPattern ? <ImageIcon size={18} /> : <Hash size={18} />,
                items: [
                    { label: 'Nombre', value: currData.name.toUpperCase() },
                    { label: 'Tipo de Dato', value: isColor ? 'BIBLIOTECA DE COLORES' : isPattern ? 'PATRONES / DISEÑOS' : 'TEXTO / VALOR' },
                    { label: 'Filtrable', value: currData.is_filterable ? 'SÍ' : 'NO' }
                ]
            });

            const suggested = currMetadata?.suggestedValues || [];
            const finalOptions = suggested.length > 0 
                ? currData.domain.filter(opt => {
                    const val = typeof opt === 'string' ? opt : (opt.value || opt.name);
                    return suggested.includes(val);
                  })
                : currData.domain;

            if (finalOptions.length > 0) {
                s.push({
                    title: suggested.length > 0 ? `Valores Sugeridos (${finalOptions.length})` : `Opciones en Biblioteca (${finalOptions.length})`,
                    icon: suggested.length > 0 ? <Sparkles size={18} /> : <LayoutList size={18} />,
                    type: 'library-grid',
                    isColor: isColor,
                    isPattern: isPattern,
                    options: finalOptions,
                    actions: !suggested.length && (
                        <button 
                            onClick={() => setIsReorderMode(!isReorderMode)}
                            className={`detail-drawer-reorder-btn ${isReorderMode ? 'active' : ''}`}
                        >
                            {isReorderMode ? 'FINALIZAR ORDEN' : 'ORGANIZAR ORDEN'}
                        </button>
                    )
                });
            }
        } else if (currType === 'color_option') {
            const parentChar = history.find(h => h.type === 'characteristic');
            const isSize = parentChar?.title?.toLowerCase() === 'talla' || parentChar?.title?.toLowerCase() === 'tallas';
            const isColor = parentChar?.title?.toLowerCase() === 'color' || parentChar?.title?.toLowerCase() === 'colores';

            s.push({
                title: isColor ? 'Detalle de Opción de Color' : 'Detalle de Opción de Catálogo',
                icon: isColor ? <Palette size={18} /> : <Hash size={18} />,
                items: [
                    { label: 'Nombre Original', value: currData.value || currData.name },
                    ...(isColor ? [{ 
                        label: 'Código Hexadecimal', 
                        value: (
                            <div className="detail-drawer-flex-align-center-8">
                                <div className="detail-drawer-color-dot-sm" style={{ background: currData.hex_code || '#000000' }} />
                                {currData.hex_code || '#000000'}
                            </div>
                        ) 
                    }] : [])
                ]
            });
            
            if (currData.is_system) {
                s.push({
                    title: 'Información Protegida',
                    icon: <Lock size={18} />,
                    content: (
                        <div className="detail-drawer-protected-info-box">
                            <p className="detail-drawer-m-0">Esta opción es parte de las <strong>vOS (Opciones del Sistema)</strong> básicas de Vistiendomé.</p>
                            <p className="detail-drawer-mt-8">El nombre {isColor ? 'y el color base están protegidos' : 'está protegido'} para asegurar la consistencia del catálogo, pero puedes organizar su posición en la biblioteca general.</p>
                        </div>
                    )
                });
            } else {
                s.push({
                    title: 'Edición de Opción',
                    icon: <Sparkles size={18} />,
                    editable: true,
                    type: 'form',
                    inputs: [
                        { 
                            label: isColor ? 'Nombre del Color' : 'Valor de la Opción', 
                            type: 'text', 
                            name: 'value', 
                            value: editData.value || editData.name,
                            onChange: (e) => setEditData(prev => ({...prev, value: e.target.value})),
                            disabled: currData.is_system,
                            helpText: currData.is_system ? "Este nombre es parte del kit base de Vistiendomé y no se puede editar." : null
                        },
                        ...(isColor ? [{ 
                            label: 'Código Hex (#)', 
                            type: 'color', 
                            name: 'hex_code', 
                            value: editData.hex_code,
                            onChange: (e) => setEditData(prev => ({...prev, hex_code: e.target.value}))
                        }] : [])
                    ]
                });
            }

            s.push({
                title: 'Previsualización',
                icon: isColor ? <ImageIcon size={18} /> : <Tag size={18} />,
                content: (
                    <div className="detail-drawer-preview-box">
                        {isColor ? (
                            <div className="detail-drawer-color-preview-circle" style={{ background: editData.hex_code || '#000' }} />
                        ) : (
                            <div className="detail-drawer-tag-preview-box">
                                <span className="detail-drawer-tag-preview-text">
                                    {editData.value || editData.name}
                                </span>
                            </div>
                        )}
                        <div className="detail-drawer-text-center">
                            <span className="detail-drawer-preview-title">
                                {isColor ? (editData.value || editData.name) : 'Etiqueta Visual'}
                            </span>
                            {!isColor && (
                                <p className="detail-drawer-preview-subtitle">Así se verá esta talla en las tarjetas de producto.</p>
                            )}
                        </div>
                    </div>
                )
            });
        } else if (currType === 'variant') {
            const variantBarcode = currData.barcode || generateEAN13(currData.sku);
            s.push({
                title: 'Configuración de Versión',
                icon: <Tag size={18} />,
                items: [
                    { label: 'Código (SKU)', value: currData.sku },
                    { label: 'Combinación', value: Object.values(currData.config || {}).join(' / ') || 'Producto Base' },
                    { label: 'Identificador Interno (Código de barras)', value: variantBarcode }
                ]
            });
            
            s.push({
                title: 'Código de Barras',
                icon: <Tag size={18} />,
                type: 'barcode-visual',
                value: variantBarcode,
                sku: currData.sku,
                config_str: Object.values(currData.config || {}).join(' / ') || 'Producto Base'
            });
            
            s.push({
                title: 'Gestión Comercial',
                icon: <Package size={18} />,
                editable: true,
                type: 'form',
                inputs: [
                    {
                        label: 'Precio de Venta ($)',
                        type: 'number',
                        name: 'price',
                        value: editData.price,
                        onChange: (e) => setEditData(prev => ({...prev, price: parseFloat(e.target.value)}))
                    },
                    {
                        label: 'Oferta de esta versión',
                        type: 'select',
                        name: 'sale_type',
                        value: editData.sale_type || '',
                        options: [
                            { value: '', label: 'Sin oferta (usa la del producto)' },
                            { value: 'percent', label: 'Descuento (%)' },
                            { value: 'amount', label: 'Monto de descuento ($)' },
                            { value: 'fixed', label: 'Precio final fijo ($)' }
                        ],
                        onChange: (e) => setEditData(prev => ({ ...prev, sale_type: e.target.value || null }))
                    },
                    ...(editData.sale_type ? [
                        {
                            label: editData.sale_type === 'percent' ? 'Descuento (%)' : editData.sale_type === 'amount' ? 'Monto a descontar ($)' : 'Precio final ($)',
                            type: 'number',
                            name: 'sale_value',
                            value: editData.sale_value ?? '',
                            onChange: (e) => setEditData(prev => ({ ...prev, sale_value: e.target.value === '' ? null : parseFloat(e.target.value) }))
                        },
                        {
                            label: 'Desde (opcional)',
                            type: 'datetime-local',
                            name: 'sale_start',
                            value: (editData.sale_start || '').slice(0, 16),
                            onChange: (e) => setEditData(prev => ({ ...prev, sale_start: e.target.value || null }))
                        },
                        {
                            label: 'Hasta (opcional)',
                            type: 'datetime-local',
                            name: 'sale_end',
                            value: (editData.sale_end || '').slice(0, 16),
                            onChange: (e) => setEditData(prev => ({ ...prev, sale_end: e.target.value || null }))
                        }
                    ] : [])
                ]
            });

            s.push({
                title: 'Galería de la Versión',
                icon: <ImageIcon size={18} />,
                type: 'image-manager',
                currentAssets: editData.media_assets || []
            });
        } else if (currType === 'homepage_section' || currType === 'cms_block') {
            s.push({
                title: 'Configuración Básica',
                icon: <LayoutDashboard size={18} />,
                editable: true,
                type: 'form',
                inputs: [
                    { label: 'Título Administrativo', type: 'text', name: 'title', value: editData.title, onChange: (e) => setEditData({...editData, title: e.target.value}) },
                    { label: 'Tipo de Bloque', type: 'text', name: 'type', value: editData.type, disabled: true }
                ]
            });

            if (currData.type === 'hero') {
                s.push({
                    title: 'Contenido del Hero',
                    icon: <Sparkles size={18} />,
                    editable: true,
                    type: 'form',
                    inputs: [
                        { label: 'Título Visual', type: 'text', name: 'v_title', value: editData.config?.title || '', onChange: (e) => setEditData({...editData, config: {...editData.config, title: e.target.value}}) },
                        { label: 'Descripción', type: 'text', name: 'v_desc', value: editData.config?.description || '', onChange: (e) => setEditData({...editData, config: {...editData.config, description: e.target.value}}) },
                        { label: 'Texto Botón', type: 'text', name: 'b_text', value: editData.config?.button_text || '', onChange: (e) => setEditData({...editData, config: {...editData.config, button_text: e.target.value}}) },
                        { label: 'Link Botón', type: 'text', name: 'b_link', value: editData.config?.button_link || '', onChange: (e) => setEditData({...editData, config: {...editData.config, button_link: e.target.value}}) }
                    ]
                });
                s.push({
                    title: 'Imagen de Fondo',
                    icon: <ImageIcon size={18} />,
                    type: 'image-manager',
                    currentAssets: editData.config?.media_assets || []
                });
            } else if (currData.type === 'carousel') {
                s.push({
                    title: 'Opciones de Carrusel',
                    icon: <Layers size={18} />,
                    editable: true,
                    type: 'form',
                    inputs: [
                        { label: 'Auto-reproducción', type: 'checkbox', name: 'auto_play', value: editData.config?.auto_play || false, onChange: (e) => setEditData({...editData, config: {...editData.config, auto_play: e.target.checked}}) }
                    ]
                });
            } else if (currData.type === 'text_post') {
                s.push({
                    title: 'Contenido Editorial',
                    icon: <FileText size={18} />,
                    editable: true,
                    type: 'form',
                    inputs: [
                        { label: 'Alineación', type: 'select', name: 'align', value: editData.config?.align || 'left', options: ['left', 'center', 'right'], onChange: (e) => setEditData({...editData, config: {...editData.config, align: e.target.value}}) },
                    ]
                });
            } else if (currData.type === 'data_table') {
                const headers = editData.config?.headers || [];
                const rows = editData.config?.rows || [];

                s.push({
                    title: 'Estructura y Contenido',
                    icon: <List size={18} />,
                    type: 'custom',
                    content: (
                        <div className="detail-drawer-flex-col-24">
                            {/* GESTOR DE COLUMNAS */}
                            <div className="detail-drawer-table-manager-box">
                                <label className="detail-drawer-table-header-label">Columnas de la Tabla</label>
                                <div className="detail-drawer-table-headers-container">
                                    {headers.map((h, i) => (
                                        <div key={i} className="detail-drawer-table-header-pill">
                                            {h}
                                            <button 
                                                onClick={() => {
                                                    const newHeaders = headers.filter((_, idx) => idx !== i);
                                                    setEditData({...editData, config: {...editData.config, headers: newHeaders}});
                                                }}
                                                className="detail-drawer-table-header-remove-btn"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {headers.length === 0 && <span className="detail-drawer-table-headers-empty-text">Aún no hay columnas definidas...</span>}
                                </div>
                                <div className="detail-drawer-flex-row-8">
                                    <input 
                                        type="text" 
                                        value={tableNewHeader}
                                        onChange={(e) => setTableNewHeader(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && tableNewHeader.trim()) {
                                                const nh = tableNewHeader.trim();
                                                if (!headers.includes(nh)) {
                                                    setEditData({...editData, config: {...editData.config, headers: [...headers, nh]}});
                                                }
                                                setTableNewHeader('');
                                            }
                                        }}
                                        placeholder="Ej: Busto, Cintura, Pecho..."
                                        className="detail-drawer-table-header-input"
                                    />
                                    <button 
                                        onClick={() => {
                                            if (tableNewHeader.trim()) {
                                                const nh = tableNewHeader.trim();
                                                if (!headers.includes(nh)) {
                                                    setEditData({...editData, config: {...editData.config, headers: [...headers, nh]}});
                                                }
                                                setTableNewHeader('');
                                            }
                                        }}
                                        className="detail-drawer-table-header-add-btn"
                                    >
                                        + AÑADIR
                                    </button>
                                </div>
                            </div>

                            {/* GESTOR DE FILAS */}
                            {headers.length > 0 && (
                                <div className="detail-drawer-table-rows-container">
                                    <div className="detail-drawer-overflow-x-auto">
                                        <table className="detail-drawer-table">
                                            <thead>
                                                <tr className="detail-drawer-table-thead-tr">
                                                    {headers.map((h, i) => <th key={i} className="detail-drawer-table-th">{h}</th>)}
                                                    <th className="detail-drawer-table-th-action"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rows.map((row, i) => (
                                                    <tr key={i} className="detail-drawer-table-tbody-tr">
                                                        {headers.map((h, j) => (
                                                            <td key={j} className="detail-drawer-table-td">
                                                                <input 
                                                                    type="text"
                                                                    value={row[h] || ''}
                                                                    onChange={(e) => {
                                                                        const newRows = [...rows];
                                                                        newRows[i] = { ...newRows[i], [h]: e.target.value };
                                                                        setEditData({...editData, config: {...editData.config, rows: newRows}});
                                                                    }}
                                                                    placeholder="..."
                                                                    className="detail-drawer-table-input"
                                                                    onFocus={(e) => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#e2e8f0'; }}
                                                                    onBlur={(e) => { e.target.style.background = ''; e.target.style.borderColor = ''; }}
                                                                />
                                                            </td>
                                                        ))}
                                                        <td className="detail-drawer-table-td-action">
                                                            <button 
                                                                onClick={() => {
                                                                    const newRows = rows.filter((_, idx) => idx !== i);
                                                                    setEditData({...editData, config: {...editData.config, rows: newRows}});
                                                                }}
                                                                className="detail-drawer-table-row-remove-btn"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const newRow = {};
                                            headers.forEach(h => newRow[h] = '');
                                            setEditData({...editData, config: {...editData.config, rows: [...rows, newRow]}});
                                        }}
                                        className="detail-drawer-table-add-row-btn"
                                    >
                                        + AÑADIR NUEVA FILA
                                    </button>
                                </div>
                            )}
                        </div>
                    )
                });
            } else if (currData.type === 'banner') {
                s.push({
                    title: 'Configuración de Banner',
                    icon: <ImageIcon size={18} />,
                    editable: true,
                    type: 'form',
                    inputs: [
                        { label: 'Link de Destino', type: 'text', name: 'link', value: editData.config?.link || '', onChange: (e) => setEditData({...editData, config: {...editData.config, link: e.target.value}}) }
                    ]
                });
                s.push({
                    title: 'Imagen del Banner',
                    icon: <ImageIcon size={18} />,
                    type: 'image-manager',
                    currentAssets: editData.config?.media_assets || []
                });
            } else if (currData.type === 'recent_products') {
                s.push({
                    title: 'Configuración de Novedades',
                    icon: <Sparkles size={18} />,
                    editable: true,
                    type: 'form',
                    inputs: [
                        { label: 'Subtítulo', type: 'text', name: 'subtitle', value: editData.config?.subtitle || '', onChange: (e) => setEditData({...editData, config: {...editData.config, subtitle: e.target.value}}) },
                        { label: 'Límite de Productos', type: 'number', name: 'limit', value: editData.config?.limit || 4, onChange: (e) => setEditData({...editData, config: {...editData.config, limit: parseInt(e.target.value)}}) }
                    ]
                });
            } else if (currData.type === 'product_carousel') {
                s.push({
                    title: 'Configuración del Carrusel',
                    icon: <Package size={18} />,
                    editable: true,
                    type: 'form',
                    inputs: [
                        { label: 'Título del Bloque', type: 'text', name: 'title', value: editData.title, onChange: (e) => setEditData({...editData, title: e.target.value}) },
                        { 
                            label: 'Colección a Mostrar', 
                            type: 'select', 
                            name: 'collection_id', 
                            value: editData.config?.collection_id || '', 
                            options: [
                                { value: '', label: '— Últimos Productos (Auto) —' },
                                { value: 'smart_latest', label: '✨ Recién Llegados (Novedades)' },
                                { value: 'smart_best_sellers', label: '🔥 Los Más Vendidos (Top Ventas)' },
                                { value: 'smart_random', label: '🎲 Descubre Algo Nuevo (Aleatorio)' },
                                { value: 'disabled_sep', label: '─── TUS COLECCIONES ───', disabled: true },
                                ...allCollections.map(c => ({ value: c.slug, label: `📁 ${c.name}` }))
                            ],
                            onChange: (e) => setEditData({...editData, config: {...editData.config, collection_id: e.target.value}}) 
                        }
                    ]
                });
            } else if (currData.type === 'composition_carousel') {
                const slides = editData.config?.slides || [];
                const currentSlide = slides[activeSlideIndex] || { 
                    bg_color: '#ffffff', 
                    layers: [] 
                };

                s.push({
                    title: 'Gestión de Diapositivas',
                    icon: <Layers size={18} />,
                    type: 'custom',
                    content: (
                        <div className="detail-drawer-flex-col-20">
                            {/* Selector de Slides */}
                            <div className="detail-drawer-slides-nav">
                                {slides.map((_, i) => (
                                    <button 
                                        key={i}
                                        onClick={() => { setActiveSlideIndex(i); setActiveLayerIndex(null); }}
                                        className={`detail-drawer-slide-btn ${activeSlideIndex === i ? 'active' : ''}`}
                                    >
                                        SLIDE {i + 1}
                                    </button>
                                ))}
                                <button 
                                    onClick={() => {
                                        const newSlides = [...slides, { bg_color: '#ffffff', layers: [] }];
                                        setEditData({...editData, config: {...editData.config, slides: newSlides}});
                                        setActiveSlideIndex(slides.length);
                                    }}
                                    className="detail-drawer-add-slide-btn"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>

                            {slides.length > 0 && (
                                <div className="detail-drawer-flex-col-24">
                                    {/* Configuración del Fondo (Lienzo) */}
                                    <div className="detail-drawer-slide-bg-box">
                                        <div className="detail-drawer-flex-between-mb-16">
                                            <h4 className="detail-drawer-layer-title">Fondo del Lienzo (Nivel 0)</h4>
                                            <input 
                                                type="color" 
                                                value={currentSlide.bg_color} 
                                                onChange={(e) => {
                                                    const newSlides = [...slides];
                                                    newSlides[activeSlideIndex].bg_color = e.target.value;
                                                    setEditData({...editData, config: {...editData.config, slides: newSlides}});
                                                }}
                                                className="detail-drawer-color-input"
                                            />
                                        </div>
                                    </div>

                                    {/* Gestor de Capas (Niveles 1..N) */}
                                    <div className="detail-drawer-slide-layers-box">
                                        <div className="detail-drawer-flex-between-mb-16">
                                            <h4 className="detail-drawer-layer-title">Capas de la Diapositiva</h4>
                                            <div className="detail-drawer-flex-row-8">
                                                <button 
                                                    onClick={() => {
                                                        const newLayers = [...(currentSlide.layers || []), { 
                                                            id: Date.now(), type: 'text', content: 'Nuevo Texto', 
                                                            x: 50, y: 50, scale: 1, rotation: 0, color: '#1e1b4b', size: 40, zIndex: (currentSlide.layers?.length || 0) + 1 
                                                        }];
                                                        const newSlides = [...slides];
                                                        newSlides[activeSlideIndex].layers = newLayers;
                                                        setEditData({...editData, config: {...editData.config, slides: newSlides}});
                                                        setActiveLayerIndex(newLayers.length - 1);
                                                    }}
                                                    className="detail-drawer-add-layer-btn"
                                                >
                                                    <Tag size={12} /> + TEXTO
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setPickingFor({ slideIndex: activeSlideIndex, layerIndex: currentSlide.layers?.length || 0, type: 'image' });
                                                        setShowGlobalGallery(true);
                                                    }}
                                                    className="detail-drawer-add-layer-btn"
                                                >
                                                    <ImageIcon size={12} /> + IMAGEN
                                                </button>
                                            </div>
                                        </div>

                                        <div className="detail-drawer-flex-col-8">
                                            {(currentSlide.layers || []).sort((a,b) => b.zIndex - a.zIndex).map((layer, idx) => {
                                                const originalIdx = currentSlide.layers.indexOf(layer);
                                                const isActive = activeLayerIndex === originalIdx;
                                                return (
                                                    <div 
                                                        key={layer.id}
                                                        onClick={() => setActiveLayerIndex(originalIdx)}
                                                        className={`detail-drawer-layer-item ${isActive ? 'active' : ''}`}
                                                    >
                                                        <span className="detail-drawer-layer-zindex">L{layer.zIndex}</span>
                                                        <div className="detail-drawer-layer-thumb">
                                                            {layer.type === 'text' ? <Tag size={14} color="#64748b" /> : <img src={`${layer.url}`} className="detail-drawer-w-full-h-full-cover" />}
                                                        </div>
                                                        <div className="detail-drawer-flex-1">
                                                            <div className="detail-drawer-layer-name">{layer.type === 'text' ? layer.content : 'Capa de Imagen'}</div>
                                                            <div className="detail-drawer-layer-info">X: {layer.x} | Y: {layer.y} | R: {layer.rotation}°</div>
                                                        </div>
                                                        {isActive && (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const newLayers = currentSlide.layers.filter((_, i) => i !== originalIdx);
                                                                    const newSlides = [...slides];
                                                                    newSlides[activeSlideIndex].layers = newLayers;
                                                                    setEditData({...editData, config: {...editData.config, slides: newSlides}});
                                                                    setActiveLayerIndex(null);
                                                                }}
                                                                className="detail-drawer-layer-remove-btn"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Editor de la Capa Activa (Photoshop Style) */}
                                    {activeLayerIndex !== null && currentSlide.layers[activeLayerIndex] && (
                                        <div className="detail-drawer-layer-editor-box">
                                            <h5 className="detail-drawer-layer-editor-title">Transformación de Capa</h5>
                                            
                                            <div className="detail-drawer-grid-2-gap-16">
                                                {currentSlide.layers[activeLayerIndex].type === 'text' && (
                                                    <div className="detail-drawer-col-span-full">
                                                        <label className="detail-drawer-editor-label">TEXTO</label>
                                                        <input 
                                                            type="text" 
                                                            value={currentSlide.layers[activeLayerIndex].content}
                                                            onChange={(e) => {
                                                                const newSlides = [...slides];
                                                                newSlides[activeSlideIndex].layers[activeLayerIndex].content = e.target.value;
                                                                setEditData({...editData, config: {...editData.config, slides: newSlides}});
                                                            }}
                                                            className="detail-drawer-editor-input"
                                                        />
                                                    </div>
                                                )}
                                                <div>
                                                    <label className="detail-drawer-editor-label">POSICIÓN X (%)</label>
                                                    <input type="range" min="-50" max="150" value={currentSlide.layers[activeLayerIndex].x} onChange={(e) => {
                                                        const newSlides = [...slides];
                                                        newSlides[activeSlideIndex].layers[activeLayerIndex].x = parseInt(e.target.value);
                                                        setEditData({...editData, config: {...editData.config, slides: newSlides}});
                                                    }} style={{ width: '100%' }} />
                                                </div>
                                                <div>
                                                    <label className="detail-drawer-editor-label">POSICIÓN Y (%)</label>
                                                    <input type="range" min="-50" max="150" value={currentSlide.layers[activeLayerIndex].y} onChange={(e) => {
                                                        const newSlides = [...slides];
                                                        newSlides[activeSlideIndex].layers[activeLayerIndex].y = parseInt(e.target.value);
                                                        setEditData({...editData, config: {...editData.config, slides: newSlides}});
                                                    }} style={{ width: '100%' }} />
                                                </div>
                                                <div>
                                                    <label className="detail-drawer-editor-label">ROTACIÓN (°)</label>
                                                    <input type="range" min="-180" max="180" value={currentSlide.layers[activeLayerIndex].rotation} onChange={(e) => {
                                                        const newSlides = [...slides];
                                                        newSlides[activeSlideIndex].layers[activeLayerIndex].rotation = parseInt(e.target.value);
                                                        setEditData({...editData, config: {...editData.config, slides: newSlides}});
                                                    }} style={{ width: '100%' }} />
                                                </div>
                                                <div>
                                                    <label className="detail-drawer-editor-label">ESCALA</label>
                                                    <input type="range" min="0.1" max="3" step="0.1" value={currentSlide.layers[activeLayerIndex].scale} onChange={(e) => {
                                                        const newSlides = [...slides];
                                                        newSlides[activeSlideIndex].layers[activeLayerIndex].scale = parseFloat(e.target.value);
                                                        setEditData({...editData, config: {...editData.config, slides: newSlides}});
                                                    }} style={{ width: '100%' }} />
                                                </div>
                                                <div>
                                                    <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: '#94a3b8', marginBottom: '8px' }}>NIVEL (Z-INDEX)</label>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        <button 
                                                            onClick={() => {
                                                                const newSlides = [...slides];
                                                                newSlides[activeSlideIndex].layers[activeLayerIndex].zIndex = Math.max(1, (newSlides[activeSlideIndex].layers[activeLayerIndex].zIndex || 1) - 1);
                                                                setEditData({...editData, config: {...editData.config, slides: newSlides}});
                                                            }}
                                                            className="detail-drawer-zindex-btn"
                                                        >BAJAR</button>
                                                        <span className="detail-drawer-zindex-value">{currentSlide.layers[activeLayerIndex].zIndex}</span>
                                                        <button 
                                                            onClick={() => {
                                                                const newSlides = [...slides];
                                                                newSlides[activeSlideIndex].layers[activeLayerIndex].zIndex = (newSlides[activeSlideIndex].layers[activeLayerIndex].zIndex || 1) + 1;
                                                                setEditData({...editData, config: {...editData.config, slides: newSlides}});
                                                            }}
                                                            className="detail-drawer-zindex-btn"
                                                        >SUBIR</button>
                                                    </div>
                                                </div>
                                                {currentSlide.layers[activeLayerIndex].type === 'text' && (
                                                    <div>
                                                        <label className="detail-drawer-editor-label">COLOR TEXTO</label>
                                                        <input 
                                                            type="color" 
                                                            value={currentSlide.layers[activeLayerIndex].color}
                                                            onChange={(e) => {
                                                                const newSlides = [...slides];
                                                                newSlides[activeSlideIndex].layers[activeLayerIndex].color = e.target.value;
                                                                setEditData({...editData, config: {...editData.config, slides: newSlides}});
                                                            }}
                                                            className="detail-drawer-color-input-full"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                });
            }
        }

        return s;
    }, [currData, currType, currTitle, currMetadata, editData.price, editData.sale_type, editData.sale_value, editData.sale_start, editData.sale_end, editData.value, editData.hex_code, editData.title, editData.config, editData.name, editData.slug, editData.parent_id, editData.is_filterable, editData.suggested_specifications, editData.is_editing, allCategories, allSpecs, loading, isReorderMode, activeSlideIndex, activeLayerIndex]);

    // Cálculo memoizado de items para la biblioteca
    const librarySkus = useMemo(() => {
        const baseData = (currType === 'product' || currType === 'collection') ? currData : history.find(h => h.type === 'product' || h.type === 'collection')?.data;
        // Fallback a la imagen principal del producto si la variante no tiene foto propia
        const productImg = baseData?.image
            || baseData?.images?.find(i => i.is_main)?.url
            || baseData?.images?.[0]?.url
            || null;
        return (baseData?.skus || []).map(sk => ({
            ...sk,
            name: sk.sku,
            image: sk.image_urls?.[0] || sk.media_assets?.[0]?.url || sk.image || sk.image_url || productImg
        }));
    }, [currData, currType, history]);

    // Si no está abierto ni en medio de la animación de cierre, desmontamos para no bloquear la UI
    if (!isOpen && !isVisible) return null;

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`/api/v1/media/upload`, {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                const newAssets = [...(editData.media_assets || []), data];
                const newIds = [...(editData.media_ids || []), data.id];
                setEditData({ ...editData, media_assets: newAssets, media_ids: newIds });
            }
        } catch (err) {
            console.error("Error al subir imagen:", err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="detail-drawer-overlay" style={{ display: (isOpen || isVisible) ? 'flex' : 'none' }}>
            <style>{`
                .skeleton {
                    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
                    background-size: 200% 100%;
                    animation: skeleton-blink 1.5s infinite linear;
                }
                @keyframes skeleton-blink {
                    0% { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }
                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>

            <div 
                onClick={onClose}
                className="detail-drawer-backdrop"
                style={{
                    opacity: (isVisible && !showLibraryVarieties && !showLibraryOptions) ? 1 : 0,
                    display: isVisible ? 'block' : 'none',
                    pointerEvents: (isVisible && !showLibraryVarieties && !showLibraryOptions) ? 'auto' : 'none'
                }} 
            />

            <div className="detail-drawer-main-panel" style={{
                pointerEvents: (isVisible && !showLibraryVarieties && !showLibraryOptions) ? 'auto' : 'none',
                transform: (isVisible && !showLibraryVarieties && !showLibraryOptions) ? 'translateX(0)' : 'translateX(100%)',
                opacity: (isVisible && !showLibraryVarieties && !showLibraryOptions) ? 1 : 0
            }}>
                <div className="detail-drawer-header">
                    <div className="detail-drawer-flex-row-16" style={{ flex: '1 1 auto', minWidth: 0, marginRight: '10px' }}>
                        {history.length > 0 && (
                            <button 
                                type="button"
                                onClick={goBack}
                                className="detail-drawer-back-btn"
                                style={{ flexShrink: 0 }}
                            >
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                            <h2 className="detail-drawer-title-h2" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                {loading ? 'Cargando...' : currTitle}
                            </h2>
                            <p className="detail-drawer-subtitle-p" style={{ wordBreak: 'break-word' }}>
                                {history.length > 0 ? `Regresar a ${history[history.length-1].title}` : 'Ficha técnica detallada'}
                            </p>
                        </div>
                    </div>
                    <div className="detail-drawer-header-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <button 
                            type="button"
                            onClick={onClose}
                            className="detail-drawer-close-btn"
                            style={{ flexShrink: 0 }}
                            title="Cerrar panel"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                <div className="detail-drawer-body-container" style={{ padding: showGlobalGallery ? '0' : undefined }}>
                    {loading ? (
                        <>
                            <SectionSkeleton />
                            <SectionSkeleton />
                            <SectionSkeleton />
                        </>
                    ) : showGlobalGallery ? (
                        <div className="detail-drawer-gallery-wrapper">
                            <MediaGallery 
                                isOpen={true}
                                asModal={false}
                                selectionMode 
                                allowMultiple={true}
                                initialSelected={editData.media_ids || []}
                                onClose={() => setShowGlobalGallery(false)}
                                onSelect={(data) => {
                                    const selectedAssets = Array.isArray(data) ? data : [data];
                                    
                                    if (pickingFor) {
                                        const slides = [...(editData.config?.slides || [])];
                                        const targetSlide = slides[pickingFor.slideIndex];
                                        if (targetSlide) {
                                            const newLayer = {
                                                id: Date.now(),
                                                type: 'image',
                                                url: selectedAssets[0]?.url,
                                                x: 50, y: 50, scale: 1, rotation: 0,
                                                zIndex: (targetSlide.layers?.length || 0) + 1
                                            };
                                            targetSlide.layers = [...(targetSlide.layers || []), newLayer];
                                            setEditData({ ...editData, config: { ...editData.config, slides } });
                                            setActiveLayerIndex(targetSlide.layers.length - 1);
                                        }
                                        setPickingFor(null);
                                        setShowGlobalGallery(false);
                                        return;
                                    }

                                    const currentAssets = editData.media_assets || [];
                                    const existingIds = new Set(currentAssets.map(a => a.id));
                                    const newUniqueAssets = selectedAssets.filter(a => !existingIds.has(a.id));
                                    const nextAssets = [...currentAssets, ...newUniqueAssets];
                                    if (currType === 'homepage_section' || currType === 'cms_block') {
                                        setEditData({ 
                                            ...editData, 
                                            config: {
                                                ...editData.config,
                                                media_assets: nextAssets,
                                                media_ids: nextAssets.map(a => a.id)
                                            }
                                        });
                                    } else {
                                        setEditData({ 
                                            ...editData, 
                                            media_assets: nextAssets,
                                            media_ids: nextAssets.map(a => a.id)
                                        });
                                    }
                                    setShowGlobalGallery(false);
                                }} 
                            />
                        </div>
                    ) : (
                        sections.map((section, idx) => (
                            <div key={idx} className="detail-drawer-section-wrapper" style={{ animation: `slideUp 0.4s ease forwards ${idx * 0.1}s` }}>
                                <div className="detail-drawer-section-header">
                                    <div className="detail-drawer-flex-row-12">
                                        <div className="detail-drawer-section-icon">
                                            {section.icon}
                                        </div>
                                        <h3 className="detail-drawer-section-title">{section.title}</h3>
                                    </div>
                                    <div className="detail-drawer-section-actions">
                                        {((currType === 'product' && section.title === 'Variantes') || 
                                           (currType === 'collection' && section.type === 'collection-items') ||
                                           (currType === 'characteristic' && section.isColor && section.type === 'library-grid')) && (
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    if (currType === 'product' || currType === 'collection') setShowLibraryVarieties(true);
                                                    else setShowLibraryOptions(true);
                                                }}
                                                className="detail-drawer-explorer-btn"
                                            >
                                                <FolderOpen size={14} /> EXPLORADOR VISUAL
                                            </button>
                                        )}
                                        {section.actions && section.actions}
                                    </div>
                                </div>

                                {section.type === 'summary-card' && section.items && (
                                    <div className="detail-drawer-summary-card">
                                        <div className="detail-drawer-summary-grid">
                                            {section.items.map((item, i) => (
                                                <div key={i}>
                                                    <span className="detail-drawer-summary-label">{item.label}</span>
                                                    <span className="detail-drawer-summary-value">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {section.footer && (
                                            <div className="detail-drawer-summary-footer">
                                                {section.footer}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {section.items && section.type !== 'summary-card' && section.type !== 'collection-items' && (
                                    <div className="detail-drawer-items-grid-2">
                                        {section.items.map((item, i) => {
                                            if (item.isTransport) {
                                                const transColor = getShippingColor(item.value || 'STARKEN', shippingColors);
                                                return (
                                                    <div key={i}>
                                                        <span className="detail-drawer-item-label">{item.label}</span>
                                                        <div style={{ marginTop: '4px' }}>
                                                            <span style={{
                                                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                                background: `${transColor}15`, color: transColor,
                                                                border: `1.5px solid ${transColor}40`, padding: '4px 10px',
                                                                borderRadius: '6px', fontWeight: '800', fontSize: '13px',
                                                                textTransform: 'uppercase'
                                                            }}>
                                                                🚚 {item.value || 'STARKEN'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <div key={i}>
                                                    <span className="detail-drawer-item-label">{item.label}</span>
                                                    {item.link ? (
                                                        <button 
                                                            type="button"
                                                            onClick={() => navigateTo(item.link.id, item.link.type, item.value)}
                                                            className="detail-drawer-item-link-btn"
                                                        >
                                                            {item.value} <ChevronRight size={14} />
                                                        </button>
                                                    ) : (
                                                        <span className="detail-drawer-item-value">{item.value}</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {section.type === 'interactive-list' && section.linkedItems && (
                                    <div className="detail-drawer-linked-items-wrap">
                                        {section.linkedItems.map((item, i) => (
                                            <button 
                                                key={i} 
                                                type="button"
                                                onClick={() => navigateTo(item.id, item.type, item.name, item.meta)}
                                                className="detail-drawer-linked-item-btn"
                                            >
                                                {item.name} <ChevronRight size={12} opacity={0.5} />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {section.type === 'barcode-visual' && section.value && (
                                    <div className="detail-drawer-barcode-box">
                                        <div className="detail-drawer-barcode-scroll">
                                            <Barcode value={section.value} format="CODE128" background="transparent" lineColor="#1e1b4b" height={80} margin={0} displayValue={false} />
                                        </div>
                                        <div className="detail-drawer-barcode-texts">
                                            <span className="detail-drawer-barcode-value">
                                                {section.value}
                                            </span>
                                            {section.sku && (
                                                <span className="detail-drawer-barcode-sku">
                                                    {section.sku}
                                                </span>
                                            )}
                                            {section.config_str && (
                                                <span className="detail-drawer-barcode-config">
                                                    {section.config_str}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {section.content && section.type !== 'custom' && (
                                    <div className="detail-drawer-content-box">
                                       {section.content}
                                    </div>
                                )}

                                {section.type === 'list' && section.pills && (
                                    <div className="detail-drawer-pill-list">
                                        {section.pills.map((pill, i) => (
                                            <span key={i} className="detail-drawer-pill-item">{pill}</span>
                                        ))}
                                    </div>
                                )}

                                {section.type === 'library-grid' && section.options && (
                                    <div className="detail-drawer-library-grid">
                                        {section.options.map((opt, i) => {
                                            const val = typeof opt === 'string' ? opt : (opt.value || opt.name || '---');
                                            const hex = typeof opt === 'string' ? null : opt.hex_code;
                                            
                                            return (
                                                <div key={`${val}-${i}`} className="detail-drawer-library-grid-item" style={{ 
                                                    border: isReorderMode ? '2px dashed #8f0653' : '1px solid #e2e8f0'
                                                }}>
                                                    {isReorderMode && (
                                                        <div className="detail-drawer-reorder-actions">
                                                            {i > 0 && (
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const newDomain = [...currData.domain];
                                                                        [newDomain[i], newDomain[i-1]] = [newDomain[i-1], newDomain[i]];
                                                                        onReorder(newDomain);
                                                                    }}
                                                                    className="detail-drawer-reorder-nav-btn"
                                                                >
                                                                    <ChevronLeft size={16} />
                                                                </button>
                                                            )}
                                                            {i < section.options.length - 1 && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const newDomain = [...currData.domain];
                                                                        [newDomain[i], newDomain[i+1]] = [newDomain[i+1], newDomain[i]];
                                                                        onReorder(newDomain);
                                                                    }}
                                                                    className="detail-drawer-reorder-nav-btn"
                                                                >
                                                                    <ChevronRight size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    
                                                    <div 
                                                        onClick={() => !isReorderMode && navigateTo(null, 'color_option', val, opt)}
                                                        style={{ cursor: isReorderMode ? 'default' : 'pointer', width: '100%' }}
                                                    >
                                                        {section.isColor ? (
                                                            <>
                                                                <div style={{ 
                                                                    width: '44px', height: '44px', borderRadius: '50%', 
                                                                    background: hex || '#000000', 
                                                                    border: '3px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#64748b',
                                                                    margin: '0 auto'
                                                                }}>
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', marginTop: '8px' }}>
                                                                    <span style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#1e1b4b', textTransform: 'uppercase' }}>{val}</span>
                                                                    {opt.is_system && (
                                                                        <div style={{ background: '#fdf2f8', color: '#8f0653', fontSize: '8px', fontWeight: '900', padding: '2px 5px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                            <Lock size={8} /> vOS
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {hex && <code style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '0.05em' }}>{hex.toUpperCase()}</code>}
                                                            </>
                                                        ) : section.isPattern || (typeof opt === 'object' && opt !== null && opt.image_url !== undefined) ? (
                                                            <>
                                                                <div style={{ 
                                                                    width: '48px', height: '48px', borderRadius: '8px', 
                                                                    overflow: 'hidden',
                                                                    background: '#f8fafc', 
                                                                    border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    margin: '0 auto'
                                                                }}>
                                                                    {opt.image_url ? (
                                                                        <img src={opt.image_url} alt={val} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                    ) : (
                                                                        <ImageIcon size={20} color="#94a3b8" />
                                                                    )}
                                                                </div>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', marginTop: '8px' }}>
                                                                    <span style={{ display: 'block', fontSize: '11px', fontWeight: '900', color: '#1e1b4b', textTransform: 'uppercase' }}>{val}</span>
                                                                    {opt.is_system && (
                                                                        <div style={{ background: '#fdf2f8', color: '#8f0653', fontSize: '8px', fontWeight: '900', padding: '2px 5px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                                            <Lock size={8} /> vOS
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div style={{ width: '100%' }}>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                                                                    <span style={{ 
                                                                        display: 'block', 
                                                                        fontSize: '18px', 
                                                                        fontWeight: '900', 
                                                                        color: '#8f0653',
                                                                        lineHeight: '1.2'
                                                                    }}>
                                                                        {val}
                                                                    </span>
                                                                    {opt.is_system && (
                                                                        <div className="detail-drawer-system-tag">
                                                                            <Lock size={8} /> vOS
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {typeof opt === 'object' && Object.entries(opt).map(([k, v]) => (
                                                                        <span key={k} className="detail-drawer-opt-attr">
                                                                            {v}
                                                                        </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {section.type === 'collection-items' && section.items && (
                                    <div className="detail-drawer-collection-grid">
                                        {section.items.map((sku, i) => (
                                            <div 
                                                key={sku.id || i}
                                                onClick={() => navigateTo(sku.id, 'variant', sku.sku, sku)}
                                                className="detail-drawer-collection-item"
                                            >
                                                <div className="detail-drawer-collection-thumb-wrapper">
                                                    {(sku.image || sku.image_url) ? <img src={`${sku.image || sku.image_url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Package size={18} color="#cbd5e1" style={{ margin: '13px' }} />}
                                                </div>
                                                <div className="detail-drawer-flex-1-min-w-0">
                                                    <div className="detail-drawer-collection-sku">{sku.sku}</div>
                                                    <div className="detail-drawer-collection-name">{sku.product_name || 'Variante'}</div>
                                                </div>
                                                <ChevronRight size={14} color="#cbd5e1" />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {section.type === 'form' && (
                                    <div className="detail-drawer-form-grid">
                                        {section.inputs.map((input, i) => (
                                            <div key={i} style={{ gridColumn: (input.type === 'textarea') ? '1 / -1' : 'auto' }}>
                                                {input.type === 'textarea' ? (
                                                    <div className="detail-drawer-flex-col-8">
                                                        <label className="detail-drawer-input-label">{input.label}</label>
                                                        <textarea 
                                                            value={input.value}
                                                            onChange={input.onChange}
                                                            className="detail-drawer-textarea"
                                                        />
                                                    </div>
                                                ) : input.type === 'select' ? (
                                                    <div className="detail-drawer-flex-col-8">
                                                        <label className="detail-drawer-input-label">{input.label}</label>
                                                        <select 
                                                            value={input.value}
                                                            onChange={input.onChange}
                                                            className="detail-drawer-select"
                                                        >
                                                            {input.options.map((opt, idx) => {
                                                                const isObj = typeof opt === 'object' && opt !== null;
                                                                const val = isObj ? opt.value : opt;
                                                                const label = isObj ? opt.label : opt;
                                                                return <option key={idx} value={val}>{label}</option>;
                                                            })}
                                                        </select>
                                                    </div>
                                                ) : input.type === 'checkbox' ? (
                                                    <label className="detail-drawer-checkbox-label">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={input.value}
                                                            onChange={input.onChange}
                                                            className="detail-drawer-checkbox-input"
                                                        />
                                                        <span className="detail-drawer-checkbox-text">{input.label}</span>
                                                    </label>
                                                ) : input.type === 'color' ? (
                                                    <div className="detail-drawer-flex-col-8">
                                                        <label className="detail-drawer-input-label">{input.label}</label>
                                                        <input 
                                                            type="color" 
                                                            value={input.value}
                                                            onChange={input.onChange}
                                                            className="detail-drawer-color-box"
                                                        />
                                                    </div>
                                                ) : input.type === 'range' ? (
                                                    <div className="detail-drawer-flex-col-8">
                                                        <div className="detail-drawer-flex-between">
                                                            <label className="detail-drawer-input-label">{input.label}</label>
                                                            <span className="detail-drawer-range-val">{input.value}{input.unit || ''}</span>
                                                        </div>
                                                        <input 
                                                            type="range" 
                                                            min={input.min || 0}
                                                            max={input.max || 100}
                                                            step={input.step || 1}
                                                            value={input.value}
                                                            onChange={input.onChange}
                                                            className="detail-drawer-range-input"
                                                        />
                                                    </div>
                                                ) : (
                                                    <Input
                                                        label={input.label}
                                                        name={input.name}
                                                        type={input.type}
                                                        value={input.value}
                                                        onChange={input.onChange}
                                                        disabled={input.disabled}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {section.type === 'image-manager' && (
                                    <div className="detail-drawer-flex-col-20">
                                        <div className="detail-drawer-img-grid">
                                            {(section.currentAssets || []).map((asset, i) => {
                                                const isMain = i === 0;
                                                return (
                                                    <div key={asset.id || i} className="detail-drawer-img-wrapper" style={{ 
                                                        border: isMain ? '2.5px solid #8f0653' : '1px solid #e2e8f0',
                                                        boxShadow: isMain ? '0 4px 12px rgba(143,6,83,0.15)' : 'none'
                                                    }}>
                                                        <img src={`${asset.url}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        
                                                        {/* Botón Eliminar */}
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const nextAssets = section.currentAssets.filter(a => a.id !== asset.id);
                                                                if (currType === 'homepage_section') {
                                                                    setEditData({ 
                                                                        ...editData, 
                                                                        config: {
                                                                            ...editData.config,
                                                                            media_assets: nextAssets,
                                                                            media_ids: nextAssets.map(a => a.id)
                                                                        }
                                                                    });
                                                                } else {
                                                                    setEditData({ 
                                                                        ...editData, 
                                                                        media_assets: nextAssets,
                                                                        media_ids: nextAssets.map(a => a.id)
                                                                    });
                                                                }
                                                            }}
                                                            className="detail-drawer-img-remove-btn"
                                                        >
                                                            <Trash2 size={10} />
                                                        </button>
                                                    </div>
                                                );
                                            })}

                                            {/* Botón para abrir Mediateca Global */}
                                                <button 
                                                type="button"
                                                onClick={() => setShowGlobalGallery(true)}
                                                className="detail-drawer-add-img-btn"
                                            >
                                                <FolderOpen size={20} />
                                                <span className="detail-drawer-add-img-text">GALERÍA</span>
                                            </button>

                                            {/* Botón para Carga Directa */}
                                            <label className="detail-drawer-upload-img-btn">
                                                <input type="file" onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />
                                                {uploading ? <Sparkles size={20} className="animate-spin" /> : <Upload size={20} />}
                                                <span className="detail-drawer-add-img-text">SUBIR</span>
                                            </label>
                                        </div>

                                    </div>
                                )}

                                {section.type === 'table' && (
                                    <div className="detail-drawer-table-wrapper">
                                        <table className="detail-drawer-data-table">
                                            <thead>
                                                <tr className="detail-drawer-data-tr-head">
                                                    {section.headers.map((h, i) => <th key={i} className="detail-drawer-data-th">{h}</th>)}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {section.rows.map((row, i) => (
                                                    <tr key={i} className="detail-drawer-data-tr">
                                                        {row.map((cell, j) => <td key={j} className="detail-drawer-data-td">{cell}</td>)}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    
                    {currType === 'cotizacion' && currData?.id && (
                        <div style={{ marginTop: '28px', borderTop: '2px dashed #cbd5e1', paddingTop: '28px', width: '100%', boxSizing: 'border-box' }}>
                            <div style={{
                                background: 'linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)',
                                border: '1.5px solid #fbcfe8',
                                borderRadius: '16px',
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                                boxShadow: '0 10px 25px -5px rgba(143, 6, 83, 0.1)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#8f0653', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 10px rgba(143, 6, 83, 0.3)' }}>
                                        <Printer size={22} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '900', color: '#8f0653', letterSpacing: '-0.3px' }}>
                                            Sistema de Etiquetas y Ahorro de Tinta
                                        </h4>
                                        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b', fontWeight: '600', lineHeight: 1.4 }}>
                                            Accede al módulo avanzado para generar y descargar esta etiqueta en formatos múltiples, configurar ahorro de tinta e incluir códigos de barra.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onClose();
                                        window.location.href = `/admin/dashboard/crm/shipping-labels?id=${currData.id}`;
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        background: '#8f0653',
                                        color: '#fff',
                                        border: 'none',
                                        padding: '16px 20px',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        fontWeight: '800',
                                        fontSize: '14px',
                                        width: '100%',
                                        boxShadow: '0 4px 14px rgba(143, 6, 83, 0.3)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Ir al Sistema de Etiquetas (Ahorro y Formato) 🚀
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer (Se oculta en cotización porque el botón superior [X] o la tarjeta de acción son suficientes y dejan el diseño limpio) */}
                {currType !== 'cotizacion' && (
                    <div className="detail-drawer-footer">
                        {['variant', 'color_option', 'homepage_section', 'cms_block', 'category'].includes(currType) && onDelete && currData && !currData.is_system && (currType !== 'category' || editData.is_editing) && (
                            <Button 
                                variant="outline" 
                                type="button"
                                onClick={async () => {
                                    const success = await onDelete(currData);
                                    if (success !== false) {
                                        if (history.length > 0) {
                                            goBack();
                                        } else {
                                            onClose();
                                        }
                                    }
                                }}
                                className="detail-drawer-btn-danger"
                            >
                                Eliminar
                            </Button>
                        )}
                        <div style={{ flex: 1 }} />
                        <Button variant="outline" type="button" onClick={onClose} className="detail-drawer-btn-outline">Cerrar</Button>
                        {['variant', 'color_option', 'homepage_section', 'cms_block', 'category'].includes(currType) && onUpdate && currData && !currData.is_system && (currType !== 'category' || editData.is_editing) && (
                            <Button 
                                onClick={() => {
                                    onUpdate(editData, currData);
                                }} 
                                type="button"
                                variant="primary" 
                                className="detail-drawer-btn-primary"
                            >
                                Guardar Cambios
                            </Button>
                        )}
                    </div>
                )}
            </div>
            {/* MODAL DE MEDIATECA GLOBAL (FULLSCREEN OVERLAY) */}
            {showGlobalGallery && (
                <div className="detail-drawer-global-gallery-overlay">
                    <div className="detail-drawer-global-gallery-modal">
                        <MediaGallery 
                            isOpen 
                            onClose={() => setShowGlobalGallery(false)} 
                            onSelect={(assets) => {
                                const selected = Array.isArray(assets) ? assets : [assets];
                                const currentAssets = editData.media_assets || [];
                                const currentIds = editData.media_ids || [];
                                
                                // Evitar duplicados
                                const newAssets = [...currentAssets];
                                const newIds = [...currentIds];
                                
                                selected.forEach(asset => {
                                    if (!newIds.includes(asset.id)) {
                                        newAssets.push(asset);
                                        newIds.push(asset.id);
                                    }
                                });

                                if (currType === 'homepage_section' || currType === 'cms_block') {
                                    setEditData({ 
                                        ...editData, 
                                        config: {
                                            ...editData.config,
                                            media_assets: newAssets,
                                            media_ids: newIds
                                        }
                                    });
                                } else {
                                    setEditData({ 
                                        ...editData, 
                                        media_assets: newAssets,
                                        media_ids: newIds
                                    });
                                }
                                setShowGlobalGallery(false);
                            }} 
                        />
                    </div>
                </div>
            )}

            {/* MODAL DE EXPLORADOR VISUAL DE COLORES */}
            {showLibraryOptions && currType === 'characteristic' && (
                <LibraryPicker 
                    isOpen={showLibraryOptions}
                    onClose={() => setShowLibraryOptions(false)}
                    items={currData.domain || []}
                    type="options"
                    title={`Explorador de: ${currData.name}`}
                    description="Visualización interactiva de la biblioteca de opciones. Haz clic en una para editar."
                    onItemClick={(item) => {
                        // Navegar a la edición del color individual
                        navigateTo(item.id || item.value, 'color_option', item.value || item.name, item);
                        setShowLibraryOptions(false); // Cerramos el explorador al navegar
                    }}
                />
            )}

            {/* MODAL DE EXPLORADOR DE ESPECIFICACIONES PARA CATEGORÍAS */}
            {showLibraryOptions && currType === 'category' && (
                <LibraryPicker 
                    isOpen={showLibraryOptions}
                    onClose={() => setShowLibraryOptions(false)}
                    items={allSpecs}
                    type="specifications"
                    initialSelectedIds={editData.suggested_specification_ids}
                    onSelect={(selected) => {
                        setEditData({ ...editData, suggested_specifications: selected, suggested_specification_ids: selected.map(s => s.id) });
                        setShowLibraryOptions(false);
                    }}
                    title="Biblioteca de Especificaciones"
                    description="Elige los grupos de características que se sugerirán al crear productos en esta categoría."
                />
            )}

            {/* MODAL DE EXPLORADOR VISUAL DE VARIANTES (Persistente para mantener scroll) */}
            {(showLibraryVarieties || history.some(h => h.showLibrary)) && (
                <LibraryPicker 
                    isOpen={showLibraryVarieties}
                    onClose={() => setShowLibraryVarieties(false)}
                    items={librarySkus}
                    type="variants"
                    title={`Explorar: ${currType === 'collection' ? currData.name : (currType === 'product' ? currData.name : (history.find(h => h.type === 'product' || h.type === 'collection')?.data.name || ''))}`}
                    description="Visualización inmersiva de combinaciones disponibles y precios."
                    onItemClick={(v) => {
                        if (pickingFor) {
                            const slides = [...(editData.config?.slides || [])];
                            const targetSlide = slides[pickingFor.slideIndex];
                            if (targetSlide) {
                                const newLayer = {
                                    id: Date.now(),
                                    type: 'image',
                                    url: v.image || v.image_url,
                                    x: 50, y: 50, scale: 1, rotation: 0,
                                    zIndex: (targetSlide.layers?.length || 0) + 1,
                                    link: `/catalogo/producto/${v.product_id}/${v.sku}`
                                };
                                targetSlide.layers = [...(targetSlide.layers || []), newLayer];
                                setEditData({ ...editData, config: { ...editData.config, slides } });
                                setActiveLayerIndex(targetSlide.layers.length - 1);
                            }
                            setPickingFor(null);
                            setShowLibraryVarieties(false);
                        } else {
                            navigateTo(v.id, 'variant', v.sku);
                        }
                    }}


                />
            )}

            <style>{`
                @keyframes fadeIn_drawer { from { opacity: 0; } to { opacity: 1; } }
                @keyframes modalOpen_drawer { 
                    from { transform: scale(0.95) translateY(20px); opacity: 0; } 
                    to { transform: scale(1) translateY(0); opacity: 1; } 
                }
            `}</style>
        </div>
    );
};

export default DetailDrawer;
