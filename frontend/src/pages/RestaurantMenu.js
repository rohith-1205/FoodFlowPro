import React, { useState } from 'react';

const RestaurantMenu = () => {
  const [activeCategory, setActiveCategory] = useState('All');

  const restaurant = {
    name: 'The Rustic Spatula',
    description: 'Authentic Italian cuisine with a modern twist. Locally sourced ingredients and wood-fired pizzas.',
    rating: 4.8,
    deliveryTime: '25-40 min'
  };

  const menuItems = [
    { id: 1, name: 'Margherita Pizza', category: 'Pizza', price: 14.99, description: 'Fresh mozzarella, San Marzano tomatoes, and basil on a wood-fired crust.' },
    { id: 2, name: 'Truffle Mushroom Risotto', category: 'Mains', price: 19.50, description: 'Creamy Arborio rice with wild mushrooms, parmesan, and white truffle oil.' },
    { id: 3, name: 'Calamari Fritti', category: 'Starters', price: 11.00, description: 'Crispy fried calamari served with a zesty marinara dipping sauce.' },
    { id: 4, name: 'Tiramisu', category: 'Desserts', price: 8.50, description: 'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone cream.' },
    { id: 5, name: 'Pepperoni Pizza', category: 'Pizza', price: 16.99, description: 'Spicy pepperoni, mozzarella, and our signature tomato sauce.' },
    { id: 6, name: 'Garlic Bread', category: 'Starters', price: 6.50, description: 'Toasted ciabatta with garlic butter and fresh herbs.' }
  ];

  const categories = ['All', 'Starters', 'Pizza', 'Mains', 'Desserts'];

  const filteredMenu = activeCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory);

  return (
    <div className="menu-page">
      {/* Restaurant Header */}
      <div className="restaurant-header card" style={{ backgroundColor: 'var(--dark-color)', color: 'var(--light-color)', padding: '3rem 2rem', textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--primary-color)' }}>{restaurant.name}</h2>
        <p style={{ fontSize: '1.1rem', marginBottom: '1rem', maxWidth: '600px', margin: '0 auto 1rem auto' }}>
          {restaurant.description}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '0.9rem', color: '#ccc' }}>
          <span>⭐ {restaurant.rating} Rating</span>
          <span>🛵 {restaurant.deliveryTime}</span>
        </div>
      </div>

      {/* Categories */}
      <div className="categories" style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        {categories.map(category => (
          <button 
            key={category}
            onClick={() => setActiveCategory(category)}
            className="btn"
            style={{ 
              backgroundColor: activeCategory === category ? 'var(--primary-color)' : '#e0e0e0',
              color: activeCategory === category ? 'white' : 'var(--text-color)',
              borderRadius: '20px',
              padding: '0.5rem 1.5rem',
              transition: 'all 0.3s ease'
            }}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Menu Grid */}
      <div className="menu-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {filteredMenu.map(item => (
          <div key={item.id} className="card menu-item-card" style={{ display: 'flex', flexDirection: 'column', justifySelf: 'stretch', justifyContent: 'space-between', padding: '1.5rem', height: '100%' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--dark-color)' }}>{item.name}</h3>
                <span style={{ fontWeight: 'bold', color: 'var(--primary-color)', fontSize: '1.1rem' }}>${item.price.toFixed(2)}</span>
              </div>
              <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>{item.description}</p>
            </div>
            <button className="btn" style={{ width: '100%', padding: '0.8rem', marginTop: 'auto' }}>
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RestaurantMenu;
