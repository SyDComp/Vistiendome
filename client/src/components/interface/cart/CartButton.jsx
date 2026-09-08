import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../../../context/CartContext';
import './CartButton.css';

const CartButton = () => {
    const { itemsCount, toggleCart } = useCart();

    return (
        <button className="cart-toggle-btn tap-44" onClick={toggleCart} aria-label="Ver carrito">
            <div className="cart-icon-wrapper">
                <ShoppingBag size={24} />
                {itemsCount > 0 && (
                    <span className="cart-badge-premium">{itemsCount}</span>
                )}
            </div>
            
        </button>
    );
};

export default CartButton;
