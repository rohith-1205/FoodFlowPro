import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, ShoppingBag, ShoppingCart, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Header = () => {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();

  return (
    <header className="main-header">
      <Link to="/" className="logo" aria-label="FoodFlow Pro home">
        <span className="logo-mark"><ShoppingBag size={19} strokeWidth={2.5} /></span>
        <span><strong>FoodFlow</strong><small>PRO</small></span>
      </Link>
      <nav className="nav-links">
        <Link to="/">Home</Link>
        {user && user.role === 'customer' && <Link to="/my-orders">My orders</Link>}
        {user && ['kitchen', 'manager', 'admin'].includes(user.role) && (
          <Link to="/kitchen">Kitchen KDS</Link>
        )}
        {user && ['waiter', 'manager', 'admin'].includes(user.role) && (
          <Link to="/waiter">Waiter Service</Link>
        )}
        {user && ['delivery', 'manager', 'admin'].includes(user.role) && (
          <Link to="/delivery">Delivery Portal</Link>
        )}
        {user && user.role !== 'customer' && <Link to="/dashboard">Dashboard</Link>}
        <Link to="/cart" className="header-cart" aria-label={`Cart, ${itemCount} items`}>
          <ShoppingCart size={19} />
          <span>Cart</span>
          {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
        </Link>
        {user ? (
          <div className="header-account">
            <span className="profile-name"><User size={17} />{user.name}</span>
            <button type="button" className="logout-button" onClick={logout} aria-label="Log out" title="Log out">
              <LogOut size={17} />
            </button>
          </div>
        ) : (
          <div className="guest-links"><Link to="/login">Sign in</Link><Link to="/register" className="header-join">Join now</Link></div>
        )}
      </nav>
    </header>
  );
};

export default Header;
