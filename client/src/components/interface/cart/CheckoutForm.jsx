import React, { useState, useEffect } from 'react';
import { X, Send, User, Mail, Phone, MapPin } from 'lucide-react';
import { useForm } from '../../../hooks/useForm';
import { validarRut } from '../../../utils/rut';
import { useCart } from '../../../context/CartContext';
import { buildWhatsAppMessage, openWhatsApp } from '../../../utils/cartUtils';
import { descuentoDeLinea } from '../../../utils/descuentoDeLinea';
import { track } from '../../../lib/analytics';
import { get, post } from '../../../lib/api/client';
import { formatRUT } from '../../../utils/formatters';
import { useSettings } from '../../../context/SettingsContext';
import './CheckoutForm.css';
import '../vistas/Contacto.css';

const CheckoutForm = ({ onClose }) => {
    const { cart, total, descuentos, regalos, clearCart } = useCart();
    const { settings } = useSettings();
    const rawShippingMethods = settings?.shipping_methods !== undefined 
        ? settings.shipping_methods 
        : ['STARKEN', 'CORREOS DE CHILE', 'RETIRO EN LOCAL', 'OTRO'];
    // El retiro dejó de ser un "método de envío" y pasó a ser su propio modo de
    // entrega, arriba. Si además siguiera apareciendo acá, la clienta podría
    // elegir "despacho" y de transportista "retiro en local", que se
    // contradicen. El filtro por nombre es cosmético —lo peor que pasa es una
    // opción de más en una lista—, no decide nada del stock.
    const shippingMethodsList = rawShippingMethods.filter(
        m => !m.toUpperCase().includes('CHILEXPRESS') && !m.toUpperCase().includes('RETIRO')
    );
    const shippingMethods = shippingMethodsList.length > 0 ? shippingMethodsList : ['STARKEN', 'CORREOS DE CHILE', 'RETIRO EN LOCAL', 'OTRO'];
    
    const baseInitialValues = {
        rut: '',
        nombre: '',
        email: '',
        telefono: '',
        transporte: shippingMethods[0],
        region: '',
        comuna: '',
        comuna_id: '',
        direccion: '',
        tipo_despacho: 'DOMICILIO',
        modo_entrega: 'DESPACHO'
    };

    const getInitialValues = () => {
        try {
            const saved = localStorage.getItem('checkoutDraft');
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return baseInitialValues;
    };

    const [regiones, setRegiones] = useState([]);
    const [comunas, setComunas] = useState([]);

    useEffect(() => {
        get('/api/v1/geo/regiones')
            .then(data => setRegiones(data))
            .catch(err => console.error('Error fetching regiones:', err));
    }, []);

    // Los largos son los de las columnas de la base. Si el formulario deja
    // pasar algo más largo, el servidor no lo guarda y el pedido se pierde:
    // pasó de verdad con un RUT de más (ver H17).
    const LARGOS = { nombre: 200, email: 255, telefono: 20, direccion: 255 };

    const validate = (values) => {
        const errors = {};
        if (!values.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
        else if (values.nombre.length > LARGOS.nombre) errors.nombre = 'El nombre es demasiado largo';

        // Dígito verificador, no un largo máximo: un RUT con un dígito de más
        // no es un engaño, es un error de tipeo, y el módulo 11 lo detecta sin
        // tener que interpretar la intención de nadie.
        const rut = validarRut(values.rut);
        if (!rut.valido) errors.rut = rut.motivo;

        if (!values.telefono.trim()) errors.telefono = 'El teléfono es obligatorio';
        else if (values.telefono.length > LARGOS.telefono) errors.telefono = 'El teléfono es demasiado largo';

        if (values.email && values.email.length > LARGOS.email) errors.email = 'El correo es demasiado largo';
        if (values.direccion && values.direccion.length > LARGOS.direccion) errors.direccion = 'La dirección es demasiado larga';
        // La dirección sólo se pide cuando un transportista la lleva hasta la
        // casa. Ni el retiro en el local ni el despacho a la agencia la
        // necesitan. Se mira el MODO, no el nombre del transporte.
        const requiereDireccion = values.modo_entrega === 'DESPACHO' && values.tipo_despacho !== 'SUCURSAL';
        if (requiereDireccion && !values.direccion.trim()) errors.direccion = 'La dirección de tu domicilio particular es obligatoria';
        return errors;
    };
    const { values, errors, handleChange, handleSubmit, isSubmitting, setValues } = useForm(getInitialValues(), validate);
    const [falloRegistro, setFalloRegistro] = useState(false);

    useEffect(() => {
        localStorage.setItem('checkoutDraft', JSON.stringify(values));
    }, [values]);

    useEffect(() => {
        if (shippingMethods.length > 0 && !shippingMethods.includes(values.transporte)) {
            setValues(prev => ({...prev, transporte: shippingMethods[0]}));
        }
    }, [shippingMethods, values.transporte]);

    useEffect(() => {
        if (!values.region || regiones.length === 0) {
            if (!values.region) setComunas([]);
            return;
        }
        const regionObj = regiones.find(r => 
            r.nombre.trim().toLowerCase() === String(values.region).trim().toLowerCase() ||
            String(r.id) === String(values.region)
        );
        if (regionObj) {
            get(`/api/v1/geo/regiones/${regionObj.id}/comunas`)
                .then(data => {
                    const loadedComunas = Array.isArray(data) ? data : [];
                    setComunas(loadedComunas);
                    setValues(prev => {
                        const match = loadedComunas.find(c => 
                            c.nombre.trim().toLowerCase() === String(prev.comuna || '').trim().toLowerCase() ||
                            String(c.id) === String(prev.comuna_id || '')
                        );
                        if (match && (prev.comuna !== match.nombre || prev.comuna_id !== match.id)) {
                            return { ...prev, comuna: match.nombre, comuna_id: match.id };
                        }
                        return prev;
                    });
                })
                .catch(err => console.error('Error fetching comunas:', err));
        } else {
            setComunas([]);
        }
    }, [values.region, regiones, setValues]);

    // Cuando cambia la región por acción del usuario, actualizar región y resetear comuna
    const handleRegionChange = (e) => {
        const selectedRegionNombre = e.target.value;
        handleChange(e);
        setValues(prev => ({ 
            ...prev, 
            region: selectedRegionNombre,
            comuna: '', 
            comuna_id: '' 
        }));
    };

    // Cuando cambia la comuna, guardar también su ID
    const handleComunaChange = (e) => {
        const selectedComunaNombre = e.target.value;
        const comunaObj = comunas.find(c => c.nombre === selectedComunaNombre);
        setValues(prev => ({ 
            ...prev, 
            comuna: selectedComunaNombre,
            comuna_id: comunaObj ? comunaObj.id : ''
        }));
    };

    const onSubmit = async (formData) => {
        let registrado = false;
        const whatsappMsg = buildWhatsAppMessage({
            tipo: 'pedido',
            cliente: { nombre: formData.nombre, rut: formData.rut, email: formData.email, telefono: formData.telefono },
            despacho: {
                transporte: formData.modo_entrega === 'RETIRO'
                    ? 'RETIRO EN EL LOCAL'
                    : (formData.tipo_despacho === 'SUCURSAL'
                        ? `${formData.transporte} (a sucursal)`
                        : formData.transporte),
                direccion: (formData.modo_entrega === 'RETIRO' || formData.tipo_despacho === 'SUCURSAL')
                    ? null
                    : formData.direccion,
                comuna: formData.comuna,
                region: formData.region,
            },
            productos: cart.map(item => ({
                name: item.name,
                variantLabel: item.variantLabel,
                selections: item.selections,
                quantity: item.quantity,
                // El precio que realmente se cobra, y el descuento que lo explica.
                price: item.precioTramo ?? item.price,
                descuento: descuentoDeLinea(item),
                url: item.productUrl,
            })),
            descuentos,
            regalos,
            total,
        });
        const contactNumber = settings?.social_links?.whatsapp?.replace(/\D/g, '') || '56931251973';
        // Se abre SÍNCRONAMENTE antes de cualquier operación asíncrona (evita bloqueo de pop-up por Safari en iPad)
        openWhatsApp(contactNumber, whatsappMsg);

        // Analítica síncrona
        try {
            cart.forEach(item => track('checkout_whatsapp', { sku: item.sku, product_id: item.productId }));
        } catch { /* no bloquea el envío */ }

        // Registrar la cotización en el CRM en segundo plano sin demorar ni bloquear el salto a WhatsApp
        try {
            const partesNombre = formData.nombre.trim().split(' ');
            // Cada mitad va a su propia columna de 100; el formulario limita el
            // total, pero un nombre de una sola palabra larguísima igual entraría.
            const nombres = (partesNombre[0] || '').slice(0, 100);
            const apellidos = (partesNombre.slice(1).join(' ') || '').slice(0, 100);
            const items = cart.map(item => ({
                // item.sku es el CÓDIGO de texto; el vínculo con la base es el
                // id numérico. Antes se mandaba item.sku.id (".id" de un
                // string = undefined) y toda venta web quedaba sin variante.
                sku_id: item.skuId ?? null,
                cantidad: item.quantity,
                precio_unitario_estimado: item.precioTramo ?? item.price
            }));

            post('/api/v1/crm/', {
                rut: formData.rut,
                nombres: nombres,
                apellidos: apellidos,
                email_personal: formData.email,
                telefono: formData.telefono,
                origen: 'CATALOGO',
                // El modo lo declara el pedido: el servidor ya no tiene que
                // adivinarlo leyendo el nombre del transporte.
                modo_entrega: formData.modo_entrega,
                transporte: formData.transporte,
                region: formData.region,
                comuna: formData.comuna,
                comuna_id: formData.comuna_id || null,
                direccion: formData.direccion,
                tipo_despacho: formData.tipo_despacho,
                items: items
            });
            registrado = true;
        } catch (error) {
            console.error("Error al registrar el pedido", error);
        }

        // Si el registro falló NO se limpia nada. Antes se vaciaba el carrito
        // igual: la clienta veía su mensaje de WhatsApp irse y creía que el
        // pedido estaba hecho, cuando no había entrado al sistema. Perder un
        // pedido en silencio es lo peor que puede hacer esta pantalla.
        if (!registrado) {
            setFalloRegistro(true);
            return;
        }

        localStorage.removeItem('checkoutDraft');
        clearCart();
        onClose();
    };

    return (
        <div className="checkout-modal-overlay fade-in" onClick={onClose}>
            <div className="checkout-modal-card slide-up" onClick={e => e.stopPropagation()}>
                <div className="checkout-header">
                    <h2>Datos de tu Cotización</h2>
                    <button className="btn-close-modal" onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="checkout-form-body">
                    <p className="form-intro">
                        Completa tus datos para enviarle el detalle de tu cotización a la vendedora por WhatsApp.
                    </p>

                    <div className="form-grid">
                        {/* RUT - Obligatorio */}
                        <div className="input-group">
                            <label><User size={16} /> RUT *</label>
                            <input 
                                type="text" 
                                name="rut" 
                                value={values.rut} 
                                onChange={handleChange} 
                                onBlur={(e) => setValues({ ...values, rut: formatRUT(e.target.value) })}
                                placeholder="12.345.678-9"
                                className={errors.rut ? 'input-error' : ''}
                            />
                            {errors.rut && <span className="error-text">{errors.rut}</span>}
                        </div>

                        {/* Nombre - Obligatorio */}
                        <div className="input-group">
                            <label><User size={16} /> Nombre Completo *</label>
                            <input 
                                type="text" 
                                name="nombre" 
                                value={values.nombre} 
                                onChange={handleChange} 
                                placeholder="Ej: Marcela Paz"
                                className={errors.nombre ? 'input-error' : ''}
                            />
                            {errors.nombre && <span className="error-text">{errors.nombre}</span>}
                        </div>

                        {/* Contacto - Opcional */}
                        <div className="input-group">
                            <label><Mail size={16} /> Email</label>
                            <input type="email" name="email" value={values.email} onChange={handleChange} placeholder="tu@email.com" />
                        </div>
                        <div className="input-group">
                            <label><Phone size={16} /> Teléfono *</label>
                            <input 
                                type="tel" 
                                name="telefono" 
                                value={values.telefono} 
                                onChange={handleChange} 
                                placeholder="+56 9..." 
                                className={errors.telefono ? 'input-error' : ''}
                            />
                            {errors.telefono && <span className="error-text">{errors.telefono}</span>}
                        </div>

                        {/* Primero CÓMO la recibe. Son dos cosas distintas: en el
                            retiro la prenda no se mueve hasta que la clienta
                            viene; en el despacho sale con un transportista.
                            Antes esto estaba escondido como una opción más de la
                            lista de transportistas. */}
                        <div className="input-group full">
                            <label><MapPin size={16} /> ¿Cómo la recibes? *</label>
                            <div className="modo-entrega">
                                {[
                                    { valor: 'DESPACHO', titulo: 'Despacho', detalle: 'Te la enviamos por transporte' },
                                    { valor: 'RETIRO', titulo: 'Retiro en el local', detalle: 'La buscas en San Carlos' },
                                ].map(op => (
                                    <button
                                        key={op.valor}
                                        type="button"
                                        className={values.modo_entrega === op.valor ? 'modo-op activa' : 'modo-op'}
                                        onClick={() => handleChange({ target: { name: 'modo_entrega', value: op.valor } })}
                                    >
                                        <strong>{op.titulo}</strong>
                                        <span>{op.detalle}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {values.modo_entrega === 'RETIRO' ? (
                            <div className="input-group full">
                                <p className="contacto-aviso contacto-aviso--info">
                                    📍 <strong>Retiro presencial en Tienda / Taller en San Carlos, Región de Ñuble.</strong> Te contactaremos por WhatsApp con la dirección exacta y horarios disponibles para la entrega.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="input-group full">
                                    <label><MapPin size={16} /> Transporte *</label>
                                    <select name="transporte" value={values.transporte} onChange={handleChange} className="styled-select">
                                        {shippingMethods.map((method, idx) => (
                                            <option key={idx} value={method}>{method}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="input-group full">
                                    <label><MapPin size={16} /> ¿A dónde la lleva? *</label>
                                    <select name="tipo_despacho" value={values.tipo_despacho} onChange={handleChange} className="styled-select">
                                        <option value="DOMICILIO">A mi domicilio</option>
                                        <option value="SUCURSAL">A la sucursal del transporte (la retiro ahí)</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label><MapPin size={16} /> Región</label>
                                    <select name="region" value={values.region} onChange={handleRegionChange} className="styled-select">
                                        <option value="">Selecciona una región</option>
                                        {regiones.map(r => (
                                            <option key={r.id} value={r.nombre}>{r.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label><MapPin size={16} /> Comuna</label>
                                    <select name="comuna" value={values.comuna || ''} onChange={handleComunaChange} className="styled-select" disabled={!values.region}>
                                        <option value="">Selecciona una comuna</option>
                                        {comunas.map(c => (
                                            <option key={c.id} value={c.nombre}>{c.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                {values.tipo_despacho === 'SUCURSAL' ? (
                                    <div className="input-group full">
                                        <p className="contacto-aviso">
                                            Retiras en una sucursal de <strong>{values.transporte}</strong>. Coordinarás la sucursal exacta por WhatsApp según tu comuna.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="input-group full">
                                        <label><MapPin size={16} /> Dirección de Domicilio Particular *</label>
                                        <input
                                            type="text"
                                            name="direccion"
                                            value={values.direccion}
                                            onChange={handleChange}
                                            placeholder="Calle, número, depto/casa..."
                                            className={errors.direccion ? 'input-error' : ''}
                                        />
                                        {errors.direccion && <span className="error-text">{errors.direccion}</span>}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {falloRegistro && (
                        <div className="checkout-fallo">
                            <strong>Tu mensaje de WhatsApp se envió, pero no pudimos registrar el pedido.</strong>
                            <span>
                                Dejamos tus productos en el carrito para que puedas intentarlo otra vez.
                                Si vuelve a fallar, escríbenos por WhatsApp y lo tomamos igual.
                            </span>
                        </div>
                    )}

                    <div className="checkout-footer-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>Volver</button>
                        <button type="submit" className="btn-submit-whatsapp" disabled={isSubmitting}>
                            <Send size={18} />
                            Enviar cotización por WhatsApp
                        </button>
                    </div>
                </form>
            </div>

        </div>
    );
};

export default CheckoutForm;
