import React, { useState, useEffect, useCallback } from 'react';
import { useCart } from '../context/CartContext';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/atoms/Button';
import Input from '../components/atoms/Input';
import { useNotification } from '../context/NotificationContext';
import { useConfig } from '../context/ConfigContext';
import api from '../services/api';
import AddressPicker from '../components/organisms/AddressPicker';
import './Checkout.css';

export default function Checkout() {
    const { cart, cartTotal, clearCart } = useCart();
    const navigate = useNavigate();
    const { user, isAuthenticated, logout } = useAuth();
    const [loading, setLoading] = useState(false);
    const { showNotification } = useNotification();
    const [successOrder, setSuccessOrder] = useState(null);
    const { bankDetails, socialLinks, configs } = useConfig();



    // Calculate Delivery Cost dynamically
    // If shipping_base_cost is empty/null/undefined, shipping is completely free ($0)
    // If shipping_free_threshold is empty/null/undefined, it means there is NO free threshold, so base cost applies normally.
    const rawBaseCost = configs?.shipping_base_cost;
    const baseShipping = rawBaseCost && rawBaseCost.toString().trim() !== '' ? parseFloat(rawBaseCost) : 0;

    const rawThreshold = configs?.shipping_free_threshold;
    const freeThreshold = rawThreshold && rawThreshold.toString().trim() !== '' ? parseFloat(rawThreshold) : null;

    let isFreeShipping = false;

    if (baseShipping === 0) {
        // If they didn't set a base cost, it's always free
        isFreeShipping = true;
    } else if (freeThreshold !== null && cartTotal >= freeThreshold) {
        // If a threshold is defined and cart exceeds it, it's free
        isFreeShipping = true;
    }

    const deliveryCost = isFreeShipping ? 0 : baseShipping;
    const grandTotal = cartTotal + deliveryCost;

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        lat: null,
        lng: null,
        notes: ''
    });

    const handleAddressSelect = useCallback(({ fullAddress, lat, lng }) => {
        setFormData(prev => {
            // Only update if something actually changed to avoid render loops
            if (prev.address === fullAddress && prev.lat === lat && prev.lng === lng) {
                return prev;
            }
            return {
                ...prev,
                address: fullAddress,
                lat: lat || prev.lat,
                lng: lng || prev.lng
            };
        });
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'phone') {
            // Allow only numbers and +
            const filteredValue = value.replace(/[^0-9+]/g, '');
            setFormData(prev => ({ ...prev, [name]: filteredValue }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (cart.length === 0) {
            showNotification('warning', "Tu carrito está vacío");
            return;
        }

        if (!formData.name || formData.name.trim().length < 3) {
            showNotification('error', "Por favor ingresa tu nombre completo.");
            return;
        }

        // Address is mandatory
        if (!formData.address || formData.address.trim().length < 5) {
            showNotification('error', "Por favor completa la dirección de despacho correctamente.");
            return;
        }

        // Phone is optional. Only validate if not empty.
        if (formData.phone && formData.phone.trim().length > 0 && formData.phone.trim().length < 8) {
            showNotification('error', "Por favor ingresa un número de teléfono válido (mínimo 8 dígitos) o déjalo en blanco.");
            return;
        }

        setLoading(true);

        const orderData = {
            internal_ref: `WEB-${Date.now()}`,
            customer_name: formData.name,
            customer_phone: formData.phone,
            customer_address: formData.address,
            delivery_lat: formData.lat,
            delivery_lng: formData.lng,
            delivery_cost: deliveryCost, // Include calculated delivery cost
            notes: formData.notes,
            items: cart.map(item => ({
                product_id: item.product.id,
                quantity: item.quantity,
                unit_price: item.product.price
            }))
        };

        try {
            const response = await api.post('/sales/checkout', orderData);
            if (response.status === 200) {
                setSuccessOrder({
                    ...response.data,
                    originalCartItems: JSON.parse(JSON.stringify(cart))
                });
                clearCart();
                window.scrollTo(0, 0);
            }
        } catch (error) {
            console.error(error);
            showNotification('error', "Error al procesar el pedido. " + (error.response?.data?.detail || ""));
        } finally {
            setLoading(false);
        }
    };


    if (successOrder) {
        return (
            <div className="checkout-success">
                <div className="success-card">
                    <div className="success-icon hide-on-print">✅</div>
                    <h2>¡Pedido Confirmado!</h2>
                    <p>Gracias por tu compra, <strong>{successOrder.customer_name || formData.name}</strong>.</p>
                    <p>Tu código de pedido es:</p>
                    <h3 className="order-ref">{successOrder.internal_ref}</h3>

                    {/* Bought items summary */}
                    <div className="success-products-list">
                        <h3>🛍️ Productos Comprados</h3>
                        <div className="success-items">
                            {successOrder.originalCartItems?.map(item => (
                                <div key={item.product.id} className="success-item-row">
                                    <span className="success-item-name">{item.quantity}x {item.product.name}</span>
                                    <span className="success-item-price">${Number(item.product.price * item.quantity).toLocaleString('es-CL')}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Payment Instructions */}
                    <div className="payment-instructions">
                        <h3>💳 Datos para Transferencia</h3>
                        <div className="bank-details">
                            <div className="bank-row">
                                <span className="bank-label">Banco:</span>
                                <span className="bank-value">{bankDetails.bank_name}</span>
                            </div>
                            <div className="bank-row">
                                <span className="bank-label">Tipo de Cuenta:</span>
                                <span className="bank-value">{bankDetails.account_type}</span>
                            </div>
                            <div className="bank-row">
                                <span className="bank-label">Nº de Cuenta:</span>
                                <span className="bank-value">{bankDetails.account_number}</span>
                            </div>
                            <div className="bank-row">
                                <span className="bank-label">RUT:</span>
                                <span className="bank-value">{bankDetails.account_rut}</span>
                            </div>
                            <div className="bank-row">
                                <span className="bank-label">Nombre:</span>
                                <span className="bank-value">{bankDetails.account_holder}</span>
                            </div>
                            <div className="bank-row total-row">
                                <span className="bank-label">Monto Total:</span>
                                <span className="bank-value">${Number(successOrder.total).toLocaleString('es-CL')}</span>
                            </div>
                        </div>

                        <h3 className="print-page-break">📋 Pasos a Seguir</h3>
                        <ol className="payment-steps">
                            <li>
                                <strong>Realizar la transferencia</strong> con el monto exacto indicado arriba
                            </li>
                            <li>
                                <strong>Tomar captura de pantalla o foto</strong> del comprobante de transferencia
                            </li>
                            <li>
                                <strong>Contactar al WhatsApp</strong> con:
                                <ul>
                                    <li>Tu código de compra: <code>{successOrder.internal_ref}</code></li>
                                    <li>La captura del comprobante</li>
                                </ul>
                            </li>
                        </ol>

                        <div className="checkout-success-actions hide-on-print">
                            <Button onClick={() => window.print()} variant="secondary" className="print-btn">
                                🖨️ Imprimir Recibo
                            </Button>

                            <a
                                href={`https://wa.me/${(socialLinks.whatsapp || '').replace(/[^0-9]/g, '')}?text=Hola! Mi código de compra es ${successOrder.internal_ref}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="whatsapp-button"
                            >
                                <span className="whatsapp-icon">📱</span>
                                Validar Pago por WhatsApp
                            </a>

                            <Link to="/catalogo" className="back-to-catalog">
                                <Button>Volver al Catálogo</Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (cart.length === 0) {
        return (
            <div className="checkout-container empty-checkout">
                <h2>Tu carrito está vacío</h2>
                <Link to="/catalogo"><Button>Ir al Catálogo</Button></Link>
            </div>
        );
    }

    return (
        <div className="checkout-page">
            <p className="checkout-subtitle">Finaliza tu Orden</p>
            <h1 className="checkout-title">Finalizar Compra</h1>

            <div className="checkout-grid">
                {/* Form Section */}
                <div className="checkout-form-section">
                    <h3>Datos de Envío</h3>
                    <form id="checkout-form" onSubmit={handleSubmit} className="checkout-form">
                        <Input
                            label="Nombre Completo"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="Ej: Juan Pérez"
                        />
                        <Input
                            label="Teléfono (Opcional)"
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="+56 9 ..."
                            maxLength={15}
                        />
                        <div className="form-group">
                            <AddressPicker
                                initialAddress={formData.address}
                                onAddressSelect={handleAddressSelect}
                            />
                        </div>
                        <div className="form-group">
                            <label>Notas Adicionales (Opcional)</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                placeholder="Instrucciones especiales..."
                                rows="2"
                                className="form-textarea"
                            />
                        </div>

                        <div className="checkout-actions-mobile">
                            <Button type="submit" fullWidth disabled={loading}>
                                {loading ? 'Procesando...' : `Pagar $${grandTotal.toLocaleString('es-CL')}`}
                            </Button>
                        </div>
                    </form>
                </div>

                {/* Summary Section */}
                <div className="checkout-summary-section">
                    <div className="order-summary">
                        <h3>Resumen del Pedido</h3>
                        <div className="summary-items">
                            {cart.map(item => (
                                <div key={item.product.id} className="summary-row">
                                    <span>{item.quantity}x {item.product.name}</span>
                                    <span>${(item.product.price * item.quantity).toLocaleString('es-CL')}</span>
                                </div>
                            ))}
                        </div>

                        <div className="summary-row" style={{ marginTop: '1rem', color: '#64748b' }}>
                            <span>Subtotal</span>
                            <span>${cartTotal.toLocaleString('es-CL')}</span>
                        </div>
                        <div className="summary-row" style={{ color: '#64748b', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                            <span>Envío</span>
                            {isFreeShipping ? (
                                <span style={{ color: '#10b981', fontWeight: 'bold' }}>¡Gratis!</span>
                            ) : (
                                <span>${deliveryCost.toLocaleString('es-CL')}</span>
                            )}
                        </div>

                        <div className="summary-total" style={{ paddingTop: '1rem' }}>
                            <span>Total</span>
                            <span>${grandTotal.toLocaleString('es-CL')}</span>
                        </div>

                        <div className="checkout-actions-desktop">
                            <Button
                                type="button"
                                onClick={handleSubmit}
                                fullWidth
                                size="lg"
                                disabled={loading}
                            >
                                {loading ? 'Procesando...' : 'Confirmar Pedido'}
                            </Button>
                            <Link to="/catalogo" className="back-link">Volver al catálogo</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
