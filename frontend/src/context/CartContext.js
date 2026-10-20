import React, { createContext, useContext, useEffect, useState } from 'react';

const CartContext = createContext();
const TAX_RATE = 0.05; // 5% GST

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ffp_cart')) || { items: [], restaurantId: null, restaurantName: '' };
    } catch {
      return { items: [], restaurantId: null, restaurantName: '' };
    }
  });
  const { items: cartItems, restaurantId, restaurantName } = cart;

  useEffect(() => {
    localStorage.setItem('ffp_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item, restaurantData) => {
    // If adding from a different restaurant, clear cart
    if (restaurantId && restaurantId !== restaurantData._id) {
      if (!window.confirm(`Your cart has items from "${restaurantName}". Clear cart and start fresh?`)) return;
      setCart({
        items: [{ ...item, quantity: 1, specialInstructions: item.specialInstructions || '' }],
        restaurantId: restaurantData._id,
        restaurantName: restaurantData.name
      });
      return;
    }
    setCart(prev => {
      const existing = prev.items.find(ci => ci._id === item._id);
      if (existing) {
        return {
          ...prev,
          restaurantId: restaurantData._id,
          restaurantName: restaurantData.name,
          items: prev.items.map(ci => ci._id === item._id ? { ...ci, quantity: ci.quantity + 1 } : ci)
        };
      }
      return {
        ...prev,
        restaurantId: restaurantData._id,
        restaurantName: restaurantData.name,
        items: [...prev.items, { ...item, quantity: 1, specialInstructions: item.specialInstructions || '' }]
      };
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const items = prev.items.filter(ci => ci._id !== itemId);
      return { ...prev, items, restaurantId: items.length ? prev.restaurantId : null, restaurantName: items.length ? prev.restaurantName : '' };
    });
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity < 1) return removeFromCart(itemId);
    setCart(prev => ({ ...prev, items: prev.items.map(ci => ci._id === itemId ? { ...ci, quantity } : ci) }));
  };

  const updateInstructions = (itemId, instructions) => {
    setCart(prev => ({ ...prev, items: prev.items.map(ci => ci._id === itemId ? { ...ci, specialInstructions: instructions } : ci) }));
  };

  const clearCart = () => {
    setCart({ items: [], restaurantId: null, restaurantName: '' });
  };

  const rawSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = Number(rawSubtotal.toFixed(2));
  const tax = Number((subtotal * TAX_RATE).toFixed(2));
  const total = Number((subtotal + tax).toFixed(2));
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      cartItems, restaurantId, restaurantName,
      addToCart, removeFromCart, updateQuantity, updateInstructions, clearCart,
      subtotal, tax, total, itemCount
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
export default CartContext;
