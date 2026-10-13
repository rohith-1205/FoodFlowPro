import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API = 'http://localhost:5000/api';

const Home = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchRestaurants = async (q = '') => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/restaurants${q ? `?search=${encodeURIComponent(q)}` : ''}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not load restaurants');
      setRestaurants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch restaurants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchRestaurants(search);
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < Math.round(rating) ? '#f7b731' : '#ddd' }}>★</span>
    ));
  };

  return (
    <div className="home-page">
      {/* Hero Section */}
      <div className="hero-section">
        <h1>Craving Something Delicious?</h1>
        <p>Order from the best restaurants in town, delivered right to your door or table.</p>
        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search restaurants, cuisines, or dishes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button type="submit" className="btn">Search</button>
        </form>
      </div>

      {/* Restaurants Grid */}
      <div className="section-header">
        <h2>🍴 {search ? `Results for "${search}"` : 'All Restaurants'}</h2>
        {search && (
          <button className="btn btn-outline" onClick={() => { setSearch(''); fetchRestaurants(); }}>
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-grid">
          {[1, 2, 3].map(i => <div key={i} className="skeleton-card" />)}
        </div>
      ) : restaurants.length === 0 ? (
        <div className="empty-state">
          <p>🔍 No restaurants found. Try a different search.</p>
        </div>
      ) : (
        <div className="restaurant-grid">
          {restaurants.map(r => (
            <div key={r._id} className="restaurant-card" onClick={() => navigate(`/restaurants/${r._id}`)}>
              <div className="restaurant-card-img">
                {r.image ? (
                  <img src={r.image} alt={r.name} onError={e => e.target.style.display = 'none'} />
                ) : (
                  <div className="img-placeholder">🍽️</div>
                )}
                <span className={`open-badge ${r.isOpen ? 'open' : 'closed'}`}>
                  {r.isOpen ? 'Open' : 'Closed'}
                </span>
              </div>
              <div className="restaurant-card-body">
                <h3>{r.name}</h3>
                <p className="cuisine-tag">{r.cuisine}</p>
                <div className="restaurant-meta">
                  <span className="stars">{renderStars(r.rating)} <strong>{r.rating}</strong></span>
                  <span className="delivery-time">🕐 {r.deliveryTime}</span>
                </div>
                <p className="restaurant-address">📍 {r.address}</p>
                <button className="btn btn-full" style={{ marginTop: '1rem' }}>View Menu</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
