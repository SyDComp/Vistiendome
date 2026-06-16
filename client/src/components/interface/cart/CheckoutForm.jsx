import React, { useState, useEffect } from 'react';
import { X, Send, User, Mail, Phone, MapPin } from 'lucide-react';
import { useForm } from '../../../hooks/useForm';
import { useCart } from '../../../context/CartContext';
import { generateWhatsAppMessage } from '../../../utils/cartUtils';
import { get, post } from '../../../lib/api/client';

const CheckoutForm = ({ onClose }) => {
    const { cart, total, clearCart } = useCart();
    
    const baseInitialValues = {
        rut: '',
        nombre: '',
        email: '',
        telefono: '',
        transporte: 'STARKEN',
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
        return errors;
    };

    const { values, errors, handleChange, handleSubmit, isSubmitting, setValues } = useForm(getInitialValues(), validate);

    useEffect(() => {
        localStorage.setItem('checkoutDraft', JSON.stringify(values));
    }, [values]);

    // Cuando cambia la región, cargar sus comunas
    const handleRegionChange = (e) => {
        const selectedRegionNombre = e.target.value;
        handleChange(e);
        
        // Buscar la region seleccionada para obtener su ID
        const regionObj = regiones.find(r => r.nombre === selectedRegionNombre);
        if (regionObj) {
            get(`/api/v1/geo/regiones/${regionObj.id}/comunas`)
                .then(data => {
                    setComunas(data);
                    // Resetear comuna al cambiar region
                    setValues(prev => ({ ...prev, comuna: '', comuna_id: '' }));
                })
                .catch(err => console.error('Error fetching comunas:', err));
        } else {
            setComunas([]);
            setValues(prev => ({ ...prev, comuna: '', comuna_id: '' }));
        }
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
        try {
            // Separar nombres y apellidos (básico)
            const partesNombre = formData.nombre.trim().split(' ');
            const nombres = partesNombre[0] || '';
            const apellidos = partesNombre.slice(1).join(' ') || '';

            // Formatear items del carrito
            const items = cart.map(item => ({
                sku_id: item.sku ? item.sku.id : null,
                cantidad: item.quantity,
                precio_unitario_estimado: item.price
            }));

            // Llamada al backend
            try {
                await post('/api/v1/crm/', {
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
                });
            } catch (error) {
                console.error("Error al registrar cotización en CRM", error);
            }
        } catch (error) {
            console.error("Error de red al registrar cotización", error);
        }

        const whatsappMsg = generateWhatsAppMessage(cart, formData, total);
        const whatsappUrl = `https://wa.me/56931251973?text=${whatsappMsg}`; // Número de Paola
        
        // Abrir WhatsApp en nueva pestaña
        window.open(whatsappUrl, '_blank');
        
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
                            <label><Phone size={16} /> Teléfono</label>
                            <input type="tel" name="telefono" value={values.telefono} onChange={handleChange} placeholder="+56 9..." />
                        </div>

                        {/* Despacho - Opcional */}
                        <div className="input-group full">
                            <label><MapPin size={16} /> Método de Envío *</label>
                            <select name="transporte" value={values.transporte} onChange={handleChange} className="styled-select">
                                <option value="STARKEN">Starken</option>
                                <option value="CORREOS DE CHILE">Correos de Chile</option>
                                <option value="CHILEXPRESS">Chilexpress</option>
                                <option value="RETIRO EN LOCAL">Retiro en Local</option>
                                <option value="OTRO">Otro</option>
                            </select>
                        </div>
                        <div className="input-group full">
                            <label><MapPin size={16} /> Tipo de Entrega *</label>
                            <select name="tipo_despacho" value={values.tipo_despacho} onChange={handleChange} className="styled-select">
                                <option value="DOMICILIO">Despacho a Domicilio</option>
                                <option value="SUCURSAL">Retiro en Sucursal</option>
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
                            <select name="comuna" value={values.comuna} onChange={handleComunaChange} className="styled-select" disabled={!values.region || comunas.length === 0}>
                                <option value="">Selecciona una comuna</option>
                                {comunas.map(c => (
                                    <option key={c.id} value={c.nombre}>{c.nombre}</option>
                                ))}
                            </select>
                        </div>
                        <div className="input-group full">
                            <label><MapPin size={16} /> {values.tipo_despacho === 'SUCURSAL' ? 'Dirección de la Sucursal' : 'Dirección de Despacho'}</label>
                            <input type="text" name="direccion" value={values.direccion} onChange={handleChange} placeholder={values.tipo_despacho === 'SUCURSAL' ? 'Ej: Sucursal Starken Centro...' : 'Calle, número...'} />
                        </div>
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

                .slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            `}</style>
        </div>
    );
};

export default CheckoutForm;
