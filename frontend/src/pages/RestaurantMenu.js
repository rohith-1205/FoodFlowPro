import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const RestaurantMenu = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, updateQuantity, cartItems, itemCount } = useCart();

  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState({});
  const [reviews, setReviews] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [instructionsModal, setInstructionsModal] = useState(null);
  const [instructions, setInstructions] = useState('');

  const fetchMenuAndReviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/restaurants/${id}/menu`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Restaurant not found');
      setRestaurant(data.restaurant);
      setMenu(data.menu || {});

      // Fetch reviews
      try {
        const revRes = await fetch(`${API}/reviews/${id}`);
        const revData = await revRes.json();
        if (revRes.ok && Array.isArray(revData)) {
          setReviews(revData);
        }
      } catch (err) {
        console.warn('Could not load reviews:', err);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMenuAndReviews();
  }, [fetchMenuAndReviews]);

  const categories = ['All', ...Object.keys(menu)];

  const filteredItems = activeCategory === 'All'
    ? Object.values(menu).flat()
    : menu[activeCategory] || [];

  const getCartItem = (itemId) => {
    return cartItems.find(ci => ci._id === itemId);
  };

  const handleOpenInstructions = (item) => {
    setInstructionsModal(item);
    setInstructions(getCartItem(item._id)?.specialInstructions || '');
  };

  const confirmAdd = () => {
    if (!instructionsModal || !restaurant) return;
    addToCart({ ...instructionsModal, specialInstructions: instructions.trim() }, restaurant);
    setInstructionsModal(null);
    setInstructions('');
  };

  const handleIncrement = (item) => {
    const existing = getCartItem(item._id);
    if (existing) {
      updateQuantity(item._id, existing.quantity + 1);
    } else {
      addToCart({ ...item, specialInstructions: '' }, restaurant);
    }
  };

  const handleDecrement = (item) => {
    const existing = getCartItem(item._id);
    if (existing) {
      updateQuantity(item._id, existing.quantity - 1);
    }
  };

  if (loading) {
    return (
      <div className="loading-center">
        <p>Loading restaurant menu &amp; details...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="empty-state">
        <h2>Restaurant not found</h2>
        <p style={{ margin: '1rem 0' }}>The restaurant you are looking for does not exist or has been removed.</p>
        <button type="button" className="btn" onClick={() => navigate('/')}>
          ← Back to All Restaurants
        </button>
      </div>
    );
  }

  return (
    <div className="menu-page">
      <div style={{ marginBottom: '1rem' }}>
        <Link to="/" style={{ color: 'var(--muted-color)', textDecoration: 'none', fontWeight: 600, fontSize: '0.88rem' }}>
          ← Back to Restaurants
        </Link>
      </div>

      {/* Restaurant Hero */}
      <div className="restaurant-hero">
        {restaurant.image && (
          <img src={restaurant.image} alt={restaurant.name} className="restaurant-hero-img" onError={e => { e.target.style.display = 'none'; }} />
        )}
        <div className="restaurant-hero-overlay">
          <h1>{restaurant.name}</h1>
          <p>{restaurant.cuisine} Cuisine • {restaurant.isOpen ? '🟢 Open Now' : '🔴 Closed'}</p>
          <div className="restaurant-hero-meta">
            <span>⭐ {restaurant.rating ? restaurant.rating.toFixed(1) : '4.5'} rating ({reviews.length} reviews)</span>
            <span>🕐 {restaurant.deliveryTime || '30-45 min'} delivery</span>
            <span>📍 {restaurant.address}</span>
          </div>
        </div>
      </div>

      {/* Category Navigation Pills */}
      <div className="category-pills">
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            className={`pill ${activeCategory === cat ? 'pill-active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="menu-grid">
        {filteredItems.map(item => {
          const cartItem = getCartItem(item._id);
          const inCart = !!cartItem;
          return (
            <div key={item._id} className={`menu-item-card ${!item.isAvailable ? 'unavailable' : ''}`}>
              <div className="menu-item-body">
                <div className="menu-item-info">
                  <span className="category-dot" />
                  <div>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <span className="item-price">₹{item.price.toFixed(2)}</span>
                    {cartItem?.specialInstructions && (
                      <p style={{ color: 'var(--secondary-color)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                        Note: &ldquo;{cartItem.specialInstructions}&rdquo;
                      </p>
                    )}
                  </div>
                </div>

                <div className="menu-item-action">
                  {!item.isAvailable ? (
                    <span className="unavailable-label">Unavailable</span>
                  ) : inCart ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                      <div className="qty-controls">
                        <button type="button" className="qty-btn" onClick={() => handleDecrement(item)} aria-label="Decrease quantity">−</button>
                        <span className="qty-value">{cartItem.quantity}</span>
                        <button type="button" className="qty-btn" onClick={() => handleIncrement(item)} aria-label="Increase quantity">+</button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenInstructions(item)}
                        style={{ background: 'none', border: 'none', color: 'var(--muted-color)', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Special request
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button
                        type="button"
                        className="btn btn-add"
                        onClick={() => handleOpenInstructions(item)}
                        title="Add with special instructions"
                      >
                        + Add
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reviews Section */}
      <div style={{ marginTop: '3.5rem', borderTop: '1px solid var(--line-color)', paddingTop: '2rem' }}>
        <div className="section-header">
          <div>
            <p className="eyebrow">COMMUNITY FEEDBACK</p>
            <h2>Customer Reviews ({reviews.length})</h2>
          </div>
          <span className="order-count">⭐ {restaurant.rating ? restaurant.rating.toFixed(1) : '4.5'} / 5.0</span>
        </div>

        {reviews.length === 0 ? (
          <p style={{ color: 'var(--muted-color)', marginTop: '0.5rem' }}>No reviews yet for this restaurant. Place an order to be the first to review!</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
            {reviews.map(r => (
              <div key={r._id} style={{ background: 'white', padding: '1rem', borderRadius: '6px', border: '1px solid var(--line-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <strong>{r.customerId?.name || 'Verified Customer'}</strong>
                  <span style={{ color: 'var(--gold-color)' }}>
                    {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  </span>
                </div>
                <p style={{ color: 'var(--text-color)', fontSize: '0.88rem' }}>{r.comment || 'Great food and fast service!'}</p>
                <small style={{ color: 'var(--muted-color)', display: 'block', marginTop: '0.5rem' }}>
                  {new Date(r.createdAt).toLocaleDateString()}
                </small>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {itemCount > 0 && (
        <div className="floating-cart" onClick={() => navigate('/cart')}>
          <span>🛒 {itemCount} item{itemCount > 1 ? 's' : ''} in cart</span>
          <span>View Cart &amp; Checkout →</span>
        </div>
      )}

      {/* Special Instructions Modal */}
      {instructionsModal && (
        <div className="modal-overlay" onClick={() => setInstructionsModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setInstructionsModal(null)}>×</button>
            <p className="eyebrow">CUSTOMIZE ITEM</p>
            <h2>{instructionsModal.name}</h2>
            <p style={{ color: 'var(--muted-color)', marginBottom: '1rem' }}>
              Price: <strong>₹{instructionsModal.price.toFixed(2)}</strong>
            </p>

            <div className="form-group">
              <label htmlFor="special-instructions">Special Instructions (optional)</label>
              <textarea
                id="special-instructions"
                placeholder="E.g. No onions, extra spicy, sauce on the side, well done..."
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={3}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', margin: '0.8rem 0 1.2rem' }}>
              {['Extra spicy 🌶️', 'Mild / Less spicy 🌿', 'No onions 🧅', 'Less oil ✨'].map(preset => (
                <button
                  key={preset}
                  type="button"
                  style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.55rem',
                    borderRadius: '15px',
                    border: '1px solid #cbd3cd',
                    background: '#f8faf8',
                    cursor: 'pointer'
                  }}
                  onClick={() => setInstructions(prev => prev ? `${prev}, ${preset}` : preset)}
                >
                  + {preset}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" className="btn btn-full" onClick={confirmAdd}>
                Add to Cart
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setInstructionsModal(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantMenu;
