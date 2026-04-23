import React from 'react';
import { X, Send, User, Mail, Phone, MapPin } from 'lucide-react';
import { useForm } from '../../../hooks/useForm';
import { useCart } from '../../../context/CartContext';
import { generateWhatsAppMessage } from '../../../utils/cartUtils';

const CheckoutForm = ({ onClose }) => {
    const { cart, total, clearCart } = useCart();
    
    const initialValues = {
        nombre: '',
        email: '',
        telefono: '',
        region: '',
        comuna: '',
        direccion: ''
    };

    const validate = (values) => {
        const errors = {};
        if (!values.nombre.trim()) errors.nombre = 'El nombre es obligatorio';
        return errors;
    };

    const { values, errors, handleChange, handleSubmit, isSubmitting } = useForm(initialValues, validate);

    const onSubmit = (formData) => {
        const whatsappMsg = generateWhatsAppMessage(cart, formData, total);
        const whatsappUrl = `https://wa.me/56931251973?text=${whatsappMsg}`; // Número de Paola
        
        // Abrir WhatsApp en nueva pestaña
        window.open(whatsappUrl, '_blank');
        
        // Limpiamos carrito tras "enviar"
        clearCart();
        onClose();
    };

    return (
        <div className="checkout-modal-overlay fade-in" onClick={onClose}>
            <div className="checkout-modal-card slide-up" onClick={e => e.stopPropagation()}>
                <div className="checkout-header">
                    <h2>Datos de tu Pedido</h2>
                    <button className="btn-close-modal" onClick={onClose}><X size={20} /></button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="checkout-form-body">
                    <p className="form-intro">
                        Completa tus datos para enviarle el detalle de tu pedido a la vendedora por WhatsApp.
                    </p>

                    <div className="form-grid">
                        {/* Nombre - Obligatorio */}
                        <div className="input-group full">
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
                        <div className="input-group">
                            <label><MapPin size={16} /> Región</label>
                            <input type="text" name="region" value={values.region} onChange={handleChange} placeholder="Ej: Metropolitana" />
                        </div>
                        <div className="input-group">
                            <label><MapPin size={16} /> Comuna</label>
                            <input type="text" name="comuna" value={values.comuna} onChange={handleChange} placeholder="Ej: Providencia" />
                        </div>
                        <div className="input-group full">
                            <label><MapPin size={16} /> Dirección de Despacho</label>
                            <input type="text" name="direccion" value={values.direccion} onChange={handleChange} placeholder="Calle, número, depto..." />
                        </div>
                    </div>

                    <div className="checkout-footer-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>Volver</button>
                        <button type="submit" className="btn-submit-whatsapp" disabled={isSubmitting}>
                            <Send size={18} />
                            Enviar pedido por WhatsApp
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
                }

                .checkout-header {
                    padding: 24px;
                    background: #f8fafc;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid #e2e8f0;
                }
                .checkout-header h2 { margin: 0; font-size: 1.25rem; font-weight: 800; color: #1e1b4b; }
                .btn-close-modal { background: none; border: none; cursor: pointer; color: #94a3b8; }

                .checkout-form-body { padding: 24px; }
                .form-intro { font-size: 14px; color: #64748b; margin-bottom: 24px; line-height: 1.5; }

                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                .input-group.full { grid-column: span 2; }
                .input-group { display: flex; flex-direction: column; gap: 8px; }
                .input-group label { font-size: 13px; font-weight: 700; color: #1e1b4b; display: flex; align-items: center; gap: 6px; }
                .input-group input {
                    height: 48px;
                    padding: 0 16px;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    font-size: 14px;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }
                .input-group input:focus { outline: none; border-color: #1e1b4b; box-shadow: 0 0 0 3px rgba(30, 27, 75, 0.05); }
                .input-group input.input-error { border-color: #ef4444; background: #fffafb; }
                .error-text { font-size: 12px; color: #ef4444; font-weight: 600; }

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
