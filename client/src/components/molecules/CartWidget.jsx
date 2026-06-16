import React from 'react';
import { useCart } from '../../context/CartContext';
import './CartWidget.css';

export default function CartWidget({ toggleDrawer }) {
    const { cartCount } = useCart();

    if (cartCount === 0) return null;

    return (
        <button className="cart-widget" onClick={toggleDrawer}>
            <span className="cart-icon">🛒</span>
            <span className="cart-badge">{cartCount}</span>
        </button>
    );
}
