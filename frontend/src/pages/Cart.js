import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const Cart = () => {
  const navigate = useNavigate();
  const { cartItems, restaurantName, removeFromCart, updateQuantity, updateInstructions, subtotal, tax, total, itemCount, clearCart } = useCart();

  if (itemCount === 0) {
    return (
      <div className="empty-cart">
        <div className="empty-cart-icon">🛒</div>
        <h2>Your cart is empty</h2>
        <p>Add items from a restaurant to get started.</p>
        <button className="btn" onClick={() => navigate('/')}>Browse Restaurants</button>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-header">
        <h1>Your Cart</h1>
        <span className="cart-restaurant">🍴 {restaurantName}</span>
      </div>

      <div className="cart-layout">
        {/* Items */}
        <div className="cart-items">
          {cartItems.map(item => (
            <div key={item._id} className="cart-item-card">
              <div className="cart-item-top">
                <div>
                  <h4>{item.name}</h4>
                  <p className="item-price">₹{item.price.toFixed(2)} each</p>
                </div>
                <div className="qty-controls">
                  <button className="qty-btn" onClick={() => updateQuantity(item._id, item.quantity - 1)}>−</button>
                  <span className="qty-value">{item.quantity}</span>
                  <button className="qty-btn" onClick={() => updateQuantity(item._id, item.quantity + 1)}>+</button>
                  <button className="remove-btn" onClick={() => removeFromCart(item._id)}>🗑️</button>
                </div>
              </div>
              <div className="cart-item-subtotal">
                Subtotal: <strong>₹{(item.price * item.quantity).toFixed(2)}</strong>
              </div>
              <input
                className="instructions-input"
                type="text"
                placeholder="Special instructions (optional)..."
                value={item.specialInstructions}
                onChange={e => updateInstructions(item._id, e.target.value)}
              />
            </div>
          ))}

          <button className="btn btn-outline" onClick={clearCart} style={{ marginTop: '1rem' }}>
            🗑️ Clear Cart
          </button>
        </div>

        {/* Summary */}
        <div className="cart-summary">
          <h3>Order Summary</h3>
          <div className="summary-row"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
          <div className="summary-row"><span>GST (5%)</span><span>₹{tax.toFixed(2)}</span></div>
          <div className="summary-row summary-total"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
          <button className="btn btn-full" onClick={() => navigate('/checkout')}>
            Proceed to Checkout →
          </button>
          <button className="btn btn-outline btn-full" style={{ marginTop: '0.75rem' }} onClick={() => navigate('/')}>
            + Add More Items
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
