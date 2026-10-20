import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const DEFAULT_TABLES = Array.from({ length: 10 }, (_, i) => ({
  tableNumber: i + 1,
  capacity: i < 4 ? 2 : i < 8 ? 4 : 6,
  status: 'Available'
}));

const Checkout = () => {
  const navigate = useNavigate();
  const { cartItems, restaurantId, restaurantName, subtotal, tax, total, clearCart } = useCart();
  const { user, authFetch } = useAuth();

  const [orderType, setOrderType] = useState('delivery');
  const [tableNumber, setTableNumber] = useState('');
  const [tablesList, setTablesList] = useState(DEFAULT_TABLES);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  // Fetch live tables from backend
  useEffect(() => {
    let active = true;
    authFetch('/tables')
      .then(res => res.json())
      .then(data => {
        if (active && Array.isArray(data) && data.length > 0) {
          setTablesList(data);
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_TABLES
      });
    return () => { active = false; };
  }, [authFetch]);

  useEffect(() => {
    if (cartItems.length === 0 && !success) {
      navigate('/cart', { replace: true });
    }
  }, [cartItems.length, navigate, success]);

  if (cartItems.length === 0 && !success) return null;

  const handlePlaceOrder = async () => {
    setError('');
    if (orderType === 'dine-in' && !tableNumber) {
      return setError('Please select or enter your table number.');
    }
    if (orderType === 'delivery' && !deliveryAddress.trim()) {
      return setError('Please enter your delivery address.');
    }

    setLoading(true);
    try {
      const payload = {
        restaurantId,
        orderType,
        tableNumber: orderType === 'dine-in' ? parseInt(tableNumber, 10) : undefined,
        deliveryAddress: orderType === 'delivery' ? deliveryAddress.trim() : undefined,
        items: cartItems.map(item => ({
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions || ''
        })),
        paymentMethod,
        specialInstructions: specialInstructions.trim()
      };

      const res = await authFetch('/orders', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to place order');

      clearCart();
      // Redirect directly to live order tracking page
      navigate(`/track/${data._id}`);
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
        <p className="eyebrow" style={{ color: 'var(--secondary-color)', fontWeight: 800 }}>ORDER CONFIRMED</p>
        <h1>Thank you for your order!</h1>
        <p>Order <strong>#{success._id ? success._id.slice(-6).toUpperCase() : 'FFP-PRO'}</strong> has been received by the kitchen.</p>

        <div className="success-details">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Status:</span>
            <span className="status-badge status-pending">{success.status || 'Pending'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Order Type:</span>
            <strong>{success.orderType === 'dine-in' ? `🍽️ Dine-in (Table ${success.tableNumber})` : '🛵 Home Delivery'}</strong>
          </div>
          {success.deliveryAddress && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span>Address:</span>
              <span style={{ maxWidth: '200px', textAlign: 'right' }}>{success.deliveryAddress}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Payment:</span>
            <strong>{success.paymentMethod} ({success.paymentStatus || 'Paid'})</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.8rem', paddingTop: '0.8rem', borderTop: '1px dashed var(--line-color)' }}>
            <strong>Total Amount Paid:</strong>
            <strong style={{ color: 'var(--primary-color)', fontSize: '1.1rem' }}>₹{success.totalAmount?.toFixed(2)}</strong>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
          <button type="button" className="btn" onClick={() => navigate('/my-orders')}>
            View My Orders
          </button>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/')}>
            Order More Food
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="section-header">
        <div>
          <p className="eyebrow">CHECKOUT &amp; PAYMENT</p>
          <h1>Complete Your Order</h1>
        </div>
        <span className="cart-restaurant">🍴 {restaurantName || 'Selected Restaurant'}</span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="checkout-layout">
        <div className="checkout-form">
          {/* Order Type Toggle */}
          <div className="checkout-section">
            <h3>1. Select Service Type</h3>
            <div className="order-type-toggle">
              <button
                type="button"
                className={`toggle-btn ${orderType === 'delivery' ? 'active' : ''}`}
                onClick={() => setOrderType('delivery')}
              >
                🛵 Delivery
              </button>
              <button
                type="button"
                className={`toggle-btn ${orderType === 'dine-in' ? 'active' : ''}`}
                onClick={() => setOrderType('dine-in')}
              >
                🍽️ Dine-In
              </button>
            </div>

            {orderType === 'delivery' && (
              <div className="form-group" style={{ marginTop: '1.2rem' }}>
                <label htmlFor="delivery-address">Delivery Address</label>
                <textarea
                  id="delivery-address"
                  placeholder="Street address, apartment/suite number, landmark, city, pincode..."
                  value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)}
                  rows={3}
                  required
                />
                <small style={{ color: 'var(--muted-color)' }}>Estimated delivery time: 30-45 minutes</small>
              </div>
            )}

            {orderType === 'dine-in' && (
              <div style={{ marginTop: '1.2rem' }}>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.5rem' }}>
                  Select or Enter Table Number (1-10)
                </label>
                
                {/* Interactive Table Picker Chips */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.45rem', marginBottom: '0.8rem' }}>
                  {tablesList.map(t => {
                    const isSelected = String(tableNumber) === String(t.tableNumber);
                    return (
                      <button
                        key={t.tableNumber}
                        type="button"
                        onClick={() => setTableNumber(String(t.tableNumber))}
                        style={{
                          padding: '0.55rem 0.2rem',
                          borderRadius: '6px',
                          border: isSelected ? '2px solid var(--secondary-color)' : '1px solid var(--line-color)',
                          background: isSelected ? '#e8f4f1' : 'white',
                          color: isSelected ? 'var(--secondary-color)' : 'var(--text-color)',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        <span style={{ fontSize: '0.82rem' }}>Table {t.tableNumber}</span>
                        <small style={{ fontSize: '0.68rem', color: isSelected ? 'var(--secondary-color)' : 'var(--muted-color)' }}>
                          {t.capacity} seats
                        </small>
                      </button>
                    );
                  })}
                </div>

                {/* Manual Table Input Fallback */}
                <div className="form-group">
                  <label htmlFor="manual-table-input" style={{ fontSize: '0.82rem', color: 'var(--muted-color)' }}>
                    Or type table number directly:
                  </label>
                  <input
                    id="manual-table-input"
                    type="number"
                    placeholder="E.g. 4"
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                    min={1}
                    max={50}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="checkout-section">
            <h3>2. Payment Method</h3>
            <div className="payment-options">
              {[
                { id: 'Card', label: '💳 Credit/Debit Card' },
                { id: 'UPI', label: '📱 Instant UPI' },
                { id: 'Cash', label: orderType === 'dine-in' ? '💵 Pay at Table' : '💵 Cash on Delivery' }
              ].map(method => (
                <label key={method.id} className={`payment-option ${paymentMethod === method.id ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="payment"
                    value={method.id}
                    checked={paymentMethod === method.id}
                    onChange={() => setPaymentMethod(method.id)}
                  />
                  {method.label}
                </label>
              ))}
            </div>
            {paymentMethod === 'Card' && (
              <p style={{ marginTop: '0.8rem', fontSize: '0.82rem', color: 'var(--muted-color)' }}>
                🔒 Card demo gateway: Test transaction ready. No real charge will occur.
              </p>
            )}
            {paymentMethod === 'UPI' && (
              <p style={{ marginTop: '0.8rem', fontSize: '0.82rem', color: 'var(--muted-color)' }}>
                ⚡ UPI demo payment: Instant verification active.
              </p>
            )}
          </div>

          {/* Customer & Special Instructions */}
          <div className="checkout-section">
            <h3>3. Order Notes &amp; Requests <span style={{ fontSize: '0.8rem', color: '#888' }}>(optional)</span></h3>
            <textarea
              placeholder="e.g. Ring the doorbell, leave at front desk, cutlery required..."
              value={specialInstructions}
              onChange={e => setSpecialInstructions(e.target.value)}
              rows={2}
            />
            {user && (
              <div style={{ marginTop: '0.8rem', fontSize: '0.83rem', color: 'var(--muted-color)' }}>
                Ordering as <strong>{user.name}</strong> ({user.email})
              </div>
            )}
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="cart-summary">
          <h3>Order Summary</h3>
          <div style={{ maxHeight: '250px', overflowY: 'auto', marginBottom: '0.5rem' }}>
            {cartItems.map(item => (
              <div key={item._id} className="summary-item" style={{ fontSize: '0.86rem', padding: '0.35rem 0' }}>
                <span>
                  <strong>{item.quantity}×</strong> {item.name}
                  {item.specialInstructions && (
                    <small style={{ display: 'block', color: 'var(--muted-color)', fontSize: '0.74rem' }}>
                      ({item.specialInstructions})
                    </small>
                  )}
                </span>
                <span>₹{(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <hr style={{ margin: '1rem 0', borderColor: 'var(--line-color)' }} />
          <div className="summary-row"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
          <div className="summary-row"><span>GST (5%)</span><span>₹{tax.toFixed(2)}</span></div>
          <div className="summary-row summary-total">
            <span>Grand Total</span>
            <span style={{ color: 'var(--primary-color)' }}>₹{total.toFixed(2)}</span>
          </div>

          <button
            type="button"
            className="btn btn-full"
            onClick={handlePlaceOrder}
            disabled={loading}
            style={{ marginTop: '1.5rem', minHeight: '48px', fontSize: '1rem' }}
          >
            {loading ? 'Confirming Order...' : `Place Order • ₹${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
