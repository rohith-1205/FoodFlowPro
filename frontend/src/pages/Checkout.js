import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, restaurantId, subtotal, tax, total, clearCart } = useCart();
  const { authFetch } = useAuth();

  const [orderType, setOrderType] = useState('delivery');
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (cartItems.length === 0 && !success) navigate('/cart', { replace: true });
  }, [cartItems.length, navigate, success]);

  if (cartItems.length === 0 && !success) return null;

  const handlePlaceOrder = async () => {
    setError('');
    if (orderType === 'dine-in' && !tableNumber) return setError('Please enter your table number.');
    if (orderType === 'delivery' && !deliveryAddress.trim()) return setError('Please enter your delivery address.');

    setLoading(true);
    try {
      const payload = {
        restaurantId,
        orderType,
        tableNumber: orderType === 'dine-in' ? parseInt(tableNumber) : undefined,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress : undefined,
        items: cartItems.map(item => ({
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions || ''
        })),
        paymentMethod,
        specialInstructions
      };

      const res = await authFetch('/orders', { method: 'POST', body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to place order');

      clearCart();
      setSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="order-success">
        <div className="success-icon">🎉</div>
        <h1>Order Placed Successfully!</h1>
        <p>Your order <strong>#{success._id?.slice(-6).toUpperCase()}</strong> has been received.</p>
        <div className="success-details">
          <p>📦 Status: <span className="status-badge status-pending">{success.status}</span></p>
          <p>💳 Payment: {success.paymentMethod}</p>
          <p>💰 Total: ₹{success.totalAmount?.toFixed(2)}</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
          <button className="btn" onClick={() => navigate('/my-orders')}>View My Orders</button>
          <button className="btn btn-outline" onClick={() => navigate('/')}>Order More</button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <h1>Checkout</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="checkout-layout">
        <div className="checkout-form">
          {/* Order Type */}
          <div className="checkout-section">
            <h3>Order Type</h3>
            <div className="order-type-toggle">
              <button
                className={`toggle-btn ${orderType === 'delivery' ? 'active' : ''}`}
                onClick={() => setOrderType('delivery')}
              >🛵 Delivery</button>
              <button
                className={`toggle-btn ${orderType === 'dine-in' ? 'active' : ''}`}
                onClick={() => setOrderType('dine-in')}
              >🍽️ Dine-In</button>
            </div>

            {orderType === 'delivery' && (
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Delivery Address</label>
                <textarea
                  placeholder="Enter your full delivery address..."
                  value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)}
                  rows={3}
                  required
                />
              </div>
            )}
            {orderType === 'dine-in' && (
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>Table Number</label>
                <input
                  type="number"
                  placeholder="Enter your table number (1-10)"
                  value={tableNumber}
                  onChange={e => setTableNumber(e.target.value)}
                  min={1}
                  max={10}
                  required
                />
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="checkout-section">
            <h3>Payment Method</h3>
            <div className="payment-options">
              {['Cash', 'Card', 'UPI'].map(method => (
                <label key={method} className={`payment-option ${paymentMethod === method ? 'selected' : ''}`}>
                  <input type="radio" name="payment" value={method} checked={paymentMethod === method} onChange={() => setPaymentMethod(method)} />
                  {method === 'Cash' ? '💵 Cash' : method === 'Card' ? '💳 Card' : '📱 UPI'}
                </label>
              ))}
            </div>
          </div>

          {/* Special Instructions */}
          <div className="checkout-section">
            <h3>Order Notes <span style={{ fontSize: '0.8rem', color: '#888' }}>(optional)</span></h3>
            <textarea
              placeholder="Any special requests for the restaurant..."
              value={specialInstructions}
              onChange={e => setSpecialInstructions(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        {/* Summary */}
        <div className="cart-summary">
          <h3>Order Summary</h3>
          {cartItems.map(item => (
            <div key={item._id} className="summary-item">
              <span>{item.name} × {item.quantity}</span>
              <span>₹{(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}
          <hr style={{ margin: '1rem 0', borderColor: '#eee' }} />
          <div className="summary-row"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
          <div className="summary-row"><span>GST (5%)</span><span>₹{tax.toFixed(2)}</span></div>
          <div className="summary-row summary-total"><span>Total</span><span>₹{total.toFixed(2)}</span></div>

          <button className="btn btn-full" onClick={handlePlaceOrder} disabled={loading} style={{ marginTop: '1.5rem' }}>
            {loading ? 'Placing Order...' : `Place Order • ₹${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
