import React, { useState, useEffect } from 'react';
import ArmadorDePrenda from '../../../ui/ArmadorDePrenda';
import { describirEntrega } from '../../../../utils/entrega';
import { X, Search, Plus, Trash2, Check, User, Package, MapPin, FileText, ShoppingBag, Send, AlertCircle, DollarSign } from 'lucide-react';
import { getProducts } from '../../../../lib/api/endpoints/products.api';
import { getAdminAttributes } from '../../../../lib/api/endpoints/admin.api';
import { useNotification } from '../../../../context/NotificationContext';
import Imagen from '../../../ui/Imagen';
import { formatearTelefono, normalizarTelefono } from '../../../../utils/telefono';
import './AdminCotizacionModal.css';

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
    // Pieza fuera de catalogo: se arma con las MISMAS caracteristicas del
    // catalogo para que pueda cortarse igual que las demas.
    const [mostrandoFormLibre, setMostrandoFormLibre] = useState(false);
    const [atributosCatalogo, setAtributosCatalogo] = useState({});
    const [isProductSearchFocused, setIsProductSearchFocused] = useState(false);

    // Ítems agregados a la Cotización
    const [items, setItems] = useState([]);

    // Datos adicionales de Cotización
    const [transporte, setTransporte] = useState('STARKEN');
    // Retiro o despacho es la PRIMERA decision, no un valor escondido dentro del
    // nombre del transportista. Antes el retiro se elegia como si fuera una
    // empresa de transporte ('RETIRO EN TIENDA' en el desplegable de Transporte),
    // y el pedido nunca declaraba su modo: quedaba como despacho a domicilio con
    // un transportista inventado, y asi salia impreso en la etiqueta.
    const [modoEntrega, setModoEntrega] = useState('DESPACHO');
    const [tipoDespacho, setTipoDespacho] = useState('DOMICILIO');
    // REGION Y COMUNA SE ELIGEN, NO SE ESCRIBEN
    // Estos dos eran campos de texto libre, con un `placeholder` que decia
    // "Biobio, RM, etc.". Cada cotizacion manual guardaba lo que se hubiera
    // tecleado -"RM", "Region Metropolitana", "metropolitana"- mientras el
    // formulario publico y la ficha del cliente guardan la comuna elegida de
    // la lista, con su id. Dos verdades distintas sobre el mismo dato, y la
    // etiqueta de envio imprime la que le toque.
    const [region, setRegion] = useState('');
    const [comuna, setComuna] = useState('');
    const [comunaId, setComunaId] = useState('');
    const [regiones, setRegiones] = useState([]);
    const [comunas, setComunas] = useState([]);
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
                if (initialCliente.comuna_id) setComunaId(initialCliente.comuna_id);
            } else {
                setSelectedCliente(null);
                setClientMode('select');
            }
            fetchClientes();
            fetchCatalog();
            fetch('/api/v1/geo/regiones')
                .then(res => res.json())
                .then(setRegiones)
                .catch(err => console.error('No se pudieron cargar las regiones:', err));
        }
    }, [isOpen, initialCliente]);

    // Las comunas dependen de la region: no tiene sentido ofrecer las 346 del
    // pais cuando ya se sabe cual es.
    useEffect(() => {
        const elegida = regiones.find(r => r.nombre === region);
        if (!elegida) { setComunas([]); return; }
        fetch(`/api/v1/geo/regiones/${elegida.id}/comunas`)
            .then(res => res.json())
            .then(setComunas)
            .catch(err => console.error('No se pudieron cargar las comunas:', err));
    }, [region, regiones]);

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

    // El panel NO come de la mesa del publico.
    //
    // Antes esto pedia /products/filters-metadata, que es el endpoint publico y
    // devuelve SOLO las caracteristicas marcadas como filtrables: en su propio
    // panel se veian menos caracteristicas de las que existen, y una que no
    // fuera filtrable no se podia usar para armar una pieza.
    //
    // El catalogo completo es dato privado y se pide por el endpoint privado,
    // que exige permiso de administracion.
    const fetchAtributos = async () => {
        try {
            const attrs = await getAdminAttributes();
            const mapa = {};
            (attrs || []).forEach(a => {
                const valores = (a.domain || [])
                    .slice()
                    .sort((x, y) => (x?.order ?? 9999) - (y?.order ?? 9999))
                    .map(o => (typeof o === 'string' ? o : o?.value))
                    .filter(Boolean);
                if (valores.length) mapa[a.name] = valores;
            });
            setAtributosCatalogo(mapa);
        } catch { /* sin esto la pieza se puede agregar igual, solo que sin caracteristicas */ }
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

    // Se busca palabra por palabra, no la frase entera.
    //
    // Antes se preguntaba `sku_name.includes(term)` con el texto completo, asi
    // que "noemi lila m" no encontraba nada: el nombre real es
    // "Vestido Noemi (CUELLO: Redondo | COLOR: Lila | ... | TALLA: M)" y esa
    // cadena literal no aparece nunca. Escribir el modelo, el color y la talla
    // juntos es exactamente como llega el pedido por telefono, y era lo unico
    // que no funcionaba. Mismo criterio que el buscador del sitio.
    //
    // Los terminos de una o dos letras se comparan como palabra completa: si no,
    // la talla "M" coincidiria con "Mangas" y "Material" y devolveria todo.
    const filteredVariants = (() => {
        const sinTildes = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
        const term = searchProductTerm.trim();
        if (term === '') {
            return isProductSearchFocused ? allVariants.slice(0, 15) : [];
        }
        const tokens = sinTildes(term).split(/\s+/).filter(Boolean);
        return allVariants.filter(v => {
            const heno = `${sinTildes(v.sku_name)} ${sinTildes(v.sku_code)}`;
            return tokens.every(t => (
                t.length <= 2
                    ? new RegExp(`(^|[^a-z0-9])${t}([^a-z0-9]|$)`).test(heno)
                    : heno.includes(t)
            ));
        }).slice(0, 25);
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

    // Antes esto eran dos prompt() —nombre y precio— y la pieza entraba al pedido
    // como un texto suelto, sin talla ni color: llegaba a la orden de corte sin
    // nada con que confeccionarla.
    const handleAgregarPersonalizado = ({ nombre, precio, config, propuestos }) => {
        setItems(prev => [...prev, {
            sku_id: null,
            sku_name: nombre,
            sku_code: 'CUSTOM',
            precio_unitario_estimado: precio,
            cantidad: 1,
            image: null,
            config_custom: config,
            // Que valores no existen en el catalogo. Se guarda al momento del
            // pedido: si manana se crea ese color, este pedido sigue diciendo
            // que cuando se hizo no existia.
            config_propuesta: propuestos,
        }]);
        setMostrandoFormLibre(false);
        toast.success(`Añadido: ${nombre}`);
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
                // Se guarda normalizado: si cada formulario guarda lo que le
                // escriban, la misma columna termina con dos formatos, que es
                // justo lo que hay hoy en la base.
                telefono: normalizarTelefono(clientMode === 'select' ? selectedCliente.telefono : newClienteData.telefono),
                origen: "MANUAL",
                modo_entrega: modoEntrega,
                // Un retiro no viaja: no se le guarda transportista ni destino. Si
                // se guardaran, la etiqueta y el mensaje los imprimirian.
                transporte: modoEntrega === 'RETIRO' ? null : transporte,
                tipo_despacho: modoEntrega === 'RETIRO' ? null : tipoDespacho,
                region: modoEntrega === 'RETIRO' ? '' : region,
                comuna: modoEntrega === 'RETIRO' ? '' : comuna,
                comuna_id: modoEntrega === 'RETIRO' ? null : (comunaId || null),
                direccion: modoEntrega === 'RETIRO' ? '' : direccion,
                mensaje,
                items: items.map(it => ({
                    sku_id: typeof it.sku_id === 'number' ? it.sku_id : null,
                    cantidad: it.cantidad,
                    precio_unitario_estimado: it.precio_unitario_estimado,
                    // Sin esto la pieza personalizada se guardaba SIN nombre y sin
                    // caracteristicas: el backend los acepta desde siempre, pero el
                    // formulario no los mandaba. Llegaba al taller como un renglon
                    // vacio, imposible de cortar.
                    nombre_custom: it.sku_id == null ? (it.sku_name || null) : null,
                    config_custom: it.sku_id == null ? (it.config_custom || null) : null,
                    config_propuesta: it.sku_id == null ? (it.config_propuesta || null) : null,
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

        // El nombre de ESTE pedido, no el que la Persona vinculada tenia
        // guardado de antes (mismo RUT, otro nombre de verdad).
        const clientName = createdCotizacion?.nombre_contacto || createdCotizacion?.cliente?.nombres ||
                           (clientMode === 'select' ? selectedCliente?.nombres : newClienteData.nombres) || "Cliente";

        const itemsSummary = items.map(it => `• ${it.cantidad}x ${it.sku_name} ($${(it.cantidad * it.precio_unitario_estimado).toLocaleString()})`).join('\n');
        const textMessage = `¡Hola ${clientName}! 👗✨ Te enviamos el detalle de la cotización #${createdCotizacion?.id?.substring(0, 8) || ''} en Vistiendomé:\n\n${itemsSummary}\n\n*Total Estimado: $${totalCotizacion.toLocaleString()}*\n${describirEntrega({ modo_entrega: modoEntrega, tipo_despacho: tipoDespacho, transporte, direccion }).esRetiro ? '🏪 Retiro en el local' : `🚚 Despacho: ${transporte} (${tipoDespacho === 'SUCURSAL' ? 'A sucursal' : 'A domicilio'})`}\n${mensaje ? `📌 Nota: ${mensaje}\n\n` : '\n'}Quedamos atentas para confirmar tu pedido o resolver cualquier duda que tengas. ¡Un abrazo! 💕`;

        let cleanPhone = clientPhone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
        if (!cleanPhone.startsWith('56') && cleanPhone.length === 9) cleanPhone = '56' + cleanPhone;

        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMessage)}`;
        window.open(url, '_blank') || (window.location.href = url);
    };

    return (
        <div className="cot-overlay">
            <div className="cot cot-tarjeta">
                {/* Cabezal */}
                <div className="cot-cabecera">
                    <div className="cot-fila">
                        <div className="cot-emblema">
                            <FileText size={22} />
                        </div>
                        <div>
                            <h3 className="cot-exito-titulo">
                                Crear Cotización desde Administración
                            </h3>
                            <p className="cot-subtitulo">
                                Arma una cotización personalizada para un cliente registrado o nuevo
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="cot-boton-icono"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Contenido (Formulario o Pantalla de Éxito) */}
                <div className="cot-cuerpo">
                    {createdCotizacion ? (
                        <div className="cot-exito">
                            <div className="cot-exito-emblema">
                                <Check size={36} strokeWidth={3} />
                            </div>
                            <h3 className="cot-titulo">
                                ¡Cotización #{createdCotizacion.id?.substring(0, 8)} creada!
                            </h3>
                            <p className="cot-explicacion">
                                La cotización quedó registrada en el CRM. Ahora puedes enviarle el resumen directamente al WhatsApp de tu cliente si lo deseas.
                            </p>
                            <div className="cot-exito-resumen">
                                <div className="cot-rotulo">RESUMEN</div>
                                <div className="cot-linea-total">
                                    <span>Total Estimado:</span>
                                    <span className="cot-paso-icono">${totalCotizacion.toLocaleString()}</span>
                                </div>
                                <div className="cot-dato">
                                    {items.length} ítem(s) • Transporte: {transporte}
                                </div>
                            </div>
                            <div className="cot-exito-acciones">
                                <button
                                    onClick={handleOpenWhatsApp}
                                    className="cot-whatsapp"
                                >
                                    <Send size={18} /> Enviar Resumen al WhatsApp del Cliente
                                </button>
                                <button
                                    onClick={onClose}
                                    className="cot-boton-cancelar"
                                >
                                    Cerrar y Volver
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* PASO 1: SELECCIÓN DE CLIENTE */}
                            <div className="adm-tarjeta">
                                <div className="adm-seccion-cabecera">
                                    <div className="adm-seccion-titulo">
                                        <User size={18} color="#8f0653" /> 1. Selección del Cliente
                                    </div>
                                    <div className="cot-alternador">
                                        <button
                                            type="button"
                                            onClick={() => setClientMode('select')}
                                            className={`cot-pestana${clientMode === 'select' ? ' cot-pestana--elegida' : ''}`}
                                        >
                                            Cliente Existente
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => { setClientMode('new'); setSelectedCliente(null); }}
                                            className={`cot-pestana cot-pestana--nueva${clientMode === 'new' ? ' cot-pestana--elegida' : ''}`}
                                        >
                                            + Nuevo Cliente
                                        </button>
                                    </div>
                                </div>

                                {clientMode === 'select' ? (
                                    <div>
                                        {selectedCliente ? (
                                            <div className="cot-franja">
                                                <div>
                                                    <div className="cot-precio">
                                                        {selectedCliente.nombres} {selectedCliente.apellidos} {selectedCliente.rut ? `(${selectedCliente.rut})` : ''}
                                                    </div>
                                                    <div className="cot-dato-menor">
                                                        📞 {formatearTelefono(selectedCliente.telefono) || 'Sin teléfono'} • 📧 {selectedCliente.email_personal || 'Sin correo'}
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedCliente(null)}
                                                    className="cot-boton-claro"
                                                >
                                                    Cambiar
                                                </button>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="cot-buscador--junto">
                                                    <Search size={16} color="#94a3b8" className="adm-campo-icono" />
                                                    <input
                                                        type="text"
                                                        placeholder="Buscar por nombre, apellido, RUT, correo o teléfono..."
                                                        value={searchClienteTerm}
                                                        onChange={(e) => setSearchClienteTerm(e.target.value)}
                                                        className="adm-campo adm-campo--con-icono"
                                                    />
                                                </div>
                                                <div className="cot-resultados">
                                                    {loadingClientes ? (
                                                        <div className="cot-resultados-cargando">Cargando clientes...</div>
                                                    ) : filteredClientes.length === 0 ? (
                                                        <div className="cot-resultados-vacio">No se encontraron clientes coincidentes.</div>
                                                    ) : (
                                                        filteredClientes.map(c => (
                                                            <div
                                                                key={c.id}
                                                                onClick={() => {
                                                                    setSelectedCliente(c);
                                                                    if (c.direccion) setDireccion(c.direccion);
                                                                    if (c.region_nombre) setRegion(c.region_nombre);
                                                                    if (c.comuna_nombre) setComuna(c.comuna_nombre);
                                                                    if (c.comuna_id) setComunaId(c.comuna_id);
                                                                }}
                                                                className="adm-opcion-fila"
                                                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                                                            >
                                                                <div>
                                                                    <div className="adm-dato">{c.nombres} {c.apellidos}</div>
                                                                    <div className="adm-dato-secundario">{c.rut || 'Sin RUT'} • {formatearTelefono(c.telefono) || c.email_personal || 'Sin contacto'}</div>
                                                                </div>
                                                                <span className="cot-insignia">Seleccionar</span>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="cot-rejilla">
                                        <div>
                                            <label className="adm-etiqueta">RUT (Opcional)</label>
                                            <input
                                                type="text" placeholder="12.345.678-9"
                                                value={newClienteData.rut} onChange={e => setNewClienteData({...newClienteData, rut: e.target.value})}
                                                className="adm-campo"
                                            />
                                        </div>
                                        <div>
                                            <label className="adm-etiqueta">Nombres *</label>
                                            <input
                                                type="text" placeholder="María Paz"
                                                value={newClienteData.nombres} onChange={e => setNewClienteData({...newClienteData, nombres: e.target.value})}
                                                className="adm-campo"
                                            />
                                        </div>
                                        <div>
                                            <label className="adm-etiqueta">Apellidos</label>
                                            <input
                                                type="text" placeholder="Gómez"
                                                value={newClienteData.apellidos} onChange={e => setNewClienteData({...newClienteData, apellidos: e.target.value})}
                                                className="adm-campo"
                                            />
                                        </div>
                                        <div>
                                            <label className="adm-etiqueta">Teléfono / WhatsApp *</label>
                                            <input
                                                type="text" placeholder="+56 9 1234 5678"
                                                value={newClienteData.telefono} onChange={e => setNewClienteData({...newClienteData, telefono: e.target.value})}
                                                className="adm-campo"
                                            />
                                        </div>
                                        <div>
                                            <label className="adm-etiqueta">Correo Electrónico</label>
                                            <input
                                                type="email" placeholder="maria@correo.cl"
                                                value={newClienteData.email_personal} onChange={e => setNewClienteData({...newClienteData, email_personal: e.target.value})}
                                                className="adm-campo"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* PASO 2: PRODUCTOS Y CANTIDADES */}
                            <div className="cot-caja">
                                <div className="adm-seccion-cabecera">
                                    <div className="adm-seccion-titulo">
                                        <Package size={18} color="#8f0653" /> 2. Productos o Confecciones ({items.length})
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setMostrandoFormLibre(v => !v); if (!Object.keys(atributosCatalogo).length) fetchAtributos(); }}
                                        className="cot-boton-marca"
                                    >
                                        <Plus size={14} /> + Ítem Libre / Personalizado
                                    </button>
                                </div>

                                {mostrandoFormLibre && (
                                    <ArmadorDePrenda
                                        contexto="panel"
                                        enmarcado
                                        atributos={atributosCatalogo}
                                        onAgregar={handleAgregarPersonalizado}
                                        onCancelar={() => setMostrandoFormLibre(false)}
                                    />
                                )}

                                {/* Buscador de Catálogo */}
                                <div className="cot-buscador">
                                    <Search size={16} color="#94a3b8" className="adm-campo-icono" />
                                    <input
                                        type="text"
                                        placeholder="Haz clic o escribe para buscar vestidos, tapados, variantes (XS, S, colores)..."
                                        value={searchProductTerm}
                                        onFocus={() => setIsProductSearchFocused(true)}
                                        onBlur={() => setTimeout(() => setIsProductSearchFocused(false), 220)}
                                        onChange={(e) => setSearchProductTerm(e.target.value)}
                                        className="adm-campo adm-campo--con-icono"
                                    />
                                    {filteredVariants.length > 0 && (
                                        <div className="cot-sugerencias">
                                            {filteredVariants.map((varItem, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => { handleAddItem(varItem); setSearchProductTerm(''); }}
                                                    className="adm-opcion-fila"
                                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fdf2f8'}
                                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                                                >
                                                    <div className="cot-fila-junta">
                                                        {varItem.image && (
                                                            <Imagen url={varItem.image} alt="" className="cot-miniatura--chica" sizes="32px" />
                                                        )}
                                                        <div>
                                                            <div className="adm-dato">
                                                                {varItem.sku_name}
                                                                {varItem.is_product_base && (
                                                                    <span className="cot-insignia--gris">GENERAL</span>
                                                                )}
                                                            </div>
                                                            <div className="adm-dato-secundario">SKU: {varItem.sku_code}</div>
                                                        </div>
                                                    </div>
                                                    <span className="cot-precio-menor">
                                                        ${varItem.price.toLocaleString('es-CL')} <span className="cot-aviso-ok">+ Añadir</span>
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Tabla de Ítems */}
                                {items.length === 0 ? (
                                    <div className="cot-vacio">
                                        No has añadido ítems. Usa el buscador arriba o añade un ítem libre.
                                    </div>
                                ) : (
                                    <div className="cot-columna">
                                        {items.map((it, idx) => (
                                            <div key={idx} className="cot-resumen-fila">
                                                <div className="cot-fila-encogible">
                                                    {it.image ? (
                                                        <Imagen url={it.image} alt="" className="cot-miniatura" sizes="36px" />
                                                    ) : (
                                                        <div className="cot-miniatura--vacia">
                                                            <ShoppingBag size={18} color="#64748b" />
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="adm-dato">{it.sku_name}</div>
                                                        <div className="adm-dato-secundario">{it.sku_code || 'Ítem especial'}</div>
                                                    </div>
                                                </div>

                                                <div className="cot-fila-ancha">
                                                    <div className="cot-fila-apretada">
                                                        <span className="cot-dato-minimo">Precio ($):</span>
                                                        <input
                                                            type="number"
                                                            value={it.precio_unitario_estimado}
                                                            onChange={(e) => handlePriceChange(idx, e.target.value)}
                                                            className="cot-campo-corto"
                                                        />
                                                    </div>

                                                    <div className="cot-cantidad">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQuantityChange(idx, -1)}
                                                            className="cot-cantidad-boton"
                                                        >-</button>
                                                        <span className="cot-cantidad-valor">{it.cantidad}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleQuantityChange(idx, 1)}
                                                            className="cot-cantidad-boton"
                                                        >+</button>
                                                    </div>

                                                    <div className="cot-precio cot-precio--alineado">
                                                        ${(it.cantidad * (it.precio_unitario_estimado || 0)).toLocaleString()}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(idx)}
                                                        className="cot-boton-borrar"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        <div className="cot-pie-total">
                                            <div className="cot-entrega">
                                                <span className="cot-dato-fuerte">TOTAL COTIZACIÓN:</span>
                                                <span className="cot-total">${totalCotizacion.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* PASO 3: DESPACHO Y NOTAS */}
                            <div className="adm-tarjeta">
                                <div className="cot-paso">
                                    <MapPin size={18} color="#8f0653" /> 3. Envío y Observaciones
                                </div>
                                <div className="cot-rejilla--estrecha">
                                    <div className="adm-ancho-total">
                                        <label className="adm-etiqueta">Tipo de entrega</label>
                                        <select
                                            value={modoEntrega} onChange={e => setModoEntrega(e.target.value)}
                                            className="adm-campo adm-campo--fuerte"
                                        >
                                            <option value="DESPACHO">DESPACHO — la prenda viaja con un transportista</option>
                                            <option value="RETIRO">RETIRO EN LOCAL — la clienta la viene a buscar</option>
                                        </select>
                                    </div>
                                    {/* Lo de abajo es del despacho. En un retiro no existe: no hay
                                        transportista, ni direccion, ni comuna de destino. */}
                                    {modoEntrega === 'DESPACHO' && (<>
<div>
                                        <label className="adm-etiqueta">Transporte</label>
                                        <select
                                            value={transporte} onChange={e => setTransporte(e.target.value)}
                                            className="adm-campo adm-campo--fuerte"
                                        >
                                            <option value="STARKEN">STARKEN</option>
                                            <option value="CHILEXPRESS">CHILEXPRESS</option>
                                            <option value="DESPACHO PROPIO">DESPACHO PROPIO / OTRO</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="adm-etiqueta">Tipo Despacho</label>
                                        <select
                                            value={tipoDespacho} onChange={e => setTipoDespacho(e.target.value)}
                                            className="adm-campo adm-campo--fuerte"
                                        >
                                            <option value="DOMICILIO">A DOMICILIO</option>
                                            <option value="SUCURSAL">A SUCURSAL</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="adm-etiqueta">Región</label>
                                        <select
                                            value={region}
                                            onChange={e => {
                                                setRegion(e.target.value);
                                                // La comuna anterior pertenece a otra region.
                                                setComuna('');
                                                setComunaId('');
                                            }}
                                            className="adm-campo"
                                        >
                                            <option value="">Seleccione una región</option>
                                            {regiones.map(r => (
                                                <option key={r.id} value={r.nombre}>{r.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="adm-etiqueta">Comuna</label>
                                        <select
                                            value={comuna}
                                            onChange={e => {
                                                const elegida = comunas.find(c => c.nombre === e.target.value);
                                                setComuna(e.target.value);
                                                setComunaId(elegida ? elegida.id : '');
                                            }}
                                            className="adm-campo"
                                            disabled={!region}
                                        >
                                            <option value="">
                                                {region ? 'Seleccione una comuna' : 'Elija primero la región'}
                                            </option>
                                            {comunas.map(c => (
                                                <option key={c.id} value={c.nombre}>{c.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="adm-ancho-total">
                                        <label className="adm-etiqueta">Dirección exacta o Sucursal</label>
                                        <input
                                            type="text" placeholder="Calle Ejemplo #123, Depto 4B o Nombre de Sucursal Starken..."
                                            value={direccion} onChange={e => setDireccion(e.target.value)}
                                            className="adm-campo"
                                        />
                                    </div>
                                    </>)}
                                    <div className="adm-ancho-total">
                                        <label className="adm-etiqueta">Nota u Observación Interna</label>
                                        <textarea
                                            placeholder="Anotaciones especiales para el taller, fecha límite de entrega, requerimientos del cliente..."
                                            value={mensaje} onChange={e => setMensaje(e.target.value)}
                                            rows="2"
                                            className="adm-campo"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Pie del modal */}
                {!createdCotizacion && (
                    <div className="cot-pie">
                        <button
                            type="button"
                            onClick={onClose}
                            className="cot-boton-neutro"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="cot-guardar"
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
