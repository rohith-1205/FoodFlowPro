import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingBag,
  ShoppingCart,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  ShieldCheck,
  Utensils,
  ChefHat,
  Truck,
  LayoutDashboard,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Header = () => {
  const { user, logout, demoLogin } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [switchingRole, setSwitchingRole] = useState(false);

  const handleRoleSwitch = async (e) => {
    const targetRole = e.target.value;
    if (!targetRole || (user && user.role === targetRole)) return;

    try {
      setSwitchingRole(true);
      await demoLogin(targetRole);

      // Route to destination page based on role
      const roleRoutes = {
        customer: '/menu',
        waiter: '/waiter',
        kitchen: '/kitchen',
        delivery: '/delivery',
        manager: '/manager',
        admin: '/admin'
      };
      navigate(roleRoutes[targetRole] || '/');
    } catch (err) {
      console.error('Failed to switch demo role:', err);
    } finally {
      setSwitchingRole(false);
    }
  };

  const isActive = (path) => {
    if (path.includes('?')) {
      return location.pathname + location.search === path;
    }
    return location.pathname === path;
  };

  const roleBadgeColors = {
    customer: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6' },
    waiter: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981' },
    kitchen: { bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b' },
    delivery: { bg: 'rgba(139, 92, 246, 0.15)', text: '#8b5cf6' },
    manager: { bg: 'rgba(236, 72, 153, 0.15)', text: '#ec4899' },
    admin: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444' }
  };

  const currentBadge = user?.role ? roleBadgeColors[user.role] : null;

  return (
    <header className="main-header" style={{ position: 'sticky', top: 0, zIndex: 1000 }}>
      {/* Brand Logo */}
      <Link to="/" className="logo" aria-label="FoodFlow Pro Home">
        <span className="logo-mark"><ShoppingBag size={19} strokeWidth={2.5} /></span>
        <span><strong>FoodFlow</strong><small>PRO</small></span>
      </Link>

      {/* Adaptive Navigation Links */}
      <nav className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {/* Customer / Guest Links */}
        {(!user || user.role === 'customer') && (
          <>
            <Link to="/" className={isActive('/') ? 'active-nav-link' : ''}>Home</Link>
            <Link to="/menu" className={isActive('/menu') ? 'active-nav-link' : ''}>Menu</Link>
            {user && (
              <Link to="/my-orders" className={isActive('/my-orders') ? 'active-nav-link' : ''}>
                My Orders
              </Link>
            )}
          </>
        )}

        {/* Waiter Links */}
        {user && user.role === 'waiter' && (
          <>
            <Link to="/waiter" className={isActive('/waiter') ? 'active-nav-link' : ''}>
              Waiter Service
            </Link>
            <Link to="/waiter" className={isActive('/waiter') ? 'active-nav-link' : ''}>
              Tables
            </Link>
          </>
        )}

        {/* Kitchen Links */}
        {user && user.role === 'kitchen' && (
          <Link to="/kitchen" className={isActive('/kitchen') ? 'active-nav-link' : ''}>
            Kitchen KDS
          </Link>
        )}

        {/* Delivery Links */}
        {user && user.role === 'delivery' && (
          <Link to="/delivery" className={isActive('/delivery') ? 'active-nav-link' : ''}>
            Delivery Portal
          </Link>
        )}

        {/* Manager Links */}
        {user && user.role === 'manager' && (
          <>
            <Link to="/manager" className={isActive('/manager') ? 'active-nav-link' : ''}>
              Manager Dashboard
            </Link>
            <Link to="/manager?tab=menu" className={isActive('/manager?tab=menu') ? 'active-nav-link' : ''}>
              Menu Management
            </Link>
            <Link to="/kitchen" className={isActive('/kitchen') ? 'active-nav-link' : ''}>
              Kitchen
            </Link>
            <Link to="/waiter" className={isActive('/waiter') ? 'active-nav-link' : ''}>
              Waiter
            </Link>
          </>
        )}

        {/* Admin Links */}
        {user && user.role === 'admin' && (
          <>
            <Link to="/admin" className={isActive('/admin') ? 'active-nav-link' : ''}>
              Admin Console
            </Link>
            <Link to="/admin?tab=overview" className={isActive('/admin?tab=overview') ? 'active-nav-link' : ''}>
              System Stats
            </Link>
            <Link to="/manager" className={isActive('/manager') ? 'active-nav-link' : ''}>
              Manager Dashboard
            </Link>
          </>
        )}

        {/* Cart Link (Always available for customer ordering tests) */}
        <Link to="/cart" className="header-cart" aria-label={`Cart, ${itemCount} items`}>
          <ShoppingCart size={18} />
          <span>Cart</span>
          {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
        </Link>

        {/* Interactive Role Switcher for Demo / Pair Programming */}
        <div className="role-switcher-container" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '4px 10px',
          borderRadius: '20px',
          border: '1px solid var(--line-color)'
        }}>
          <Sparkles size={14} style={{ color: '#f59e0b' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted-color)' }}>Role:</span>
          <select
            value={user?.role || 'customer'}
            onChange={handleRoleSwitch}
            disabled={switchingRole}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              fontWeight: 700,
              fontSize: '0.78rem',
              cursor: 'pointer',
              outline: 'none',
              textTransform: 'capitalize'
            }}
          >
            <option value="customer" style={{ background: '#1a1f2c' }}>Customer</option>
            <option value="waiter" style={{ background: '#1a1f2c' }}>Waiter</option>
            <option value="kitchen" style={{ background: '#1a1f2c' }}>Kitchen</option>
            <option value="delivery" style={{ background: '#1a1f2c' }}>Delivery</option>
            <option value="manager" style={{ background: '#1a1f2c' }}>Manager</option>
            <option value="admin" style={{ background: '#1a1f2c' }}>Admin</option>
          </select>
        </div>

        {/* User Account / Profile Info */}
        {user ? (
          <div className="header-account" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              className="profile-name"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
                fontWeight: 600
              }}
            >
              <User size={16} />
              <span>{user.name.split(' ')[0]}</span>
              {currentBadge && (
                <small style={{
                  background: currentBadge.bg,
                  color: currentBadge.text,
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  textTransform: 'uppercase'
                }}>
                  {user.role}
                </small>
              )}
            </span>
            <button
              type="button"
              className="logout-button"
              onClick={logout}
              aria-label="Log out"
              title="Log out"
              style={{ padding: '6px', borderRadius: '8px', cursor: 'pointer' }}
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="guest-links">
            <Link to="/login">Sign in</Link>
            <Link to="/register" className="header-join">Join now</Link>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Header;
