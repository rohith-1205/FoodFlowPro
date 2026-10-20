import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CustomerOrders = () => {
  const { authFetch } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewOrder, setReviewOrder] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [savingReview, setSavingReview] = useState(false);

  useEffect(() => {
    let active = true;
    authFetch('/orders/my-orders')
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Could not load orders');
        if (active) setOrders(data);
      })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [authFetch]);

  const submitReview = async event => {
    event.preventDefault();
    setSavingReview(true);
    setReviewError('');
    try {
      const targetRestaurantId = reviewOrder.restaurantId?._id || reviewOrder.restaurantId;
      const response = await authFetch('/reviews', {
        method: 'POST',
        body: JSON.stringify({ restaurantId: targetRestaurantId, rating: Number(rating), comment: comment.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not submit review');
      setReviewOrder(null);
      setComment('');
      setSuccessMsg(`Review for "${reviewOrder.restaurantId?.name || 'Restaurant'}" posted successfully! ⭐`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setSavingReview(false);
    }
  };

  if (loading) return <div className="loading-center">Loading your orders...</div>;
  if (error) return <div className="orders-page"><div className="alert alert-error">{error}</div></div>;

  return (
    <section className="orders-page">
      <div className="section-header">
        <div>
          <p className="eyebrow">YOUR ACCOUNT</p>
          <h1>Order history</h1>
        </div>
        <span className="order-count">{orders.length} {orders.length === 1 ? 'order' : 'orders'}</span>
      </div>

      {successMsg && (
        <div className="alert" style={{ background: '#e5f5eb', color: '#176247', border: '1px solid #c3e6cb', margin: '1rem 0' }}>
          {successMsg}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="empty-state">
          <h2>No orders yet</h2>
          <p>Your next favorite meal is a few taps away.</p>
          <button type="button" className="btn" style={{ marginTop: '1rem' }} onClick={() => window.location.href = '/'}>
            Browse Restaurants
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <article className="order-card" key={order._id}>
              <div className="order-card-heading">
                <div>
                  <h2>{order.restaurantId?.name || 'Restaurant'}</h2>
                  <p>{new Date(order.createdAt).toLocaleString()} · {order.orderType === 'dine-in' ? `Table ${order.tableNumber}` : 'Delivery'}</p>
                </div>
                <span className={`status-badge status-${order.status.toLowerCase().replaceAll(' ', '-')}`}>{order.status}</span>
              </div>
              <div className="order-lines">
                {order.items.map((item, index) => (
                  <div className="order-line" key={`${item.menuItemId || item.name}-${index}`}>
                    <span>{item.quantity} × {item.name}</span>
                    <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="order-card-footer">
                <span>{order.paymentMethod} · {order.paymentStatus}</span>
                <strong>₹{order.totalAmount.toFixed(2)}</strong>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Link to={`/track/${order._id}`} className="btn" style={{ padding: '0.42rem 0.85rem', fontSize: '0.84rem' }}>
                    {order.orderType === 'dine-in' ? 'Table Status 🍽️' : 'Track Live 🛵'}
                  </Link>
                  <button className="btn btn-outline" style={{ padding: '0.42rem 0.85rem', fontSize: '0.84rem' }} onClick={() => { setReviewOrder(order); setReviewError(''); }}>
                    Rate &amp; Review
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {reviewOrder && (
        <div className="modal-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setReviewOrder(null); }}>
          <form className="modal review-modal" onSubmit={submitReview}>
            <button className="modal-close" type="button" aria-label="Close review" onClick={() => setReviewOrder(null)}>×</button>
            <p className="eyebrow">YOUR FEEDBACK</p>
            <h2>Review {reviewOrder.restaurantId?.name}</h2>
            {reviewError && <div className="alert alert-error">{reviewError}</div>}
            <fieldset className="rating-fieldset">
              <legend>Your rating</legend>
              {[1, 2, 3, 4, 5].map(value => (
                <label key={value} className={value <= rating ? 'rating-star selected' : 'rating-star'}>
                  <input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} />
                  ★
                </label>
              ))}
            </fieldset>
            <label className="form-group">
              <span>Your review</span>
              <textarea value={comment} onChange={event => setComment(event.target.value)} rows={4} maxLength={1000} placeholder="What did you enjoy?" />
            </label>
            <button className="btn btn-full" disabled={savingReview}>{savingReview ? 'Submitting...' : 'Submit review'}</button>
          </form>
        </div>
      )}
    </section>
  );
};

export default CustomerOrders;