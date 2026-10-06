import React from 'react';

const Home = () => {
  return (
    <div className="home-page">
      <div className="card text-center" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--dark-color)' }}>
          Welcome to FoodFlow Pro
        </h2>
        <p style={{ fontSize: '1.2rem', color: '#666', marginBottom: '2rem' }}>
          Smart Restaurant Ordering & Management System
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="card" style={{ width: '250px' }}>
            <h3>Customer</h3>
            <p>Order food easily and track your delivery.</p>
          </div>
          <div className="card" style={{ width: '250px' }}>
            <h3>Staff & Kitchen</h3>
            <p>Manage orders, tables, and preparation seamlessly.</p>
          </div>
          <div className="card" style={{ width: '250px' }}>
            <h3>Admin & Manager</h3>
            <p>Oversee operations, menus, and reporting.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
