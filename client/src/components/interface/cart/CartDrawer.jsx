import React, { useState } from 'react';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCart } from '../../../context/CartContext';
import { formatCurrency } from '../../../utils/cartUtils';
import { useScrollLock } from '../../../hooks/useScrollLock';
import CheckoutForm from './CheckoutForm';
import './CartDrawer.css';

const CartDrawer = () => {
    const { cart, isCartOpen, setIsCartOpen, removeItem, updateQuantity, total, itemsCount } = useCart();
    const [showCheckout, setShowCheckout] = useState(false);

    useScrollLock(isCartOpen);

    const handleClose = () => {
        setIsCartOpen(false);
        setShowCheckout(false);
    };

    if (!isCartOpen) return null;

    return (
        <div className="cart-overlay fade-in" onClick={handleClose}>
            <div className="cart-drawer slide-in-right" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="cart-header">
                    <div className="cart-title-wrapper">
                        <ShoppingBag size={24} />
                        <h2>Tu Cotización</h2>
                        <span className="cart-count-pill">{itemsCount}</span>
                    </div>
                    <button className="btn-close-cart" onClick={handleClose}>
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="cart-body">
                    {cart.length === 0 ? (
                        <div className="empty-cart-state">
                            <div className="empty-icon-ring">
                                <ShoppingBag size={48} />
                            </div>
                            <h3>Tu lista de cotización está vacía</h3>
                            <p>¡Explora nuestro catálogo y encuentra algo que te encante!</p>
                            <button className="btn-return-shopping" onClick={handleClose}>
                                Volver a la tienda
                            </button>
                        </div>
                    ) : (
                        <div className="cart-items-list">
                            {cart.map((item) => (
                                <div key={`${item.productId}-${item.sku}`} className="cart-item-card">
                                    <div className="item-image-wrapper">
                                        <img src={item.image} alt={item.name} />
                                    </div>
                                    <div className="item-details">
                                        <div className="item-header-row">
                                            <h4>{item.name}</h4>
                                            <button 
                                                className="btn-remove-item" 
                                                onClick={() => removeItem(item.productId, item.sku, item.selections)}
                                                title="Eliminar producto"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <p className="item-variant-label">{item.variantLabel}</p>
                                        <div className="item-price-row">
                                            <span className="item-price">{formatCurrency(item.price)}</span>
                                            <div className="quantity-controls-mini">
                                                <button onClick={() => updateQuantity(item.productId, item.sku, item.selections, -1)}>
                                                    <Minus size={14} />
                                                </button>
                                                <span>{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.productId, item.sku, item.selections, 1)}>
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {cart.length > 0 && (
                    <div className="cart-footer">
                        <div className="cart-total-summary">
                            <span>Subtotal estimado</span>
                            <span className="total-amount-display">{formatCurrency(total)}</span>
                        </div>
                        <p className="cart-notice">Los costos de envío se coordinarán con la vendedora.</p>
                        <button 
                            className="btn-checkout-primary"
                            onClick={() => setShowCheckout(true)}
                        >
                            Continuar con la Cotización
                            <ArrowRight size={20} />
                        </button>
                    </div>
                )}
            </div>

            {/* Modal de Pago / Formulario Checkout */}
            {showCheckout && (
                <CheckoutForm onClose={() => setShowCheckout(false)} />
            )}


        </div>
    );
};

export default CartDrawer;
