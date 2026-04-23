import React, { useState } from 'react';
import { X, ShoppingBag, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCart } from '../../../context/CartContext';
import { formatCurrency } from '../../../utils/cartUtils';
import CheckoutForm from './CheckoutForm';

const CartDrawer = () => {
    const { cart, isCartOpen, setIsCartOpen, removeItem, updateQuantity, total, itemsCount } = useCart();
    const [showCheckout, setShowCheckout] = useState(false);

    if (!isCartOpen) return null;

    return (
        <div className="cart-overlay fade-in" onClick={() => setIsCartOpen(false)}>
            <div className="cart-drawer slide-in-right" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="cart-header">
                    <div className="cart-title-wrapper">
                        <ShoppingBag size={24} />
                        <h2>Tu Carrito</h2>
                        <span className="cart-count-pill">{itemsCount}</span>
                    </div>
                    <button className="btn-close-cart" onClick={() => setIsCartOpen(false)}>
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
                            <h3>El carrito está vacío</h3>
                            <p>¡Explora nuestro catálogo y encuentra algo que te encante!</p>
                            <button className="btn-return-shopping" onClick={() => setIsCartOpen(false)}>
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
                                                onClick={() => removeItem(item.productId, item.sku)}
                                                title="Eliminar producto"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                        <p className="item-variant-label">{item.variantLabel}</p>
                                        <div className="item-price-row">
                                            <span className="item-price">{formatCurrency(item.price)}</span>
                                            <div className="quantity-controls-mini">
                                                <button onClick={() => updateQuantity(item.productId, item.sku, -1)}>
                                                    <Minus size={14} />
                                                </button>
                                                <span>{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.productId, item.sku, 1)}>
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
                            Continuar con el Pedido
                            <ArrowRight size={20} />
                        </button>
                    </div>
                )}
            </div>

            {/* Modal de Pago / Formulario Checkout */}
            {showCheckout && (
                <CheckoutForm onClose={() => setShowCheckout(false)} />
            )}

            <style>{`
                .cart-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.4);
                    backdrop-filter: blur(8px);
                    z-index: 2000;
                    display: flex;
                    justify-content: flex-end;
                }
                .cart-drawer {
                    width: 100%;
                    max-width: 450px;
                    background: white;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    box-shadow: -10px 0 50px rgba(0,0,0,0.15);
                }

                .cart-header {
                    padding: 24px;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .cart-title-wrapper { display: flex; align-items: center; gap: 12px; color: #1e1b4b; }
                .cart-title-wrapper h2 { font-size: 1.25rem; font-weight: 800; margin: 0; }
                .cart-count-pill {
                    background: #f1f5f9;
                    color: #475569;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 700;
                }
                .btn-close-cart { background: none; border: none; cursor: pointer; color: #94a3b8; transition: color 0.2s; }
                .btn-close-cart:hover { color: #1e1b4b; }

                .cart-body { flex: 1; overflow-y: auto; padding: 24px; }
                
                .cart-items-list { display: flex; flex-direction: column; gap: 20px; }
                .cart-item-card { display: flex; gap: 16px; border-bottom: 1px solid #f8fafc; padding-bottom: 20px; }
                .item-image-wrapper { width: 80px; height: 100px; border-radius: 12px; overflow: hidden; flex-shrink: 0; background: #f8fafc; }
                .item-image-wrapper img { width: 100%; height: 100%; object-fit: cover; }
                .item-details { flex: 1; display: flex; flex-direction: column; gap: 4px; }
                .item-header-row { display: flex; justify-content: space-between; align-items: flex-start; }
                .item-header-row h4 { font-size: 1rem; font-weight: 700; margin: 0; color: #1e1b4b; }
                .btn-remove-item { background: none; border: none; color: #cbd5e1; cursor: pointer; transition: color 0.2s; }
                .btn-remove-item:hover { color: #ef4444; }
                .item-variant-label { font-size: 12px; color: #64748b; margin: 0; }
                
                .item-price-row { display: flex; justify-content: space-between; align-items: center; margin-top: auto; }
                .item-price { font-weight: 800; color: #1e1b4b; }
                
                .quantity-controls-mini {
                    display: flex;
                    align-items: center;
                    background: #f8fafc;
                    border-radius: 8px;
                    padding: 2px;
                    gap: 10px;
                }
                .quantity-controls-mini button {
                    background: white;
                    border: 1px solid #e2e8f0;
                    width: 24px;
                    height: 24px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: #475569;
                }
                .quantity-controls-mini span { font-size: 13px; font-weight: 700; width: 16px; text-align: center; }

                .empty-cart-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    text-align: center;
                    color: #94a3b8;
                    gap: 16px;
                }
                .empty-icon-ring {
                    width: 100px;
                    height: 100px;
                    border: 2px dashed #e2e8f0;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #cbd5e1;
                    margin-bottom: 8px;
                }
                .btn-return-shopping {
                    background: #1e1b4b;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    margin-top: 10px;
                }

                .cart-footer { padding: 24px; border-top: 1px solid #f1f5f9; background: #fafafa; }
                .cart-total-summary { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
                .cart-total-summary span:first-child { color: #64748b; font-weight: 600; }
                .total-amount-display { font-size: 1.5rem; font-weight: 900; color: #1e1b4b; }
                .cart-notice { font-size: 12px; color: #94a3b8; text-align: center; margin-bottom: 16px; }
                
                .btn-checkout-primary {
                    width: 100%;
                    height: 56px;
                    background: #1e1b4b;
                    color: white;
                    border: none;
                    border-radius: 16px;
                    font-size: 1rem;
                    font-weight: 800;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    cursor: pointer;
                    transition: transform 0.2s, background 0.2s;
                    box-shadow: 0 4px 15px rgba(30, 27, 75, 0.2);
                }
                .btn-checkout-primary:hover { background: #2d2a6e; transform: translateY(-2px); }

                @media (max-width: 480px) {
                    .cart-drawer { max-width: 100%; }
                }

                /* Animations */
                .fade-in { animation: fadeIn 0.3s ease-out; }
                .slide-in-right { animation: slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1); }

                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
            `}</style>
        </div>
    );
};

export default CartDrawer;
