import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CUISINE_PILLS = ['All', 'Italian', 'Indian', 'Pizza', 'Mains'];

const Home = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCuisine, setActiveCuisine] = useState('All');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');
  const navigate = useNavigate();

  const fetchRestaurants = useCallback(async (q = '') => {
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
  }, []);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  const handleSearch = (e) => {
    e.preventDefault();
    setActiveCuisine('All');
    fetchRestaurants(search);
  };

  const handleCuisineFilter = (cuisine) => {
    setActiveCuisine(cuisine);
    if (cuisine === 'All') {
      setSearch('');
      fetchRestaurants('');
    } else {
      setSearch(cuisine);
      fetchRestaurants(cuisine);
    }
  };

  const handleSeedDemoData = async () => {
    setSeeding(true);
    setSeedMsg('');
    try {
      const res = await fetch(`${API}/seed`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Seeding failed');
      setSeedMsg('Demo data loaded successfully!');
      fetchRestaurants('');
    } catch (err) {
      setSeedMsg(`Seeding notice: ${err.message}. (Ensure backend and MongoDB are running).`);
    } finally {
      setSeeding(false);
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < Math.round(rating) ? '#e5a92d' : '#cbd3cd' }}>★</span>
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

      {/* Cuisine Quick Filter Pills */}
      <div className="category-pills" style={{ marginTop: '1.2rem', marginBottom: '0.4rem' }}>
        {CUISINE_PILLS.map(cuisine => (
          <button
            key={cuisine}
            type="button"
            className={`pill ${activeCuisine === cuisine ? 'pill-active' : ''}`}
            onClick={() => handleCuisineFilter(cuisine)}
          >
            {cuisine === 'All' ? '✨ All Cuisines' : cuisine}
          </button>
        ))}
      </div>

      {seedMsg && (
        <div className="alert" style={{ background: '#e5f5eb', color: '#176247', border: '1px solid #c3e6cb', margin: '1rem 0' }}>
          {seedMsg}
        </div>
      )}

      {/* Restaurants Grid */}
      <div className="section-header">
        <h2>🍴 {search ? `Results for "${search}"` : 'All Restaurants'}</h2>
        {search && (
          <button className="btn btn-outline" onClick={() => { setSearch(''); setActiveCuisine('All'); fetchRestaurants(''); }}>
            Clear Filter
          </button>
        )}
      </div>

      {loading ? (
        <div className="loading-grid">
          {[1, 2, 3].map(i => <div key={i} className="skeleton-card" />)}
        </div>
      ) : restaurants.length === 0 ? (
        <div className="empty-state">
          <h2>No restaurants found</h2>
          <p style={{ margin: '0.6rem 0 1.2rem' }}>
            {search ? 'Try clearing your search or choosing another cuisine.' : 'The database seems empty. Would you like to seed sample restaurants and demo data?'}
          </p>
          {!search && (
            <button className="btn" onClick={handleSeedDemoData} disabled={seeding}>
              {seeding ? 'Seeding demo data...' : '🌱 Seed Sample Restaurants & Menus'}
            </button>
          )}
        </div>
      ) : (
        <div className="restaurant-grid">
          {restaurants.map(r => (
            <div key={r._id} className="restaurant-card" onClick={() => navigate(`/restaurants/${r._id}`)}>
              <div className="restaurant-card-img">
                {r.image ? (
                  <img src={r.image} alt={r.name} onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div className="img-placeholder">🍽️</div>
                )}
                <span className={`open-badge ${r.isOpen ? 'open' : 'closed'}`}>
                  {r.isOpen ? 'Open Now' : 'Closed'}
                </span>
              </div>
              <div className="restaurant-card-body">
                <h3>{r.name}</h3>
                <p className="cuisine-tag">{r.cuisine} Cuisine</p>
                <div className="restaurant-meta">
                  <span className="stars">{renderStars(r.rating)} <strong>{r.rating?.toFixed(1) || '4.5'}</strong></span>
                  <span className="delivery-time">🕐 {r.deliveryTime || '30-45 min'}</span>
                </div>
                <p className="restaurant-address">📍 {r.address}</p>
                <button type="button" className="btn btn-full" style={{ marginTop: '1rem' }}>
                  View Menu →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Home;
