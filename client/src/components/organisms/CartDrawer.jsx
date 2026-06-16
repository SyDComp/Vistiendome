import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useConfig } from '../../context/ConfigContext';
import Button from '../atoms/Button';
import './CartDrawer.css';

const CartDrawer = ({ isOpen, onClose }) => {
    const { cart, removeFromCart, updateQuantity, cartTotal, cartCount } = useCart();
    const { configs } = useConfig();
    const navigate = useNavigate();

    const vacationMode = configs?.vacation_mode_settings || {};
    const isVacationMode = vacationMode.active;

    // Prevent body scroll when drawer is open using "Fixed + Offset" trick
    useEffect(() => {
        if (isOpen) {
            // ONLY if scroll is not already locked by another modal
            if (!document.body.classList.contains('modal-open')) {
                const scrollY = window.scrollY;
                document.body.style.position = 'fixed';
                document.body.style.top = `-${scrollY}px`;
                document.body.style.width = '100vw';
                document.body.classList.add('modal-open');
            }

            return () => {
                // Ensure scroll is only restored if NO other modales are open
                setTimeout(() => {
                    const activeModals = document.querySelectorAll('.modal-overlay, .cart-drawer-overlay, .mobile-menu-open');
                    if (activeModals.length === 0) {
                        const scrollY = document.body.style.top;
                        document.body.style.position = '';
                        document.body.style.top = '';
                        document.body.style.width = '';
                        document.body.classList.remove('modal-open');
                        // Extra fail-safe: always clean product-modal-open when cart closes
                        document.body.classList.remove('product-modal-open');
                        window.scrollTo(0, parseInt(scrollY || '0') * -1);
                    }
                }, 50);
            };
        }
    }, [isOpen]);

    const handleCheckout = () => {
        onClose();
        navigate('/checkout');
    };

    if (!isOpen) return null;

    return (
        <div className="cart-drawer-overlay" onClick={onClose}>
            <div className="cart-drawer" onClick={e => e.stopPropagation()}>
                <div className="cart-drawer-header">
                    <h2>Tu Carrito ({cartCount})</h2>
                    <button className="close-drawer-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="cart-drawer-content">
                    {cart.length === 0 ? (
                        <div className="empty-cart-message">
                            <p>Tu carrito está vacío</p>
                            <Button variant="primary" onClick={onClose}>Continuar Comprando</Button>
                        </div>
                    ) : (
                        <div className="cart-items-list">
                            {cart.map((item) => (
                                <div key={item.product.id} className="cart-item">
                                    <div className="cart-item-image">
                                        {item.product.images && item.product.images.length > 0 ? (
                                            <img
                                                src={`${(import.meta.env.VITE_API_URL || '/api/v1').replace('/api/v1', '')}/static/${item.product.images[0]}`}
                                                alt={item.product.name}
                                            />
                                        ) : (
                                            <div className="item-placeholder">📦</div>
                                        )}
                                    </div>
                                    <div className="cart-item-info">
                                        <h3>{item.product.name}</h3>
                                        {item.quantity > 1 && (
                                            <p className="item-price">${Number(item.product.price).toLocaleString('es-CL')} c/u</p>
                                        )}

                                        <div className="item-controls">
                                            <div className="quantity-selector">
                                                <button
                                                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                                                    disabled={item.quantity <= 1}
                                                >
                                                    -
                                                </button>
                                                <span>{item.quantity}</span>
                                                <button
                                                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                                                >
                                                    +
                                                </button>
                                            </div>
                                            <button
                                                className="remove-item-btn"
                                                onClick={() => removeFromCart(item.product.id)}
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    </div>
                                    <div className="cart-item-subtotal">
                                        ${(item.product.price * item.quantity).toLocaleString('es-CL')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {cart.length > 0 && (
                    <div className="cart-drawer-footer">
                        <div className="cart-summary-row">
                            <span>Subtotal</span>
                            <span>${cartTotal.toLocaleString('es-CL')}</span>
                        </div>
                        <p className="shipping-info">Envío calculado en el siguiente paso.</p>
                        {isVacationMode && (
                            <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#b45309', textAlign: 'center', background: '#fffbeb', padding: '0.5rem', borderRadius: '4px' }}>
                                {vacationMode.message}
                            </p>
                        )}
                        <Button
                            variant="primary"
                            className="checkout-btn-full"
                            onClick={handleCheckout}
                            disabled={isVacationMode}
                        >
                            Finalizar Pedido
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CartDrawer;
