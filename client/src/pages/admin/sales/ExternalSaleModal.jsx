import React, { useState, useEffect } from 'react';
import Button from '../../../components/atoms/Button';
import Input from '../../../components/atoms/Input';
import api from '../../../services/api';
import { useNotification } from '../../../context/NotificationContext';
import './ExternalSaleModal.css';

export default function ExternalSaleModal({ isOpen, onClose, onSuccess, products }) {
    const [origin, setOrigin] = useState('ML');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [notes, setNotes] = useState('');

    const [selectedProducts, setSelectedProducts] = useState([]);
    const [total, setTotal] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { showNotification } = useNotification();

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setOrigin('ML');
            setCustomerName('');
            setCustomerPhone('');
            setCustomerAddress('');
            setNotes('');
            setSelectedProducts([]);
            setTotal('');
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleAddProduct = (e) => {
        const productId = e.target.value;
        if (!productId) return;

        const product = products.find(p => p.id === productId);
        if (product && !selectedProducts.find(p => p.product_id === productId)) {
            setSelectedProducts([...selectedProducts, {
                product_id: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                stock: product.stock
            }]);
        }
        e.target.value = ""; // reset select
    };

    const handleRemoveProduct = (productId) => {
        setSelectedProducts(selectedProducts.filter(p => p.product_id !== productId));
    };

    const handleUpdateQuantity = (productId, delta) => {
        setSelectedProducts(selectedProducts.map(p => {
            if (p.product_id === productId) {
                const newQ = Math.max(1, Math.min(p.stock || 999, p.quantity + delta));
                return { ...p, quantity: newQ };
            }
            return p;
        }));
    };

    const calculatedTotal = selectedProducts.reduce((acc, p) => acc + (p.price * p.quantity), 0);
    const finalTotal = total !== '' ? parseFloat(total) : calculatedTotal;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedProducts.length === 0) {
            showNotification('warning', 'Debes incluir al menos un producto para registrar la venta y descontar el inventario.');
            return;
        }

        setIsSubmitting(true);
        try {
            const prefix = origin === 'ML' ? 'ML-' : 'EXT-';
            const internalRef = `${prefix}${Date.now()}`;

            const payload = {
                internal_ref: internalRef,
                customer_name: customerName,
                customer_phone: customerPhone || null,
                customer_address: customerAddress || null,
                notes: notes ? `Origen: ${origin === 'ML' ? 'Mercado Libre' : 'Fuera de Web'} - ${notes}` : `Origen: ${origin === 'ML' ? 'Mercado Libre' : 'Fuera de Web'}`,
                delivery_cost: 0,
                items: selectedProducts.map(p => ({
                    product_id: p.product_id,
                    quantity: p.quantity,
                    unit_price: p.price
                }))
            };

            await api.post('/sales', payload);

            // If they provided a custom total that doesn't match the automatic sum of items, 
            // the backend natively recalculates it on the server based on the unit_prices. 
            // It's safer to let the server calculate it for now.

            onSuccess();
        } catch (error) {
            console.error('Error creating external sale:', error);
            showNotification('error', error.response?.data?.detail || 'Error al guardar la venta externa.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-content-column external-sale-modal-content" style={{ maxWidth: '600px', backgroundColor: '#fff', borderRadius: '12px' }}>
                <div className="modal-header">
                    <h2>Agregar Venta Externa</h2>
                    <button type="button" className="btn-close" onClick={onClose} disabled={isSubmitting}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body external-sale-form">
                    <div className="form-group-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Origen de la Venta *
                            </label>
                            <select
                                className="input-field"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                value={origin}
                                onChange={(e) => setOrigin(e.target.value)}
                            >
                                <option value="ML">Mercado Libre</option>
                                <option value="EXT">Fuera de Web (Manual)</option>
                            </select>
                        </div>
                        <div>
                            <Input
                                label="Nombre del Cliente *"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                required
                                fullWidth
                                placeholder="Ej: Juan Pérez"
                            />
                        </div>
                    </div>

                    <div className="form-group-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <Input
                            label="Teléfono (Opcional)"
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9+]/g, '');
                                setCustomerPhone(val);
                            }}
                            fullWidth
                            placeholder="+56 9..."
                            maxLength={15}
                        />
                        <Input
                            label="Dirección (Opcional)"
                            value={customerAddress}
                            onChange={(e) => setCustomerAddress(e.target.value)}
                            fullWidth
                            placeholder={origin === 'ML' ? "Ej: Mercado Envíos" : "Ej: Calle Falsa 123"}
                        />
                    </div>

                    <div className="external-sale-products-section" style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '0.85rem', margin: '0 0 1rem 0', color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Productos Vendidos (Descuenta Stock) *</h3>

                        <div style={{ marginBottom: '1.25rem' }}>
                            <select
                                className="input-field"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                onChange={handleAddProduct}
                                defaultValue=""
                            >
                                <option value="" disabled>-- Selecciona un producto para agregar --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                                        {p.name} - ${Number(p.price).toLocaleString('es-CL')} {p.stock <= 0 ? '(Agotado)' : `(Stock: ${p.stock})`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedProducts.length > 0 && (
                            <div className="selected-products-list">
                                {selectedProducts.map(p => (
                                    <div key={p.product_id} className="product-item-row">
                                        <div className="product-info-header" style={{ flex: 1 }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e293b' }}>{p.name}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>${Number(p.price).toLocaleString('es-CL')} c/u</div>
                                            </div>
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveProduct(p.product_id)} 
                                                className="btn-remove-mobile-only"
                                                style={{ background: '#fee2e2', border: 'none', color: '#ef4444', height: '28px', width: '28px', borderRadius: '6px', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                        
                                        <div className="product-controls-footer">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <button type="button" onClick={() => handleUpdateQuantity(p.product_id, -1)} style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f1f5f9', cursor: 'pointer', fontSize: '1.2rem' }}>-</button>
                                                <span style={{ minWidth: '24px', textAlign: 'center', fontSize: '1rem', fontWeight: 600 }}>{p.quantity}</span>
                                                <button type="button" onClick={() => handleUpdateQuantity(p.product_id, 1)} style={{ width: '32px', height: '32px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f1f5f9', cursor: 'pointer', fontSize: '1.2rem' }}>+</button>
                                            </div>
                                            <div style={{ fontWeight: 700, fontSize: '1rem', textAlign: 'right', color: '#10b981' }}>
                                                ${(p.price * p.quantity).toLocaleString('es-CL')}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', padding: '0 0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
                                    Total Venta: <span style={{ color: '#10b981', marginLeft: '0.75rem' }}>${calculatedTotal.toLocaleString('es-CL')}</span>
                                </div>
                            </div>
                        )}
                        {selectedProducts.length === 0 && (
                            <div style={{ textAlign: 'center', fontSize: '0.9rem', color: '#94a3b8', padding: '1.5rem', background: '#fff', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                                🛒 No hay productos seleccionados.
                            </div>
                        )}
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: '0.4rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Notas Internas (Opcional)
                        </div>
                        <textarea
                            className="input-field"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '80px', fontFamily: 'inherit', fontSize: '0.95rem' }}
                            placeholder="Ej: Vendido por Instagram, pagó por transferencia..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>

                    <div className="external-sale-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', marginTop: 'auto' }}>
                        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
                        <Button variant="primary" type="submit" disabled={isSubmitting || selectedProducts.length === 0}>
                            {isSubmitting ? 'Registrando...' : 'Registrar Venta'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
