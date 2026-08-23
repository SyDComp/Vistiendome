import React, { useState, useEffect } from 'react';
import { X, Send, User, Mail, Phone, MapPin } from 'lucide-react';
import { useForm } from '../../../hooks/useForm';
import { useCart } from '../../../context/CartContext';
import { buildWhatsAppMessage, openWhatsApp } from '../../../utils/cartUtils';
import { track } from '../../../lib/analytics';
import { get, post } from '../../../lib/api/client';
import { formatRUT } from '../../../utils/formatters';
import { useSettings } from '../../../context/SettingsContext';

const CheckoutForm = ({ onClose }) => {
    const { cart, total, descuentos, regalos, clearCart } = useCart();
    const { settings } = useSettings();
    const rawShippingMethods = settings?.shipping_methods !== undefined 
        ? settings.shipping_methods 
        : ['STARKEN', 'CORREOS DE CHILE', 'RETIRO EN LOCAL', 'OTRO'];
    const shippingMethodsList = rawShippingMethods.filter(m => !m.toUpperCase().includes('CHILEXPRESS'));
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
        tipo_despacho: 'DOMICILIO'
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

    const validate = (values) => {
        const errors = {};
        if (!values.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
        if (!values.rut.trim()) errors.rut = 'El RUT es obligatorio';
        if (!values.telefono.trim()) errors.telefono = 'El teléfono es obligatorio';
        // La dirección solo se pide (y es obligatoria) cuando el despacho es a domicilio:
        // retiro en tienda y retiro en sucursal no la necesitan.
        const requiereDireccion = !values.transporte?.toUpperCase().includes('RETIRO') && values.tipo_despacho !== 'SUCURSAL';
        if (requiereDireccion && !values.direccion.trim()) errors.direccion = 'La dirección de tu domicilio particular es obligatoria';
        return errors;
    };
    const { values, errors, handleChange, handleSubmit, isSubmitting, setValues } = useForm(getInitialValues(), validate);

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
        const whatsappMsg = buildWhatsAppMessage({
            tipo: 'pedido',
            cliente: { nombre: formData.nombre, rut: formData.rut, email: formData.email, telefono: formData.telefono },
            despacho: {
                transporte: formData.tipo_despacho === 'SUCURSAL' ? `${formData.transporte} (retiro en sucursal)` : formData.transporte,
                direccion: formData.tipo_despacho === 'SUCURSAL' ? null : formData.direccion,
                comuna: formData.comuna,
                region: formData.region,
            },
            productos: cart.map(item => ({
                name: item.name,
                // Si el precio de tramo (mayorista, iglesia) aplica, es el que
                // realmente se le va a cobrar — Paola necesita verlo en el
                // mensaje, no el unitario que ya no corresponde.
                variantLabel: item.tramoAplicado
                    ? `${item.variantLabel} · Precio ${item.tramoAplicado}`
                    : item.variantLabel,
                selections: item.selections,
                quantity: item.quantity,
                price: item.precioTramo ?? item.price,
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
            const nombres = partesNombre[0] || '';
            const apellidos = partesNombre.slice(1).join(' ') || '';
            const items = cart.map(item => ({
                sku_id: item.sku ? item.sku.id : null,
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
                transporte: formData.transporte,
                region: formData.region,
                comuna: formData.comuna,
                comuna_id: formData.comuna_id,
                direccion: formData.direccion,
                tipo_despacho: formData.tipo_despacho,
                items: items
            }).catch(error => console.error("Error al registrar cotización en CRM", error));
        } catch (error) {
            console.error("Error de red al preparar cotización", error);
        }

        // Limpiamos datos tras "enviar"
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

                        {/* Despacho - Opcional */}
                        <div className="input-group full">
                            <label><MapPin size={16} /> Método de Envío *</label>
                            <select name="transporte" value={values.transporte} onChange={handleChange} className="styled-select">
                                {shippingMethods.map((method, idx) => (
                                    <option key={idx} value={method}>{method}</option>
                                ))}
                            </select>
                        </div>

                        {values.transporte?.toUpperCase().includes('RETIRO') ? (
                            <div className="input-group full">
                                <p style={{ margin: 0, fontSize: '13px', color: '#0369a1', background: '#e0f2fe', padding: '12px 14px', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                                    📍 <strong>Retiro presencial en Tienda / Taller en San Carlos, Región de Ñuble.</strong> Te contactaremos por WhatsApp con la dirección exacta y horarios disponibles para la entrega.
                                </p>
                            </div>
                        ) : (
                            <>
                                <div className="input-group full">
                                    <label><MapPin size={16} /> Tipo de Entrega *</label>
                                    <select name="tipo_despacho" value={values.tipo_despacho} onChange={handleChange} className="styled-select">
                                        <option value="DOMICILIO">Despacho a Domicilio</option>
                                        <option value="SUCURSAL">Retiro en Sucursal (Agencia)</option>
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
                                        <p style={{ margin: 0, fontSize: '13px', color: '#64748b', background: '#f8fafc', padding: '12px 14px', borderRadius: '12px' }}>
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

                    <div className="checkout-footer-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>Volver</button>
                        <button type="submit" className="btn-submit-whatsapp" disabled={isSubmitting}>
                            <Send size={18} />
                            Enviar cotización por WhatsApp
                        </button>
                    </div>
                </form>
            </div>

            <style>{`
                .checkout-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(4px);
                    z-index: 2100;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .checkout-modal-card {
                    width: 100%;
                    max-width: 550px;
                    background: white;
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-sizing: border-box;
                }

                .checkout-header {
                    padding: 24px;
                    background: #f8fafc;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #e2e8f0;
                    flex-shrink: 0;
                    box-sizing: border-box;
                    width: 100%;
                }
                .checkout-header h2 { margin: 0; font-size: 1.25rem; font-weight: 800; color: #1e1b4b; }
                .btn-close-modal { background: none; border: none; cursor: pointer; color: #94a3b8; }

                .checkout-form-body { 
                    padding: 24px; 
                    overflow-y: auto;
                    overflow-x: hidden;
                    box-sizing: border-box;
                    width: 100%;
                }
                .form-intro { font-size: 14px; color: #64748b; margin-bottom: 24px; line-height: 1.5; }

                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; width: 100%; box-sizing: border-box; }
                .input-group.full { grid-column: span 2; }
                .input-group { display: flex; flex-direction: column; gap: 8px; width: 100%; box-sizing: border-box; }
                .input-group label { font-size: 13px; font-weight: 700; color: #1e1b4b; display: flex; align-items: center; gap: 6px; }
                .input-group input {
                    height: 48px;
                    padding: 0 16px;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    font-size: 14px;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    box-sizing: border-box;
                    width: 100%;
                }
                .input-group input:focus, .styled-select:focus { outline: none; border-color: #1e1b4b; box-shadow: 0 0 0 3px rgba(30, 27, 75, 0.05); }
                .input-group input.input-error { border-color: #ef4444; background: #fffafb; }
                .error-text { font-size: 12px; color: #ef4444; font-weight: 600; }
                .styled-select {
                    height: 48px;
                    padding: 0 16px;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    font-size: 14px;
                    background-color: white;
                    color: #1e1b4b;
                    cursor: pointer;
                    transition: border-color 0.2s, box-shadow 0.2s;
                    box-sizing: border-box;
                    width: 100%;
                }

                .checkout-footer-actions {
                    display: flex;
                    gap: 12px;
                    margin-top: 32px;
                }
                .btn-cancel {
                    flex: 1;
                    height: 52px;
                    background: #f1f5f9;
                    color: #475569;
                    border: none;
                    border-radius: 14px;
                    font-weight: 700;
                    cursor: pointer;
                }
                .btn-submit-whatsapp {
                    flex: 2;
                    height: 52px;
                    background: #1e1b4b;
                    color: white;
                    border: none;
                    border-radius: 14px;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    cursor: pointer;
                    box-shadow: 0 4px 12px rgba(30, 27, 75, 0.2);
                }
                .btn-submit-whatsapp:hover { background: #2d2a6e; }

                @media (max-width: 600px) {
                    .form-grid { grid-template-columns: 1fr; }
                    .input-group.full { grid-column: span 1; }
                }

                /* Safari en iOS hace zoom automático al enfocar un campo con
                   fuente menor a 16px: la página salta justo en el checkout y
                   la clienta queda sin saber cómo volver. Solo en pantallas
                   táctiles, para no alterar el diseño de escritorio. */
                @media (max-width: 768px) {
                    .input-group input,
                    .styled-select,
                    .checkout-form-body textarea {
                        font-size: 16px;
                    }
                }

                .slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
};

export default CheckoutForm;
