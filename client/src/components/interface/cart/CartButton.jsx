import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../../../context/CartContext';

const CartButton = () => {
    const { itemsCount, toggleCart } = useCart();

    return (
        <button className="cart-toggle-btn" onClick={toggleCart} aria-label="Ver carrito">
            <div className="cart-icon-wrapper">
                <ShoppingBag size={24} />
                {itemsCount > 0 && (
                    <span className="cart-badge-premium">{itemsCount}</span>
                )}
            </div>
            
            <style>{`
                .cart-toggle-btn {
                    background: none;
                    border: none;
                    padding: 8px;
                    cursor: pointer;
                    color: #1e1b4b;
                    position: relative;
                    transition: transform 0.2s ease;
                }
                .cart-toggle-btn:hover { transform: scale(1.1); }
                .cart-toggle-btn:active { transform: scale(0.9); }

                .cart-icon-wrapper { position: relative; display: flex; align-items: center; justify-content: center; }

                .cart-badge-premium {
                    position: absolute;
                    top: -6px;
                    right: -6px;
                    background: #8f0653;
                    color: white;
                    font-size: 10px;
                    font-weight: 900;
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid white;
                    box-shadow: 0 2px 5px rgba(143, 6, 83, 0.3);
                    animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }

                @keyframes popIn {
                    0% { transform: scale(0); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </button>
    );
};

export default CartButton;
