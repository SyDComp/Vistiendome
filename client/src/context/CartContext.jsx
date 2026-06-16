/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useNotification } from './NotificationContext';
import { getCartItemKey } from '../utils/cartUtils';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState(() => {
        const saved = localStorage.getItem('vistiendome-cart');
        return saved ? JSON.parse(saved) : [];
    });
    const [isCartOpen, setIsCartOpen] = useState(false);
    const { toast } = useNotification();

    // Persistencia automática
    useEffect(() => {
        localStorage.setItem('vistiendome-cart', JSON.stringify(cart));
    }, [cart]);

    const addItem = (item) => {
        setCart(prev => {
            const itemKey = getCartItemKey(item.productId, item.sku, item.selections);
            const existing = prev.find(i => getCartItemKey(i.productId, i.sku, i.selections) === itemKey);

            if (existing) {
                return prev.map(i => 
                    getCartItemKey(i.productId, i.sku, i.selections) === itemKey 
                        ? { ...i, quantity: i.quantity + (item.quantity || 1) } 
                        : i
                );
            }
            return [...prev, { ...item, quantity: item.quantity || 1 }];
        });

        toast.success(`"${item.name}" añadido al carrito`, "Producto Añadido");
    };

    const removeItem = (productId, sku, selections) => {
        const itemKey = getCartItemKey(productId, sku, selections);
        setCart(prev => prev.filter(i => getCartItemKey(i.productId, i.sku, i.selections) !== itemKey));
    };

    const updateQuantity = (productId, sku, selections, delta) => {
        const itemKey = getCartItemKey(productId, sku, selections);
        setCart(prev => prev.map(i => {
            if (getCartItemKey(i.productId, i.sku, i.selections) === itemKey) {
                const newQty = Math.max(1, i.quantity + delta);
                return { ...i, quantity: newQty };
            }
            return i;
        }));
    };

    const clearCart = () => setCart([]);

    const total = useMemo(() => {
        return cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }, [cart]);

    const itemsCount = useMemo(() => {
        return cart.reduce((acc, item) => acc + item.quantity, 0);
    }, [cart]);

    return (
        <CartContext.Provider value={{
            cart,
            isCartOpen,
            setIsCartOpen,
            addItem,
            removeItem,
            updateQuantity,
            clearCart,
            total,
            itemsCount,
            toggleCart: () => setIsCartOpen(!isCartOpen)
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) throw new Error('useCart must be used within CartProvider');
    return context;
};
