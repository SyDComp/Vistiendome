/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useNotification } from './NotificationContext';
import { useSettings } from './SettingsContext';
import { getCartItemKey } from '../utils/cartUtils';
import { evaluarTramos } from '../utils/priceTiers';
import { evaluarPromociones } from '../utils/promotions';
import { getFiltersMetadata } from '../lib/api/endpoints/products.api';

const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
    const [cart, setCart] = useState(() => {
        const saved = localStorage.getItem('vistiendome-cart');
        return saved ? JSON.parse(saved) : [];
    });
    const [isCartOpen, setIsCartOpen] = useState(false);
    const { toast } = useNotification();
    const { settings } = useSettings();

    // Orden real de las características (TALLA, etc.), para resolver los
    // rangos de los tramos de precio. Se pide una sola vez; el endpoint ya
    // cachea la respuesta.
    const [filtersMetadata, setFiltersMetadata] = useState(null);
    useEffect(() => {
        getFiltersMetadata().then(setFiltersMetadata).catch(() => {});
    }, []);

    // Persistencia automática
    useEffect(() => {
        localStorage.setItem('vistiendome-cart', JSON.stringify(cart));
    }, [cart]);

    const addItem = (item) => {
        // item.price === 0 es válido (producto de regalo); solo bloqueamos
        // cuando el precio aún no cargó (null/undefined/NaN) o es negativo.
        if (!item || item.price == null || Number.isNaN(item.price) || item.price < 0) {
            toast.error("Por favor espera a que se cargue el precio del producto antes de agregarlo.", "Precio no disponible");
            return;
        }
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

    // Tramos por cantidad (mayorista, iglesia): se evalúan sobre el carrito
    // completo porque el descuento depende de cuántas unidades hay del mismo
    // producto+color entre todas las tallas del rango, no de una línea sola.
    const tierMap = useMemo(() => {
        const cartConKey = cart.map(item => ({
            ...item,
            __key: getCartItemKey(item.productId, item.sku, item.selections),
        }));
        return evaluarTramos(cartConKey, settings?.price_tiers, filtersMetadata);
    }, [cart, settings?.price_tiers, filtersMetadata]);

    // El carrito que se expone lleva el precio de tramo ya resuelto, sin que
    // cada consumidor (drawer, checkout) tenga que volver a evaluar reglas.
    const cartConTramos = useMemo(() => cart.map(item => {
        const key = getCartItemKey(item.productId, item.sku, item.selections);
        const tramo = tierMap.get(key);
        return {
            ...item,
            tramoAplicado: tramo?.tramo ?? null,
            precioTramo: tramo?.precio ?? null,
        };
    }), [cart, tierMap]);

    // Subtotal antes de promociones (ya con precio de tramo si aplica).
    const subtotal = useMemo(() => {
        return cartConTramos.reduce((acc, item) => acc + ((item.precioTramo ?? item.price) * item.quantity), 0);
    }, [cartConTramos]);

    // Promociones (lleva X paga Y, regalo). Se evalúan DESPUÉS de los tramos
    // porque su descuento se calcula sobre el precio que realmente rige.
    const { descuentos, regalos } = useMemo(
        () => evaluarPromociones(cartConTramos, settings?.promotions),
        [cartConTramos, settings?.promotions]
    );

    const descuentoPromos = useMemo(
        () => descuentos.reduce((acc, d) => acc + d.monto, 0),
        [descuentos]
    );

    const total = useMemo(
        () => Math.max(0, subtotal - descuentoPromos),
        [subtotal, descuentoPromos]
    );

    const itemsCount = useMemo(() => {
        return cart.reduce((acc, item) => acc + item.quantity, 0);
    }, [cart]);

    return (
        <CartContext.Provider value={{
            cart: cartConTramos,
            isCartOpen,
            setIsCartOpen,
            addItem,
            removeItem,
            updateQuantity,
            clearCart,
            subtotal,
            descuentos,
            descuentoPromos,
            regalos,
            total,
            itemsCount,
            filtersMetadata,
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
