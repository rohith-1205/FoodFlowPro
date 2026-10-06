import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header className="main-header">
      <div className="logo">
        <h1>FoodFlow Pro</h1>
      </div>
      <nav className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/menu">Menu</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/login" className="btn" style={{ marginLeft: '1rem' }}>Login</Link>
      </nav>
    </header>
  );
};

export default Header;
