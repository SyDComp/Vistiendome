import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Trash2, Check, User, Package, MapPin, FileText, ShoppingBag, Send, AlertCircle, DollarSign } from 'lucide-react';
import { getProducts } from '../../../../lib/api/endpoints/products.api';
import { useNotification } from '../../../../context/NotificationContext';
import Imagen from '../../../ui/Imagen';

const AdminCotizacionModal = ({ isOpen, onClose, onCreated, initialCliente = null }) => {
    const { toast } = useNotification();

    // Estado del Cliente
    const [clientMode, setClientMode] = useState('select'); // 'select' | 'new'
    const [clientesList, setClientesList] = useState([]);
    const [loadingClientes, setLoadingClientes] = useState(false);
    const [searchClienteTerm, setSearchClienteTerm] = useState('');
    const [selectedCliente, setSelectedCliente] = useState(null);

    // Datos para Nuevo Cliente Rápido o Cliente Editable
    const [newClienteData, setNewClienteData] = useState({
        rut: '',
        nombres: '',
        apellidos: '',
        email_personal: '',
        telefono: ''
    });

    // Estado de Productos del Catálogo
    const [productsList, setProductsList] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [searchProductTerm, setSearchProductTerm] = useState('');
    const [isProductSearchFocused, setIsProductSearchFocused] = useState(false);

    // Ítems agregados a la Cotización
    const [items, setItems] = useState([]);

    // Datos adicionales de Cotización
    const [transporte, setTransporte] = useState('STARKEN');
    const [tipoDespacho, setTipoDespacho] = useState('DOMICILIO');
    const [region, setRegion] = useState('');
    const [comuna, setComuna] = useState('');
    const [direccion, setDireccion] = useState('');
    const [mensaje, setMensaje] = useState('');
    
    // Estado de carga y éxito
    const [submitting, setSubmitting] = useState(false);
    const [createdCotizacion, setCreatedCotizacion] = useState(null);

    // Cargar clientes y productos al abrir
    useEffect(() => {
        if (isOpen) {
            setCreatedCotizacion(null);
            if (initialCliente) {
                setSelectedCliente(initialCliente);
                setClientMode('select');
                if (initialCliente.direccion) setDireccion(initialCliente.direccion);
                if (initialCliente.region_nombre) setRegion(initialCliente.region_nombre);
                if (initialCliente.comuna_nombre) setComuna(initialCliente.comuna_nombre);
            } else {
                setSelectedCliente(null);
                setClientMode('select');
            }
            fetchClientes();
            fetchCatalog();
        }
    }, [isOpen, initialCliente]);

    const fetchClientes = async () => {
        setLoadingClientes(true);
        try {
            const res = await fetch('/api/v1/crm/clientes');
            if (res.ok) {
                const data = await res.json();
                setClientesList(data);
            }
        } catch (e) {
            console.error("Error al cargar clientes:", e);
        } finally {
            setLoadingClientes(false);
        }
    };

    const fetchCatalog = async () => {
        setLoadingProducts(true);
        try {
            const data = await getProducts();
            setProductsList(data || []);
        } catch (e) {
            console.error("Error al cargar productos:", e);
        } finally {
            setLoadingProducts(false);
        }
    };

    if (!isOpen) return null;

    // Filtrado de clientes
    const filteredClientes = clientesList.filter(c => {
        const term = searchClienteTerm.toLowerCase();
        return (
            (c.nombres || '').toLowerCase().includes(term) ||
            (c.apellidos || '').toLowerCase().includes(term) ||
            (c.rut || '').toLowerCase().includes(term) ||
            (c.email_personal || '').toLowerCase().includes(term) ||
            (c.telefono || '').toLowerCase().includes(term)
        );
    });

    // Aplanar variantes para el buscador de productos (incluyendo producto general y sus variantes)
    const allVariants = [];
    productsList.forEach(prod => {
        // Opción general del producto por si quieren agregarlo sin elegir variante específica
        allVariants.push({
            sku_id: null,
            sku_code: prod.sku || prod.slug || 'PRODUCTO',
            sku_name: prod.name,
            price: prod.price || 0,
            image: prod.image || prod.featured_image,
            is_product_base: true
        });

        if (prod.variants && prod.variants.length > 0) {
            prod.variants.forEach(varItem => {
                let variantLabel = varItem.sku || 'Variante';
                if (varItem.config && typeof varItem.config === 'object' && Object.keys(varItem.config).length > 0) {
                    const vals = Object.entries(varItem.config).map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v}`);
                    variantLabel = vals.join(' | ');
                }
                allVariants.push({
                    sku_id: varItem.id || null,
                    sku_code: varItem.sku,
                    sku_name: `${prod.name} (${variantLabel})`,
                    price: varItem.price || prod.price || 0,
                    image: varItem.image || prod.image || prod.featured_image,
                    is_variant: true
                });
            });
        }
    });

    const filteredVariants = (() => {
        const term = searchProductTerm.trim().toLowerCase();
        if (term === '') {
            return isProductSearchFocused ? allVariants.slice(0, 15) : [];
        }
        return allVariants.filter(v => 
            (v.sku_name && v.sku_name.toLowerCase().includes(term)) ||
            (v.sku_code && v.sku_code.toLowerCase().includes(term))
        ).slice(0, 25);
    })();

    const handleAddItem = (variant) => {
        const existingIndex = items.findIndex(it => it.sku_name === variant.sku_name);
        if (existingIndex > -1) {
            const updated = [...items];
            updated[existingIndex].cantidad += 1;
            setItems(updated);
        } else {
            setItems(prev => [
                ...prev,
                {
                    sku_id: variant.sku_id,
                    sku_name: variant.sku_name,
                    sku_code: variant.sku_code,
                    precio_unitario_estimado: variant.price,
                    cantidad: 1,
                    image: variant.image,
                    nombre_custom: variant.sku_name
                }
            ]);
        }
        toast.success(`Añadido: ${variant.sku_name}`);
    };

    const handleAddCustomItem = () => {
        const customName = prompt("Nombre o descripción del ítem / confección personalizada:", "Confección a Medida / Ajuste");
        if (!customName) return;
        const priceStr = prompt("Precio unitario estimado ($):", "25000");
        const price = parseFloat(priceStr) || 0;
        setItems(prev => [
            ...prev,
            {
                sku_id: null,
                sku_name: customName,
                sku_code: "CUSTOM",
                precio_unitario_estimado: price,
                cantidad: 1,
                image: null
            }
        ]);
    };

    const handleQuantityChange = (index, delta) => {
        setItems(prev => {
            const updated = [...prev];
            const newQty = updated[index].cantidad + delta;
            if (newQty <= 0) {
                updated.splice(index, 1);
            } else {
                updated[index].cantidad = newQty;
            }
            return updated;
        });
    };

    const handlePriceChange = (index, newPrice) => {
        setItems(prev => {
            const updated = [...prev];
            updated[index].precio_unitario_estimado = parseFloat(newPrice) || 0;
            return updated;
        });
    };

    const handleRemoveItem = (index) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const totalCotizacion = items.reduce((acc, it) => acc + (it.cantidad * (it.precio_unitario_estimado || 0)), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validar cliente
        if (clientMode === 'select' && !selectedCliente) {
            toast.error("Por favor selecciona un cliente registrado o crea uno nuevo");
            return;
        }
        if (clientMode === 'new' && (!newClienteData.nombres.trim() || !newClienteData.telefono.trim())) {
            toast.error("El nombre y el teléfono son requeridos para un nuevo cliente");
            return;
        }
        if (items.length === 0) {
            toast.error("Añade al menos un producto a la cotización");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                persona_id: clientMode === 'select' ? selectedCliente.id : null,
                rut: clientMode === 'select' ? selectedCliente.rut : newClienteData.rut,
                nombres: clientMode === 'select' ? selectedCliente.nombres : newClienteData.nombres,
                apellidos: clientMode === 'select' ? selectedCliente.apellidos : newClienteData.apellidos,
                email_personal: clientMode === 'select' ? selectedCliente.email_personal : newClienteData.email_personal,
                telefono: clientMode === 'select' ? selectedCliente.telefono : newClienteData.telefono,
                origen: "MANUAL",
                transporte,
                tipo_despacho: tipoDespacho,
                region,
                comuna,
                direccion,
                mensaje,
                items: items.map(it => ({
                    sku_id: typeof it.sku_id === 'number' ? it.sku_id : null,
                    cantidad: it.cantidad,
                    precio_unitario_estimado: it.precio_unitario_estimado
                }))
            };

            const res = await fetch('/api/v1/crm/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                toast.success("¡Cotización creada exitosamente!");
                setCreatedCotizacion(data);
                if (onCreated) onCreated(data);
            } else {
                const err = await res.json();
                toast.error(err.detail || "Error al crear la cotización");
            }
        } catch (error) {
            console.error("Error al enviar cotización:", error);
            toast.error("Error de conexión al servidor");
        } finally {
            setSubmitting(false);
        }
    };

    const handleOpenWhatsApp = () => {
        const clientPhone = createdCotizacion?.cliente?.telefono || 
                            (clientMode === 'select' ? selectedCliente?.telefono : newClienteData.telefono);
        if (!clientPhone) {
            toast.error("El cliente no tiene un teléfono registrado");
            return;
        }

        const clientName = createdCotizacion?.cliente?.nombres || 
                           (clientMode === 'select' ? selectedCliente?.nombres : newClienteData.nombres) || "Cliente";

        const itemsSummary = items.map(it => `• ${it.cantidad}x ${it.sku_name} ($${(it.cantidad * it.precio_unitario_estimado).toLocaleString()})`).join('\n');
        const textMessage = `¡Hola ${clientName}! 👗✨ Te enviamos el detalle de la cotización #${createdCotizacion?.id?.substring(0, 8) || ''} en Vistiéndome:\n\n${itemsSummary}\n\n*Total Estimado: $${totalCotizacion.toLocaleString()}*\n🚚 Despacho: ${transporte} (${tipoDespacho === 'SUCURSAL' ? 'A sucursal' : 'A domicilio'})\n${mensaje ? `📌 Nota: ${mensaje}\n\n` : '\n'}Quedamos atentas para confirmar tu pedido o resolver cualquier duda que tengas. ¡Un abrazo! 💕`;

        let cleanPhone = clientPhone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
        if (!cleanPhone.startsWith('56') && cleanPhone.length === 9) cleanPhone = '56' + cleanPhone;

        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMessage)}`;
        window.open(url, '_blank') || (window.location.href = url);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                width: '100%', maxWidth: '850px',
                maxHeight: '90vh',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                animation: 'fadeIn 0.2s ease-out'
            }}>
                {/* Cabezal */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'linear-gradient(135deg, #fdf2f8 0%, #ffffff 100%)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#8f0653', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(143, 6, 83, 0.25)' }}>
                            <FileText size={22} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#1e293b' }}>
                                Crear Cotización desde Administración
                            </h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                                Arma una cotización personalizada para un cliente registrado o nuevo
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer' }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Contenido (Formulario o Pantalla de Éxito) */}
                <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {createdCotizacion ? (
                        <div style={{ textAlign: 'center', padding: '30px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 20px rgba(22, 163, 74, 0.15)' }}>
                                <Check size={36} strokeWidth={3} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#1e293b' }}>
                                ¡Cotización #{createdCotizacion.id?.substring(0, 8)} creada!
                            </h3>
                            <p style={{ margin: 0, fontSize: '14px', color: '#64748b', maxWidth: '480px', lineHeight: 1.5 }}>
                                La cotización quedó registrada en el CRM. Ahora puedes enviarle el resumen directamente al WhatsApp de tu cliente si lo deseas.
                            </p>
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', width: '100%', maxWidth: '420px', textAlign: 'left', marginTop: '8px' }}>
                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#64748b', uppercase: 'true', marginBottom: '8px' }}>RESUMEN</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                                    <span>Total Estimado:</span>
                                    <span style={{ color: '#8f0653' }}>${totalCotizacion.toLocaleString()}</span>
                                </div>
                                <div style={{ fontSize: '13px', color: '#64748b' }}>
                                    {items.length} ítem(s) • Transporte: {transporte}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                <button
                                    onClick={handleOpenWhatsApp}
                                    style={{
                                        background: '#25D366', color: '#fff', border: 'none', borderRadius: '12px',
                                        padding: '12px 24px', fontSize: '14px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
                                    }}
                                >
                                    <Send size={18} /> Enviar Resumen al WhatsApp del Cliente
                                </button>
                                <button
                                    onClick={onClose}
                                    style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '12px', padding: '12px 20px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}
                                >
                                    Cerrar y Volver
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* PASO 1: SELECCIÓN DE CLIENTE */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '14px', color: '#1e293b' }}>
                                        <User size={18} color="#8f0653" /> 1. Selección del Cliente
                                    </div>
                                    <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '8px', padding: '2px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setClientMode('select')}
                                            style={{
                                                background: clientMode === 'select' ? '#ffffff' : 'transparent',
                                                color: clientMode === 'select' ? '#1e293b' : '#64748b',
                                                border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                                            }}
                                        >
                                            Cliente Existente
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setClientMode('new'); setSelectedCliente(null); }}
                                            style={{
                                                background: clientMode === 'new' ? '#ffffff' : 'transparent',
                                                color: clientMode === 'new' ? '#8f0653' : '#64748b',
                                                border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                                            }}
                                        >
                                            + Nuevo Cliente
                                        </button>
                                    </div>
                                </div>

                                {clientMode === 'select' ? (
                                    <div>
                                        {selectedCliente ? (
                                            <div style={{
                                                background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: '12px', padding: '12px 16px',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                            }}>
                                                <div>
                                                    <div style={{ fontWeight: '800', fontSize: '14px', color: '#8f0653' }}>
                                                        {selectedCliente.nombres} {selectedCliente.apellidos} {selectedCliente.rut ? `(${selectedCliente.rut})` : ''}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                                        📞 {selectedCliente.telefono || 'Sin teléfono'} • 📧 {selectedCliente.email_personal || 'Sin correo'}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedCliente(null)}
                                                    style={{ background: '#ffffff', border: '1px solid #fbcfe8', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', fontWeight: '700', color: '#8f0653', cursor: 'pointer' }}
                                                >
                                                    Cambiar
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                <div style={{ position: 'relative', marginBottom: '10px' }}>
                                                    <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar por nombre, apellido, RUT, correo o teléfono..."
                                                        value={searchClienteTerm}
                                                        onChange={(e) => setSearchClienteTerm(e.target.value)}
                                                        style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                                                    />
                                                </div>
                                                <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', background: '#ffffff' }}>
                                                    {loadingClientes ? (
                                                        <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>Cargando clientes...</div>
                                                    ) : filteredClientes.length === 0 ? (
                                                        <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>No se encontraron clientes coincidentes.</div>
                                                    ) : (
                                                        filteredClientes.map(c => (
                                                            <div
                                                                key={c.id}
                                                                onClick={() => {
                                                                    setSelectedCliente(c);
                                                                    if (c.direccion) setDireccion(c.direccion);
                                                                    if (c.region_nombre) setRegion(c.region_nombre);
                                                                    if (c.comuna_nombre) setComuna(c.comuna_nombre);
                                                                }}
                                                                style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                                                            >
                                                                <div>
                                                                    <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>{c.nombres} {c.apellidos}</div>
                                                                    <div style={{ fontSize: '11px', color: '#64748b' }}>{c.rut || 'Sin RUT'} • {c.telefono || c.email_personal || 'Sin contacto'}</div>
                                                                </div>
                                                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#8f0653', background: '#fdf2f8', padding: '3px 8px', borderRadius: '6px' }}>Seleccionar</span>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>RUT (Opcional)</label>
                                            <input
                                                type="text" placeholder="12.345.678-9"
                                                value={newClienteData.rut} onChange={e => setNewClienteData({...newClienteData, rut: e.target.value})}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Nombres *</label>
                                            <input
                                                type="text" placeholder="María Paz"
                                                value={newClienteData.nombres} onChange={e => setNewClienteData({...newClienteData, nombres: e.target.value})}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Apellidos</label>
                                            <input
                                                type="text" placeholder="Gómez"
                                                value={newClienteData.apellidos} onChange={e => setNewClienteData({...newClienteData, apellidos: e.target.value})}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Teléfono / WhatsApp *</label>
                                            <input
                                                type="text" placeholder="+56 9 1234 5678"
                                                value={newClienteData.telefono} onChange={e => setNewClienteData({...newClienteData, telefono: e.target.value})}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Correo Electrónico</label>
                                            <input
                                                type="email" placeholder="maria@correo.cl"
                                                value={newClienteData.email_personal} onChange={e => setNewClienteData({...newClienteData, email_personal: e.target.value})}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* PASO 2: PRODUCTOS Y CANTIDADES */}
                            <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', padding: '18px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '14px', color: '#1e293b' }}>
                                        <Package size={18} color="#8f0653" /> 2. Productos o Confecciones ({items.length})
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddCustomItem}
                                        style={{ background: '#fdf2f8', border: '1px solid #fbcfe8', color: '#8f0653', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                                    >
                                        <Plus size={14} /> + Ítem Libre / Personalizado
                                    </button>
                                </div>

                                {/* Buscador de Catálogo */}
                                <div style={{ position: 'relative', marginBottom: '14px' }}>
                                    <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                                    <input
                                        type="text"
                                        placeholder="Haz clic o escribe para buscar vestidos, tapados, variantes (XS, S, colores)..."
                                        value={searchProductTerm}
                                        onFocus={() => setIsProductSearchFocused(true)}
                                        onBlur={() => setTimeout(() => setIsProductSearchFocused(false), 220)}
                                        onChange={(e) => setSearchProductTerm(e.target.value)}
                                        style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                                    />
                                    {filteredVariants.length > 0 && (
                                        <div style={{
                                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                                            background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px',
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.15)', marginTop: '4px', maxHeight: '260px', overflowY: 'auto'
                                        }}>
                                            {filteredVariants.map((varItem, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => { handleAddItem(varItem); setSearchProductTerm(''); }}
                                                    style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fdf2f8'}
                                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        {varItem.image && (
                                                            <Imagen url={varItem.image} alt="" style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} sizes="32px" />
                                                        )}
                                                        <div>
                                                            <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>
                                                                {varItem.sku_name}
                                                                {varItem.is_product_base && (
                                                                    <span style={{ fontSize: '10px', backgroundColor: '#e2e8f0', color: '#334155', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: '800' }}>GENERAL</span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: '#64748b' }}>SKU: {varItem.sku_code}</div>
                                                        </div>
                                                    </div>
                                                    <span style={{ fontWeight: '800', color: '#8f0653', fontSize: '13px' }}>
                                                        ${varItem.price.toLocaleString('es-CL')} <span style={{ fontSize: '11px', color: '#16a34a', marginLeft: '6px' }}>+ Añadir</span>
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Tabla de Ítems */}
                                {items.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '24px', border: '2px dashed #e2e8f0', borderRadius: '12px', color: '#94a3b8', fontSize: '13px' }}>
                                        No has añadido ítems. Usa el buscador arriba o añade un ítem libre.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {items.map((it, idx) => (
                                            <div key={idx} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', flexWrap: 'wrap', gap: '10px'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 200px' }}>
                                                    {it.image ? (
                                                        <Imagen url={it.image} alt="" style={{ width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover' }} sizes="36px" />
                                                    ) : (
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '6px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <ShoppingBag size={18} color="#64748b" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b' }}>{it.sku_name}</div>
                                                        <div style={{ fontSize: '11px', color: '#64748b' }}>{it.sku_code || 'Ítem especial'}</div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>Precio ($):</span>
                                                        <input
                                                            type="number"
                                                            value={it.precio_unitario_estimado}
                                                            onChange={(e) => handlePriceChange(idx, e.target.value)}
                                                            style={{ width: '80px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: '700', color: '#1e293b' }}
                                                        />
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '2px 6px' }}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQuantityChange(idx, -1)}
                                                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: '800', fontSize: '14px', color: '#64748b', padding: '0 4px' }}
                                                        >-</button>
                                                        <span style={{ fontSize: '13px', fontWeight: '800', minWidth: '20px', textAlign: 'center' }}>{it.cantidad}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQuantityChange(idx, 1)}
                                                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: '800', fontSize: '14px', color: '#8f0653', padding: '0 4px' }}
                                                        >+</button>
                                                    </div>

                                                    <div style={{ fontWeight: '800', fontSize: '14px', color: '#8f0653', minWidth: '75px', textAlign: 'right' }}>
                                                        ${(it.cantidad * (it.precio_unitario_estimado || 0)).toLocaleString()}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(idx)}
                                                        style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '6px', color: '#ef4444', cursor: 'pointer' }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                                            <div style={{ background: '#fdf2f8', border: '1.5px solid #fbcfe8', borderRadius: '12px', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#64748b' }}>TOTAL COTIZACIÓN:</span>
                                                <span style={{ fontSize: '18px', fontWeight: '900', color: '#8f0653' }}>${totalCotizacion.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* PASO 3: DESPACHO Y NOTAS */}
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '18px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', fontSize: '14px', color: '#1e293b', marginBottom: '14px' }}>
                                    <MapPin size={18} color="#8f0653" /> 3. Envío y Observaciones
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Transporte</label>
                                        <select
                                            value={transporte} onChange={e => setTransporte(e.target.value)}
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600' }}
                                        >
                                            <option value="STARKEN">STARKEN</option>
                                            <option value="CHILEXPRESS">CHILEXPRESS</option>
                                            <option value="RETIRO EN TIENDA">RETIRO EN TIENDA</option>
                                            <option value="DESPACHO PROPIO">DESPACHO PROPIO / OTRO</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Tipo Despacho</label>
                                        <select
                                            value={tipoDespacho} onChange={e => setTipoDespacho(e.target.value)}
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: '600' }}
                                        >
                                            <option value="DOMICILIO">A DOMICILIO</option>
                                            <option value="SUCURSAL">A SUCURSAL</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Región</label>
                                        <input
                                            type="text" placeholder="Biobío, RM, etc."
                                            value={region} onChange={e => setRegion(e.target.value)}
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Comuna</label>
                                        <input
                                            type="text" placeholder="Chillán, Concepción, etc."
                                            value={comuna} onChange={e => setComuna(e.target.value)}
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Dirección exacta o Sucursal</label>
                                        <input
                                            type="text" placeholder="Calle Ejemplo #123, Depto 4B o Nombre de Sucursal Starken..."
                                            value={direccion} onChange={e => setDireccion(e.target.value)}
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '4px' }}>Nota u Observación Interna</label>
                                        <textarea
                                            placeholder="Anotaciones especiales para el taller, fecha límite de entrega, requerimientos del cliente..."
                                            value={mensaje} onChange={e => setMensaje(e.target.value)}
                                            rows="2"
                                            style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Pie del modal */}
                {!createdCotizacion && (
                    <div style={{
                        padding: '16px 24px',
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex', justifyContent: 'flex-end', gap: '12px',
                        backgroundColor: '#f8fafc'
                    }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: '700', color: '#64748b', cursor: 'pointer' }}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting}
                            style={{
                                background: 'linear-gradient(135deg, #8f0653 0%, #d946ef 100%)',
                                color: '#ffffff', border: 'none', borderRadius: '10px', padding: '10px 24px',
                                fontSize: '14px', fontWeight: '800', cursor: submitting ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px',
                                boxShadow: '0 4px 12px rgba(143, 6, 83, 0.3)',
                                opacity: submitting ? 0.7 : 1
                            }}
                        >
                            <Check size={18} strokeWidth={3} /> {submitting ? 'Guardando en el CRM...' : 'Crear y Guardar Cotización'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminCotizacionModal;
