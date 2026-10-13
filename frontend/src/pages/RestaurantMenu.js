import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const API = 'http://localhost:5000/api';

const RestaurantMenu = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, cartItems, itemCount } = useCart();
  const { user } = useAuth();

  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState({});
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [instructionsModal, setInstructionsModal] = useState(null);
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await fetch(`${API}/restaurants/${id}/menu`);
        const data = await res.json();
        setRestaurant(data.restaurant);
        setMenu(data.menu);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [id]);

  const categories = ['All', ...Object.keys(menu)];

  const filteredItems = activeCategory === 'All'
    ? Object.values(menu).flat()
    : menu[activeCategory] || [];

  const getCartQty = (itemId) => {
    const found = cartItems.find(ci => ci._id === itemId);
    return found ? found.quantity : 0;
  };

  const handleAddToCart = (item) => {
    if (!user) { navigate('/login'); return; }
    if (instructionsModal === null) {
      setInstructionsModal(item);
      setInstructions('');
    }
  };

  const confirmAdd = () => {
    addToCart({ ...instructionsModal, specialInstructions: instructions }, restaurant);
    setInstructionsModal(null);
    setInstructions('');
  };

  if (loading) return <div className="loading-center"><p>Loading menu...</p></div>;
  if (!restaurant) return <div className="loading-center"><p>Restaurant not found.</p></div>;

  return (
    <div className="menu-page">
      {/* Restaurant Header */}
      <div className="restaurant-hero">
        {restaurant.image && (
          <img src={restaurant.image} alt={restaurant.name} className="restaurant-hero-img" />
        )}
        <div className="restaurant-hero-overlay">
          <h1>{restaurant.name}</h1>
          <p>{restaurant.cuisine} Cuisine</p>
          <div className="restaurant-hero-meta">
            <span>⭐ {restaurant.rating}</span>
            <span>🕐 {restaurant.deliveryTime}</span>
            <span>📍 {restaurant.address}</span>
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="category-pills">
        {categories.map(cat => (
          <button
            key={cat}
            className={`pill ${activeCategory === cat ? 'pill-active' : ''}`}
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="menu-grid">
        {filteredItems.map(item => (
          <div key={item._id} className={`menu-item-card ${!item.isAvailable ? 'unavailable' : ''}`}>
            <div className="menu-item-body">
              <div className="menu-item-info">
                <span className="category-dot" />
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <span className="item-price">₹{item.price.toFixed(2)}</span>
                </div>
              </div>
              <div className="menu-item-action">
                {!item.isAvailable ? (
                  <span className="unavailable-label">Not Available</span>
                ) : getCartQty(item._id) > 0 ? (
                  <div className="qty-badge">In Cart: {getCartQty(item._id)}</div>
                ) : null}
                {item.isAvailable && (
                  <button className="btn btn-add" onClick={() => handleAddToCart(item)}>
                    + Add
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Cart Button */}
      {itemCount > 0 && (
        <div className="floating-cart" onClick={() => navigate('/cart')}>
          <span>🛒 {itemCount} item{itemCount > 1 ? 's' : ''}</span>
          <span>View Cart →</span>
        </div>
      )}

      {/* Special Instructions Modal */}
      {instructionsModal && (
        <div className="modal-overlay" onClick={() => setInstructionsModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add to Cart</h3>
            <p><strong>{instructionsModal.name}</strong> — ₹{instructionsModal.price.toFixed(2)}</p>
            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label>Special Instructions (optional)</label>
              <textarea
                placeholder="E.g. No onions, extra spicy, less salt..."
                value={instructions}
                onChange={e => setInstructions(e.target.value)}
                rows={3}
              />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button className="btn" onClick={confirmAdd}>Add to Cart</button>
              <button className="btn btn-outline" onClick={() => setInstructionsModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantMenu;
